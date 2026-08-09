import type { Phase } from '@/hooks/use-countdown';

type Stop = readonly [number, string];

/* Закат: небо → лампа → последний розовый отсвет.
   Средний стоп совпадает с акцентом — кольцо догорает до
   цвета лампы, а не вводит в систему новый цвет.
   Финал настойчив, но это не пожарная тревога: сигнальные
   красные живут в тоне 0–20° при насыщенности выше 60%,
   здесь тон 352° и насыщенность 55% */
const STOPS: Record<Phase, readonly Stop[]> = {
  research: [
    [0, 'var(--ring-calm)'],
    [0.6, 'var(--ring-warm)'],
    [1, 'var(--ring-late)'],
  ],
  speech: [
    [0, 'var(--ring-warm)'],
    [0.55, 'var(--ring-warm)'],
    [1, 'var(--ring-late)'],
  ],
};

/** Смешиваем в OKLCH: в sRGB середина градиента уходит
    в грязно-коричневый */
export function ringColor(phase: Phase, elapsed: number): string {
  const stops = STOPS[phase] ?? STOPS.speech;
  const e = Math.max(0, Math.min(1, elapsed));
  for (let i = 1; i < stops.length; i++) {
    const [p1, c1] = stops[i - 1];
    const [p2, c2] = stops[i];
    if (e <= p2) {
      const k = p2 === p1 ? 0 : (e - p1) / (p2 - p1);
      return `color-mix(in oklch, ${c1} ${((1 - k) * 100).toFixed(1)}%, ${c2})`;
    }
  }
  return stops[stops.length - 1][1];
}
