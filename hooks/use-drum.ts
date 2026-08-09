'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createDrumEngine, type DrumEngine } from '@/lib/drum/engine';
import { Bag } from '@/lib/bag';
import { rngFrom } from '@/lib/rng';
import { sound } from '@/lib/audio/engine';
import type { TopicSlice } from '@/lib/topics/types';

export const STRIP_LEN = 96;
export const START_SLOT = 90;
export const TARGET_SLOT = 6;

interface SpinRequest {
  token: number;
  rows: number[];
  rowHeight: number;
  durationMs: number;
}

export interface UseDrumOptions {
  topics: readonly TopicSlice[];
  seed: string;
  reduceMotion: boolean;
  soundOn: boolean;
  onSettled(topic: TopicSlice, index: number): void;
}

export interface UseDrumResult {
  stripRef: React.RefObject<HTMLDivElement | null>;
  windowRef: React.RefObject<HTMLDivElement | null>;
  rows: number[];
  spinning: boolean;
  spinOrSkip(): void;
  settleOn(index: number): void;
}

/** Лента должна показывать НЕЧЁТНОЕ число строк — тогда
    у центральной есть ровные соседи сверху и снизу */
function measureRowHeight(win: HTMLElement | null): number {
  const h = win?.clientHeight ?? 0;
  if (!h) return 56;
  let n = Math.round(h / 96);
  if (n % 2 === 0) n += 1;
  n = Math.max(5, Math.min(9, n));
  const rh = h / n;
  /* Движок считает позицию по этой высоте, а CSS рисует строки
     по --row-h. Разойдутся — лента встанет мимо цели */
  win?.closest('.tape')?.setAttribute('style', `--row-h:${rh.toFixed(2)}px`);
  return rh;
}

export function useDrum(o: UseDrumOptions): UseDrumResult {
  const { topics, seed, reduceMotion, onSettled } = o;

  const stripRef = useRef<HTMLDivElement | null>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<DrumEngine | null>(null);
  const bagRef = useRef<Bag | null>(null);
  const tokenRef = useRef(0);
  const currentRef = useRef<number | undefined>(undefined);
  const liveRef = useRef(-1);
  const applyRowsRef = useRef<(v: number[]) => void>(() => {});
  const putAtRef = useRef<(s: number) => void>(() => {});
  const setLiveRef = useRef<(s: number) => void>(() => {});
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const [spinning, setSpinning] = useState(false);
  const [spinReq, setSpinReq] = useState<SpinRequest | null>(null);

  /* Стартовая лента строится сеяным генератором: сервер и клиент
     обязаны получить одинаковую разметку, иначе гидрация ругается */
  /* Состояние нужно только для первой отрисовки: дальше
     содержимое строк живёт в DOM и меняется синхронно */
  const [rows] = useState<number[]>(() => {
    const rnd = rngFrom(seed);
    const out: number[] = [];
    let prev = -1;
    for (let i = 0; i < STRIP_LEN; i++) {
      let idx = 0;
      for (let g = 0; g < 8; g++) {
        idx = Math.floor(rnd() * Math.max(1, topics.length));
        if (idx !== prev || topics.length <= 2) break;
      }
      prev = idx;
      out.push(idx);
    }
    return out;
  });

  if (!bagRef.current) bagRef.current = new Bag(topics.length);
  bagRef.current.resize(topics.length);

  /* Строки пишем прямо в DOM, а не через состояние React.
     Причина конкретная: setRows планирует рендер на следующий
     кадр, а transform применяется сразу — между ними успевает
     отрисоваться кадр со СТАРЫМИ строками на НОВОЙ позиции,
     и это видно как скачок вверх. Здесь обе вещи меняются
     в одном синхронном блоке */
  const applyRows = useCallback((indices: number[]) => {
    const strip = stripRef.current;
    rowsRef.current = indices;
    if (!strip) return;
    for (let i = 0; i < indices.length; i++) {
      const el = strip.children[i] as HTMLElement | undefined;
      if (el) el.textContent = topics[indices[i]]?.title ?? '';
    }
  }, [topics]);

  const putAt = useCallback((slot: number) => {
    const win = windowRef.current;
    const strip = stripRef.current;
    if (!win || !strip) return;
    const h = measureRowHeight(win);
    const centre = win.clientHeight / 2;
    strip.style.transform = `translate3d(0,${centre - (slot * h + h / 2)}px,0)`;
  }, []);

  const setLive = useCallback((slot: number) => {
    const strip = stripRef.current;
    if (!strip) return;
    if (liveRef.current >= 0) strip.children[liveRef.current]?.classList.remove('is-live');
    strip.children[slot]?.classList.add('is-live');
    liveRef.current = slot;
  }, []);

  const getEngine = useCallback((): DrumEngine | null => {
    if (engineRef.current) return engineRef.current;
    const strip = stripRef.current;
    const win = windowRef.current;
    if (!strip || !win) return null;

    engineRef.current = createDrumEngine(
      {
        strip,
        window: win,
        blur: document.getElementById('vblur-g') as unknown as SVGFEGaussianBlurElement | null,
      },
      {
        onTick: (speed) => sound.tick(speed),
        onLiveRow: setLive,
        onSettled: (token, slot) => {
          /* Устаревший спин молчит: в dev StrictMode эффект
             отрабатывает дважды, и без сверки токена сработал бы
             результат отменённого прохода */
          if (token !== tokenRef.current) return;
          sound.thud();
          sound.reward();
          setSpinning(false);
          const strip2 = stripRef.current;
          strip2?.querySelector('.is-hit')?.classList.remove('is-hit');
          strip2?.children[slot]?.classList.add('is-hit');
          const idx = rowsRef.current[slot];
          currentRef.current = idx;
          const topic = topics[idx];
          if (topic) onSettledRef.current(topic, idx);

          /* Взвод под следующий спин — синхронно, в этом же кадре.
             Сдвигаем содержимое строк циклически так, чтобы
             выпавшая строка оказалась на START_SLOT, и туда же
             ставим позицию. На экране не меняется ни один пиксель:
             строка с тем же текстом просто получает другой индекс.
             Раньше это делалось через состояние React и потому
             мигало */
          const shift = START_SLOT - TARGET_SLOT;
          const cur = rowsRef.current;
          const next = new Array<number>(STRIP_LEN);
          for (let i = 0; i < STRIP_LEN; i++) {
            next[i] = cur[(i - shift + STRIP_LEN) % STRIP_LEN];
          }
          applyRowsRef.current(next);
          putAtRef.current(START_SLOT);
          strip2?.querySelector('.is-hit')?.classList.remove('is-hit');
          strip2?.children[START_SLOT]?.classList.add('is-hit');
          liveRef.current = -1;
          setLiveRef.current(START_SLOT);
        },
      },
    );
    return engineRef.current;
  }, [setLive, topics]);

  const rowsRef = useRef(rows);
  applyRowsRef.current = applyRows;
  putAtRef.current = putAt;
  setLiveRef.current = setLive;

  const spinOrSkip = useCallback(() => {
    if (!topics.length) return;

    if (engineRef.current?.spinning) {
      engineRef.current.skip();
      return;
    }

    /* Разблокировка звука только здесь: политика autoplay требует
       жеста, а созданный заранее контекст стартует suspended */
    sound.unlock();
    sound.blip(520, 0.07);

    const target = bagRef.current!.next(currentRef.current);
    const rnd = Math.random;
    const next: number[] = [];
    let prev = -1;
    for (let i = 0; i < STRIP_LEN; i++) {
      if (i === TARGET_SLOT) {
        next.push(target);
        prev = target;
        continue;
      }
      let idx = 0;
      for (let g = 0; g < 8; g++) {
        idx = Math.floor(rnd() * topics.length);
        const nearTarget = Math.abs(i - TARGET_SLOT) <= 1 && idx === target;
        if ((idx !== prev && !nearTarget) || topics.length <= 2) break;
      }
      prev = idx;
      next.push(idx);
    }

    /* Строка под прицелом остаётся на месте: иначе видно
       подмену прямо перед стартом */
    const keep = rowsRef.current[START_SLOT];
    if (keep !== undefined) next[START_SLOT] = keep;

    /* Синхронно: содержимое и позиция меняются в одном блоке,
       React в горячем пути не участвует */
    applyRows(next);
    setSpinning(true);
    setSpinReq({
      token: ++tokenRef.current,
      rows: next,
      rowHeight: measureRowHeight(windowRef.current),
      durationMs: 6600 + Math.random() * 900,
    });
  }, [topics]);

  /* useLayoutEffect, а не useEffect: строки уже в DOM, но кадр
     ещё не отрисован — стартовая позиция ляжет без вспышки */
  useLayoutEffect(() => {
    if (!spinReq) return;
    const e = getEngine();
    if (!e) return;
    e.spin({
      token: spinReq.token,
      startSlot: START_SLOT,
      targetSlot: TARGET_SLOT,
      rowHeight: spinReq.rowHeight,
      durationMs: spinReq.durationMs,
      reduceMotion,
      blurEnabled: !reduceMotion,
    });
    return () => e.cancel();
  }, [spinReq, getEngine, reduceMotion]);

  /** Посадка без анимации — для восстановления темы и ссылки-вызова */
  const settleOn = useCallback(
    (index: number) => {
      const next = [...rowsRef.current];
      /* Ставим восстановленную тему сразу на стартовую позицию —
         лента остаётся взведённой, и следующий спин пойдёт
         без рывка */
      next[START_SLOT] = index;
      applyRows(next);
      putAt(START_SLOT);
      currentRef.current = index;
      stripRef.current?.children[START_SLOT]?.classList.add('is-hit');
      setLive(START_SLOT);
    },
    [applyRows, putAt, setLive],
  );

  /* Смена банка тем: содержимое строк надо переписать, иначе
     в ленте останутся имена из прежнего режима */
  const bankKeyRef = useRef<string>('');
  useLayoutEffect(() => {
    const key = `${topics.length}:${topics[0]?.slug ?? ''}`;
    if (bankKeyRef.current === key) return;
    const first = bankKeyRef.current === '';
    bankKeyRef.current = key;
    if (first || spinning || !topics.length) return;

    const rnd = Math.random;
    const next: number[] = [];
    let prev = -1;
    for (let i = 0; i < STRIP_LEN; i++) {
      let idx = 0;
      for (let g = 0; g < 8; g++) {
        idx = Math.floor(rnd() * topics.length);
        if (idx !== prev || topics.length <= 2) break;
      }
      prev = idx;
      next.push(idx);
    }
    applyRows(next);
    putAt(START_SLOT);
    stripRef.current?.querySelector('.is-hit')?.classList.remove('is-hit');
    liveRef.current = -1;
    setLive(START_SLOT);
    bagRef.current = new Bag(topics.length);
    currentRef.current = undefined;
  }, [topics, spinning, applyRows, putAt, setLive]);

  /* Лента в покое стоит СРАЗУ на стартовой позиции спина:
     иначе первый же запуск прыгал на 84 строки вверх, прежде
     чем поехать вниз */
  useLayoutEffect(() => {
    if (spinReq || !windowRef.current || !stripRef.current) return;
    const rh = measureRowHeight(windowRef.current);
    const centre = windowRef.current.clientHeight / 2;
    stripRef.current.style.transform =
      `translate3d(0,${centre - (START_SLOT * rh + rh / 2)}px,0)`;
    setLive(START_SLOT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => () => engineRef.current?.destroy(), []);

  return { stripRef, windowRef, rows, spinning, spinOrSkip, settleOn };
}
