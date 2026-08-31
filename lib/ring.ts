import type { Phase } from '@/hooks/use-countdown';

type Stop = readonly [number, string];

/* Кольцо переливается через шесть цветов: зелёный → лайм →
   золото → мёд → охра → коралл. Тон проходит 133°, яркость
   при этом стоит на месте — разброс 1% по WCAG.

   Это принципиально. Если вместе с тоном едет яркость, глаз
   читает движение как «тускнеет» или «разгорается», и смена
   цвета теряется. Прежняя схема давала перепад яркости 27%
   и выглядела как садящаяся батарейка.

   Обе фазы переливаются целиком. Раньше в режиме речи первые
   55% времени держался один цвет, и минута выглядела почти
   одноцветной. */
const RAMP: readonly Stop[] = [
  [0.0, 'var(--ring-0)'],
  [0.2, 'var(--ring-1)'],
  [0.4, 'var(--ring-2)'],
  [0.6, 'var(--ring-3)'],
  [0.8, 'var(--ring-4)'],
  [1.0, 'var(--ring-5)'],
];

/* Ресёрч длинный, речь короткая — но проходят обе шкалу
   целиком: на минуте перелив успевает прочитаться, потому
   что цвет меняется непрерывно, а не тремя ступенями.

   У кодинга шкала та же, но растянута: сорок минут работы
   не должны тревожить раньше времени. Зелёная половина
   держится дольше, тёплое приходит только к концу */
const BUILD_RAMP: readonly Stop[] = [
  [0.0, 'var(--ring-0)'],
  [0.35, 'var(--ring-1)'],
  [0.62, 'var(--ring-2)'],
  [0.82, 'var(--ring-3)'],
  [0.93, 'var(--ring-4)'],
  [1.0, 'var(--ring-5)'],
];

const STOPS: Record<Phase, readonly Stop[]> = {
  research: RAMP,
  speech: RAMP,
  build: BUILD_RAMP,
};

/** Смешиваем в OKLCH: в sRGB середина между зелёным и медовым
    уходит в грязно-серый */
export function ringColor(phase: Phase, elapsed: number): string {
  const stops = STOPS[phase] ?? RAMP;
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
