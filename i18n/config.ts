import type { Lang } from '@/lib/topics/types';
import { LANGS, DEFAULT_LANG, isLang } from '@/lib/topics/types';
import { ru, type Dict } from './dictionaries/ru';
import { en } from './dictionaries/en';
import { uz } from './dictionaries/uz';

const DICTS: Record<Lang, Dict> = { ru, en, uz };

export function getDict(lang: Lang): Dict {
  return DICTS[lang] ?? ru;
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
