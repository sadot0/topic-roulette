import type { Bank, Lang } from '@/lib/topics/types';

export interface PersistedV4 {
  v: 4;
  lang: Lang;
  sound: boolean;
  mode: Bank;
  research: number;
  speech: number;
  frame: boolean;
  /** просмотренное считается отдельно по банкам — иначе счётчик
      «открыто N из M» смешивал бы разные наборы */
  seen: Record<Bank, string[]>;
  last: Partial<Record<Bank, string>>;
  streak: { current: number; best: number; lastDay: string; days: string[] };
}

export const DEFAULTS: PersistedV4 = {
  v: 4,
  lang: 'ru',
  sound: true,
  mode: 'deep',
  research: 15,
  speech: 1,
  frame: false,
  seen: { quick: [], deep: [] },
  last: {},
  streak: { current: 0, best: 0, lastDay: '', days: [] },
};

export const KEY = 'roulette-tem/v4';
export const LEGACY_KEY = 'roulette-tem/v3';

const clampInt = (v: unknown, lo: number, hi: number, d: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

/** Переносит состояние из v3 не разрушая его: откат на прежнюю
    версию должен оставаться возможным */
export function migrate(raw: string | null, legacy: string | null): PersistedV4 {
  if (raw) {
    try {
      const p = JSON.parse(raw) as Partial<PersistedV4>;
      if (p?.v === 4) return normalize(p);
    } catch {}
  }
  if (legacy) {
    try {
      const o = JSON.parse(legacy) as Record<string, unknown>;
      return normalize({
        lang: o.lang as Lang,
        sound: o.sound as boolean,
        mode: o.mode as Bank,
        research: o.research as number,
        speech: o.speech as number,
        seen: { quick: [], deep: Array.isArray(o.seen) ? (o.seen as string[]) : [] },
        last: o.last ? { deep: o.last as string } : {},
      });
    } catch {}
  }
  return { ...DEFAULTS };
}

export function normalize(p: Partial<PersistedV4>): PersistedV4 {
  const s = p.streak ?? DEFAULTS.streak;
  return {
    v: 4,
    lang: (['ru', 'en', 'uz'] as const).includes(p.lang as Lang) ? (p.lang as Lang) : DEFAULTS.lang,
    sound: p.sound !== false,
    mode: p.mode === 'quick' ? 'quick' : 'deep',
    research: clampInt(p.research, 1, 60, DEFAULTS.research),
    speech: clampInt(p.speech, 1, 10, DEFAULTS.speech),
    frame: p.frame === true,
    seen: {
      quick: Array.isArray(p.seen?.quick) ? p.seen!.quick : [],
      deep: Array.isArray(p.seen?.deep) ? p.seen!.deep : [],
    },
    last: p.last ?? {},
    streak: {
      current: Number(s.current) || 0,
      best: Number(s.best) || 0,
      lastDay: typeof s.lastDay === 'string' ? s.lastDay : '',
      days: Array.isArray(s.days) ? s.days.slice(-60) : [],
    },
  };
}
