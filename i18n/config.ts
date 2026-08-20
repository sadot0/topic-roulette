import type { Lang } from '@/lib/topics/types';
import { LANGS, DEFAULT_LANG, isLang } from '@/lib/topics/types';
import { ru, type Dict } from './dictionaries/ru';
import { en } from './dictionaries/en';
import { uz } from './dictionaries/uz';
import { kk } from './dictionaries/kk';
import { tr } from './dictionaries/tr';
import { es } from './dictionaries/es';
import { pt } from './dictionaries/pt';
import { ar } from './dictionaries/ar';

/* Частичный словарь: язык может появиться в LANGS раньше, чем
   к нему допишут интерфейс. До тех пор показывается английский —
   это лучше, чем пустой экран или падение сборки */
const DICTS: Partial<Record<Lang, Dict>> = { ru, en, uz, kk, tr, es, pt, ar };

export function getDict(lang: Lang): Dict {
  return DICTS[lang] ?? en;
}

/** Есть ли у языка свой интерфейс. Нужно, чтобы не показывать
    переключатель языка, который никуда не ведёт */
export function hasDict(lang: Lang): boolean {
  return lang in DICTS;
}

/** Подбор языка по Accept-Language. Используется только при
    заходе на корень — дальше язык живёт в URL */
export function negotiate(header: string | null): Lang {
  if (!header) return DEFAULT_LANG;
  const wanted = header
    .split(',')
    .map((p) => {
      const [tag, q] = p.trim().split(';q=');
      return { tag: tag.toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of wanted) {
    const base = tag.split('-')[0];
    if (isLang(base)) return base;
  }
  return DEFAULT_LANG;
}

export { LANGS, DEFAULT_LANG, isLang };
export type { Dict, Lang };
