import deepRaw from '@/data/topics.deep.json';
import quickRaw from '@/data/topics.quick.json';
import buildRaw from '@/data/topics.build.json';
import type { Bank, Lang, Topic, TopicSlice } from './types';

const BANKS: Record<Bank, Topic[]> = {
  deep: deepRaw as Topic[],
  quick: quickRaw as Topic[],
  build: buildRaw as Topic[],
};

/** Пуст ли банк. Нужно, чтобы не показывать вкладку режима,
    за которой ничего нет */
export function bankHasTopics(bank: Bank): boolean {
  return (BANKS[bank]?.length ?? 0) > 0;
}

/** Нарезка на сервере: клиенту уезжает один язык и один банк,
    а не весь JSON на трёх языках */
export function sliceBank(bank: Bank, lang: Lang): TopicSlice[] {
  return (BANKS[bank] ?? []).map((t) => {
    /* Запасной язык, если тема на нужном ещё не переведена.
       Английский, а не русский: он понятен большей части
       аудитории новых языков */
    const text = t[lang] ?? t.en ?? t.ru;
    return {
      slug: t.slug,
      bank: t.bank,
      domain: t.domain,
      ...(t.bank === 'deep' ? { era: t.era } : {}),
      title: text.title,
      hook: text.hook,
    };
  });
}

export function allTopics(): Topic[] {
  return [...BANKS.deep, ...BANKS.quick];
}

export function findTopic(slug: string): Topic | undefined {
  return allTopics().find((t) => t.slug === slug);
}

export function bankSizes(): Record<Bank, number> {
  return {
    deep: BANKS.deep.length,
    quick: BANKS.quick.length,
    build: BANKS.build.length,
  };
}
