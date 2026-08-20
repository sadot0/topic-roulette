'use client';

import { useLayoutEffect, useRef } from 'react';

/** Трекинг обязан ужиматься вместе с кеглем: просветы, набранные
    для 16px, на 100px разъезжаются в дыры */
export function trackFor(px: number): number {
  if (px >= 88) return -0.034;
  if (px >= 64) return -0.028;
  if (px >= 44) return -0.020;
  if (px >= 30) return -0.012;
  return -0.004;
}

export interface FitOptions {
  text: string;
  minPx?: number;
  maxPx?: number;
  /** ниже этого кегля переключаемся на узкое начертание, чтобы
      длинное имя осталось крупным вместо усушки до нечитаемого */
  condenseBelow?: number;
  deps?: readonly unknown[];
}

/** Бинарный поиск кегля. Ступени по длине строки давали
    «Молоху» и «Алгоритмической дискриминации оплаты» случайные
    оптические веса — здесь любое имя занимает один процент бокса */
export function useFitText<T extends HTMLElement>(o: FitOptions) {
  const ref = useRef<T | null>(null);
  const boxRef = useRef<HTMLElement | null>(null);
  const { text, minPx = 24, maxPx = 132, condenseBelow = 46, deps = [] } = o;

  useLayoutEffect(() => {
    const el = ref.current;
    const box = boxRef.current ?? el?.parentElement;
    if (!el || !box) return;

    const fit = () => {
      /* Сначала ужимаем до минимума: иначе бокс ещё растянут
         новым словом на старом кегле, и высота берётся от чужой темы */
      el.style.fontSize = `${minPx}px`;
      /* В арабском трекинг не трогаем: буквы соединяются,
         и сжатие разрывает связки */
      const rtl = getComputedStyle(el).direction === 'rtl';
      const maxW = box.clientWidth;
      const maxH = Math.max(120, box.clientHeight - 8);
      if (!maxW) return;

      el.classList.remove('is-condensed');
      let lo = minPx, hi = maxPx, best = minPx;
      for (let i = 0; i < 9; i++) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = `${mid}px`;
        el.style.letterSpacing = rtl ? '0' : `${trackFor(mid)}em`;
        if (el.scrollWidth <= maxW && el.scrollHeight <= maxH) { best = mid; lo = mid; }
        else hi = mid;
      }

      if (best < condenseBelow) {
        el.classList.add('is-condensed');
        lo = minPx; hi = maxPx; best = minPx;
        for (let i = 0; i < 9; i++) {
          const mid = (lo + hi) / 2;
          el.style.fontSize = `${mid}px`;
          el.style.letterSpacing = rtl ? '0' : `${trackFor(mid)}em`;
          if (el.scrollWidth <= maxW && el.scrollHeight <= maxH) { best = mid; lo = mid; }
          else hi = mid;
        }
      }

      el.style.fontSize = `${best.toFixed(1)}px`;
      el.style.letterSpacing = rtl ? '0' : `${trackFor(best)}em`;
    };

    fit();

    /* ResizeObserver вместо window.resize: ловит и мобильный
       URL-бар, и переход в режим кадра */
    const ro = new ResizeObserver(fit);
    ro.observe(box);

    /* Шрифты приходят позже разметки — по метрикам фолбэка
       подобранный кегль неверен */
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) fit(); });

    return () => { alive = false; ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, minPx, maxPx, condenseBelow, ...deps]);

  return { ref, boxRef };
}
