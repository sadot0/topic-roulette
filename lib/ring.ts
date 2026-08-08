import type { Phase } from '@/hooks/use-countdown';

type Stop = readonly [number, string];

/* Кольцо не красится в цвет фазы, а непрерывно уходит от
   спокойного к тревожному по мере расхода времени */
const STOPS: Record<Phase, readonly Stop[]> = {
  research: [
    [0, 'var(--ring-calm)'],
    [0.55, 'var(--ring-warn)'],
    [1, 'var(--ring-alarm)'],
  ],
  speech: [
    [0, 'var(--ring-warn)'],
    [0.6, 'var(--ring-warn)'],
    [1, 'var(--ring-alarm)'],
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
