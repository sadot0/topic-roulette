export type Lang =
  | 'ru' | 'en' | 'uz'
  | 'kk' | 'tr' | 'es' | 'pt' | 'ar' | 'id';

/** Языки, которые пишутся справа налево. Нужен и для dir
    на <html>, и для зеркалирования логики барабана */
export const RTL_LANGS: readonly Lang[] = ['ar'] as const;
export function isRtl(l: Lang): boolean {
  return (RTL_LANGS as readonly string[]).includes(l);
}
export type Bank = 'quick' | 'deep';

export type DeepDomain =
  | 'mind' | 'economy' | 'society' | 'philosophy'
  | 'systems' | 'power' | 'tech' | 'culture';
export type QuickDomain =
  | 'objects' | 'routine' | 'city' | 'memory' | 'people' | 'digital'
  | 'food' | 'money' | 'work' | 'home' | 'road' | 'childhood'
  | 'relations' | 'body' | 'clothes' | 'holiday' | 'nature' | 'habits';
export type Era = 'classic' | 'modern';

export interface TopicText {
  title: string;
  /** Одна фраза сути. Показывается ТОЛЬКО после речи — иначе
      ресёрч теряет смысл */
  hook: string;
}

interface Base {
  slug: string;
  /* Языки ядра есть у каждой темы; остальные могут
     отсутствовать — тогда показывается запасной */
  ru: TopicText;
  en: TopicText;
  uz: TopicText;
  kk?: TopicText;
  tr?: TopicText;
  es?: TopicText;
  pt?: TopicText;
  ar?: TopicText;
  id?: TopicText;
}

export type DeepTopic = Base & { bank: 'deep'; domain: DeepDomain; era: Era };
export type QuickTopic = Base & { bank: 'quick'; domain: QuickDomain };
export type Topic = DeepTopic | QuickTopic;

/** То, что уезжает клиенту: один язык, ничего лишнего.
    Дискриминация по bank не даёт напечатать «классика»
    на «Книжной полке» — era у quick физически отсутствует */
export interface TopicSlice {
  slug: string;
  bank: Bank;
  domain: string;
  era?: Era;
  title: string;
  hook: string;
}

/* Порядок важен: он же порядок кнопок в переключателе.
   Сначала языки ядра аудитории, потом крупные рынки */
export const LANGS: readonly Lang[] = [
  'ru', 'uz', 'kk', 'tr', 'en', 'es', 'pt', 'ar',
] as const;

/** Подписи в переключателе — самоназвания, а не коды:
    «Qazaq» понятнее казаху, чем «KK» */
export const LANG_LABEL: Record<Lang, string> = {
  ru: 'RU', uz: 'UZ', kk: 'KK', tr: 'TR',
  en: 'EN', es: 'ES', pt: 'PT', ar: 'AR', id: 'ID',
};

export const LANG_NAME: Record<Lang, string> = {
  ru: 'Русский', uz: 'Oʻzbekcha', kk: 'Қазақша', tr: 'Türkçe',
  en: 'English', es: 'Español', pt: 'Português', ar: 'العربية', id: 'Indonesia',
};
export const DEFAULT_LANG: Lang = 'ru';

export function isLang(v: string): v is Lang {
  return (LANGS as readonly string[]).includes(v);
}
