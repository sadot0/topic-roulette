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
  runMs: number;
  crawlMs: number;
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
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const [spinning, setSpinning] = useState(false);
  const [spinReq, setSpinReq] = useState<SpinRequest | null>(null);

  /* Стартовая лента строится сеяным генератором: сервер и клиент
     обязаны получить одинаковую разметку, иначе гидрация ругается */
  const [rows, setRows] = useState<number[]>(() => {
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
          setSpinning(false);
          const strip2 = stripRef.current;
          strip2?.querySelector('.is-hit')?.classList.remove('is-hit');
          strip2?.children[slot]?.classList.add('is-hit');
          const idx = rowsRef.current[slot];
          currentRef.current = idx;
          const topic = topics[idx];
          if (topic) onSettledRef.current(topic, idx);
        },
      },
    );
    return engineRef.current;
  }, [setLive, topics]);

  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const spinOrSkip = useCallback(() => {
    if (!topics.length) return;

    if (engineRef.current?.spinning) {
      engineRef.current.skip();
      return;
    }

    /* Разблокировка звука только здесь: политика autoplay требует
       жеста, а созданный заранее контекст стартует suspended */
    sound.unlock();
    sound.blip(520, 0.04);

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

    setRows(next);
    setSpinning(true);
    setSpinReq({
      token: ++tokenRef.current,
      rows: next,
      rowHeight: measureRowHeight(windowRef.current),
      runMs: 4200 + Math.random() * 700,
      crawlMs: 2600 + Math.random() * 500,
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
      runMs: spinReq.runMs,
      crawlMs: spinReq.crawlMs,
      brakeRows: 1.55,
      reduceMotion,
      blurEnabled: !reduceMotion,
    });
    return () => e.cancel();
  }, [spinReq, getEngine, reduceMotion]);

  /** Посадка без анимации — для восстановления темы и ссылки-вызова */
  const settleOn = useCallback(
    (index: number) => {
      const next = [...rowsRef.current];
      next[TARGET_SLOT] = index;
      setRows(next);
      currentRef.current = index;
      requestAnimationFrame(() => {
        const e = getEngine();
        e?.settleAt(TARGET_SLOT, measureRowHeight(windowRef.current));
        stripRef.current?.children[TARGET_SLOT]?.classList.add('is-hit');
      });
    },
    [getEngine],
  );

  /* Лента в покое: без этого до первого спина видно пустоту */
  useLayoutEffect(() => {
    if (spinReq || !windowRef.current || !stripRef.current) return;
    const rh = measureRowHeight(windowRef.current);
    const start = 12;
    void rh;
    const centre = windowRef.current.clientHeight / 2;
    stripRef.current.style.transform = `translate3d(0,${centre - (start * rh + rh / 2)}px,0)`;
    setLive(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => () => engineRef.current?.destroy(), []);

  return { stripRef, windowRef, rows, spinning, spinOrSkip, settleOn };
}
