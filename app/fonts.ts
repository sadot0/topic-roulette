import { Science_Gothic, JetBrains_Mono, Sofia_Sans_Extra_Condensed } from 'next/font/google';

/**
 * Шрифты грузятся next/font: файлы скачиваются на этапе сборки
 * и раздаются с нашего домена — в рантайме ни одного обращения
 * к Google, ноль CLS.
 */

/**
 * Science Gothic — имя темы.
 * Ось CTRS (0–85) задаёт контраст штриха: можно получить
 * модуляцию толщины, как у серифа, оставаясь гротеском.
 * Именно она уводит заголовок от «бесплатный элегантный
 * сериф крупным кеглем» — того штампа, который PROJECT.md
 * прямо запрещает.
 */
export const display = Science_Gothic({
  subsets: ['latin', 'cyrillic'],
  axes: ['CTRS', 'wdth'],
  display: 'swap',
  variable: '--font-display',
});

/**
 * Sofia Sans Extra Condensed — запасной кегль для длинных имён.
 * «Алгоритмическая дискриминация оплаты» в узком начертании
 * остаётся крупной вместо усушки до нечитаемого размера.
 */
export const condensed = Sofia_Sans_Extra_Condensed({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600', '800'],
  display: 'swap',
  variable: '--font-cond',
});

/** JetBrains Mono — телеметрия, счётчики, цифры таймера */
export const mono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-mono',
});
