import { notFound } from 'next/navigation';
import { RouletteApp } from '@/components/roulette-app';
import { sliceBank } from '@/lib/topics/registry';
import { getDict, isLang } from '@/i18n/config';
import type { Bank } from '@/lib/topics/types';

export const dynamic = 'force-static';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const sp = await searchParams;

  const t = typeof sp.t === 'string' ? sp.t : undefined;
  const m = sp.m === 'quick' || sp.m === 'deep' ? (sp.m as Bank) : undefined;

  return (
    <RouletteApp
      lang={lang}
      dict={getDict(lang)}
      banks={{
        quick: sliceBank('quick', lang),
        deep: sliceBank('deep', lang),
        build: sliceBank('build', lang),
      }}
      seed="rt-2026"
      initialTopic={t}
      initialMode={m}
    />
  );
}
