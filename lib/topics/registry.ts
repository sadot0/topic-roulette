import deepRaw from '@/data/topics.deep.json';
import quickRaw from '@/data/topics.quick.json';
import type { Bank, Lang, Topic, TopicSlice } from './types';

const BANKS: Record<Bank, Topic[]> = {
  deep: deepRaw as Topic[],
  quick: quickRaw as Topic[],
};

/** Нарезка на сервере: клиенту уезжает один язык и один банк,
    а не весь JSON на трёх языках */
export function sliceBank(bank: Bank, lang: Lang): TopicSlice[] {
  return (BANKS[bank] ?? []).map((t) => ({
    slug: t.slug,
    bank: t.bank,
    domain: t.domain,
    ...(t.bank === 'deep' ? { era: t.era } : {}),
    title: t[lang].title,
    hook: t[lang].hook,
  }));
}

export function allTopics(): Topic[] {
  return [...BANKS.deep, ...BANKS.quick];
}

export function findTopic(slug: string): Topic | undefined {
  return allTopics().find((t) => t.slug === slug);
}

export function bankSizes(): Record<Bank, number> {
  return { deep: BANKS.deep.length, quick: BANKS.quick.length };
}
