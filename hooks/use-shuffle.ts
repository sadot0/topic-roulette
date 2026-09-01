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

  /* Смена БАНКА (а не категории) убирает показанную тему: иначе
     в быстром режиме продолжает висеть тема из глубокого */
  const bankRef = useRef(topics);
  useEffect(() => {
    if (bankRef.current === topics) return;
    bankRef.current = topics;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    setSpinning(false);
    setShown(null);
    setCurrent(null);
  }, [topics]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  useEffect(() => stop, [stop]);

  const spinOrSkip = useCallback(() => {
    if (!topics.length) return;

    /* Пока крутится — не трогаем. Барабан должен доехать сам:
       возможность оборвать его на полпути превращает случайный
       выбор в перебор до понравившегося */
    if (rafRef.current) return;

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
    const usedInSpin = new Set<number>();

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
        /* Ни одного повтора за прокрутку. Раньше защита ловила
           только два одинаковых подряд, и на банке из 78 позиций
           за 44 подмены одно и то же слово мелькало дважды —
           это читается как сбой, а не как случайность.
           Целевую тему тоже не показываем: иначе финал выглядит
           подделкой, «оно уже было и вернулось» */
        let pick = -1;
        for (let g = 0; g < 24; g++) {
          const c = Math.floor(Math.random() * topics.length);
          if (c !== targetIdx && !usedInSpin.has(c)) { pick = c; break; }
        }
        /* Банк кончился — начинаем круг заново, но с текущего
           места, чтобы не повторить только что показанное */
        if (pick < 0) {
          usedInSpin.clear();
          if (last >= 0) usedInSpin.add(last);
          do {
            pick = Math.floor(Math.random() * topics.length);
          } while (topics.length > 2 && (pick === targetIdx || pick === last));
        }
        usedInSpin.add(pick);
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
