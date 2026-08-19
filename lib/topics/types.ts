export type Lang = 'ru' | 'en' | 'uz';
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
  ru: TopicText;
  en: TopicText;
  uz: TopicText;
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

export const LANGS: readonly Lang[] = ['ru', 'en', 'uz'] as const;
export const DEFAULT_LANG: Lang = 'ru';

export function isLang(v: string): v is Lang {
  return (LANGS as readonly string[]).includes(v);
}
