'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '@/lib/audio/engine';

/* Третья фаза — работа над заданием. Отдельная, а не
   переиспользованный research: у неё своя длительность,
   свои подписи и свой звук в конце */
export type Phase = 'research' | 'speech' | 'build';

export interface CountdownState {
  phase: Phase | null;
  total: number;
  left: number;
  /** дробный остаток — только для кольца: считать дугу от целых
      секунд значило бы 900 микрорывков за 15-минутный ресёрч */
  frac: number;
  paused: boolean;
  finished: boolean;
}

const IDLE: CountdownState = {
  phase: null, total: 0, left: 0, frac: 1, paused: false, finished: false,
};

export function useCountdown(onFinish?: (p: Phase) => void) {
  const [s, setS] = useState<CountdownState>(IDLE);
  const deadlineRef = useRef(0);
  const leftRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPipRef = useRef(-1);
  const stateRef = useRef(s);
  stateRef.current = s;
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const stop = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  }, []);

  const frame = useCallback(() => {
    const cur = stateRef.current;
    if (cur.paused || cur.finished || !cur.phase) return;

    const ms = Math.max(0, deadlineRef.current - Date.now());
    const left = Math.ceil(ms / 1000);
    const frac = cur.total ? ms / 1000 / cur.total : 0;

    if (left <= 3 && left > 0 && left !== lastPipRef.current) {
      lastPipRef.current = left;
      sound.pip(false);
    }

    if (ms <= 0) {
      stop();
      setS((p) => ({ ...p, left: 0, frac: 0, finished: true }));
      /* Восходящее арпеджио, когда впереди ещё этап, нисходящее —
         когда всё закончилось. Речь всегда последняя, поэтому
         только у неё финал «закрывающий» */
      sound.chime(cur.phase !== 'speech');
      finishRef.current?.(cur.phase);
      return;
    }
    setS((p) => (p.left === left && Math.abs(p.frac - frac) < 0.0005 ? p : { ...p, left, frac }));
  }, [stop]);

  const open = useCallback(
    (phase: Phase, seconds: number) => {
      stop();
      lastPipRef.current = -1;
      leftRef.current = seconds;
      deadlineRef.current = Date.now() + seconds * 1000;
      setS({ phase, total: seconds, left: seconds, frac: 1, paused: false, finished: false });
      sound.unlock();
      tickRef.current = setInterval(frame, 100);
    },
    [frame, stop],
  );

  const togglePause = useCallback(() => {
    setS((p) => {
      if (!p.phase || p.finished) return p;
      if (!p.paused) {
        leftRef.current = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
        sound.blip(430, 0.04);
        return { ...p, paused: true, left: leftRef.current };
      }
      deadlineRef.current = Date.now() + leftRef.current * 1000;
      sound.blip(660, 0.04);
      return { ...p, paused: false };
    });
  }, []);

  const close = useCallback(() => {
    stop();
    setS(IDLE);
  }, [stop]);

  /* Фоновая вкладка зажимает setInterval до секунды и глушит rAF.
     Показания остаются верными за счёт абсолютного дедлайна,
     но на возврате надо сразу пересчитать — иначе секунда врёт */
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        sound.resumeIfSuspended();
        frame();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [frame]);

  useEffect(() => stop, [stop]);

  return { ...s, open, togglePause, close };
}
