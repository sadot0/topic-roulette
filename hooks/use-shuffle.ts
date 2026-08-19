'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bag } from '@/lib/bag';
import { sound } from '@/lib/audio/engine';
import type { TopicSlice } from '@/lib/topics/types';

/* Профиль скорости трапецией: разгон, полка, торможение.
   Тот же, что был у ленты, — но здесь он управляет не
   позицией, а ИНТЕРВАЛОМ между подменами слова. В начале
   слова мелькают, к концу доклацывают по одному */
const ACC = 0.14;
const CRUISE = 0.24;
const DEC = 0.62;

function speedAt(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 0;
  if (t < ACC) return t / ACC;
  if (t < ACC + CRUISE) return 1;
  return 1 - (t - ACC - CRUISE) / DEC;
}

/** Интервал между сменами слова, мс */
const FAST = 45;   // на полном ходу
const SLOW = 620;  // перед самой остановкой

export interface UseShuffleOptions {
  topics: readonly TopicSlice[];
  poolIndices?: readonly number[];
  reduceMotion: boolean;
  onSettled(topic: TopicSlice, index: number): void;
}

export interface UseShuffleResult {
  /** что показывать прямо сейчас: во время перебора — мелькающее */
  shown: TopicSlice | null;
  /** осевшая тема; null пока не крутили */
  current: TopicSlice | null;
  spinning: boolean;
  spinOrSkip(): void;
  settleOn(index: number): void;
}

export function useShuffle(o: UseShuffleOptions): UseShuffleResult {
  const { topics, poolIndices, reduceMotion, onSettled } = o;

  const [shown, setShown] = useState<TopicSlice | null>(null);
  const [current, setCurrent] = useState<TopicSlice | null>(null);
  const [spinning, setSpinning] = useState(false);

  const rafRef = useRef(0);
  const bagRef = useRef<Bag | null>(null);
  const poolRef = useRef<number[]>([]);
  const poolKeyRef = useRef('');
  const lastPosRef = useRef<number | undefined>(undefined);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  /* Пул пересобирается при смене банка или категории */
  const pool = poolIndices && poolIndices.length ? poolIndices : null;
  const poolKey = `${topics.length}:${pool ? pool.join(',') : 'all'}`;
  if (poolKeyRef.current !== poolKey) {
    poolKeyRef.current = poolKey;
    poolRef.current = pool ? [...pool] : topics.map((_, i) => i);
    bagRef.current = new Bag(poolRef.current.length);
    lastPosRef.current = undefined;
  }
  if (!bagRef.current) bagRef.current = new Bag(poolRef.current.length);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  useEffect(() => stop, [stop]);

  const spinOrSkip = useCallback(() => {
    if (!topics.length) return;

    /* Клик во время перебора запускает НОВЫЙ круг, а не досаживает
       текущий: раньше кнопка обрывала спин, и человек, который
       хотел крутить дальше, получал остановку. Отменяем кадр
       и начинаем заново с новой целью */
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    /* Звук разблокируется только из жеста: контекст, созданный
       раньше, стартует suspended */
    sound.unlock();
    sound.blip(520, 0.07);

    const pos = bagRef.current!.next(lastPosRef.current);
    lastPosRef.current = pos;
    const targetIdx = poolRef.current[pos] ?? 0;
    const target = topics[targetIdx];

    if (reduceMotion) {
      setShown(target);
      setCurrent(target);
      sound.thud();
      sound.reward();
      onSettledRef.current(target, targetIdx);
      return;
    }

    setSpinning(true);

    const duration = 5200 + Math.random() * 700;
    const t0 = performance.now();
    let nextAt = 0;
    let last = -1;

    const land = () => {
      stop();
      setShown(target);
      setCurrent(target);
      setSpinning(false);
      sound.thud();
      sound.reward();
      onSettledRef.current(target, targetIdx);
    };

    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      if (t >= 1) return land();

      if (now >= nextAt) {
        /* Целевую тему в переборе не показываем: иначе финал
           выглядит подделкой — «оно уже было и вернулось» */
        let pick = last;
        for (let g = 0; g < 12 && (pick === last || pick === targetIdx); g++) {
          pick = Math.floor(Math.random() * topics.length);
        }
        last = pick;
        setShown(topics[pick]);

        const v = speedAt(t);
        sound.tick(v);
        /* Интервал обратен скорости: чем медленнее ход,
           тем дольше слово стоит на месте */
        nextAt = now + (SLOW - (SLOW - FAST) * v);
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
  }, [topics, reduceMotion, stop]);

  const settleOn = useCallback(
    (index: number) => {
      const t = topics[index];
      if (!t) return;
      setShown(t);
      setCurrent(t);
    },
    [topics],
  );

  return { shown, current, spinning, spinOrSkip, settleOn };
}
