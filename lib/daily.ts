import { xmur3 } from './rng';

/** Локальная дата YYYY-MM-DD. Тот же формат идёт в стрик —
    иначе сетка и тема дня разъедутся */
export function localDay(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Тема дня одна у всех и считается без сервера */
export function dailyIndex(day: string, length: number): number {
  if (length <= 0) return 0;
  return xmur3(`rt/${day}`)() % length;
}
