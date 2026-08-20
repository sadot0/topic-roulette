'use client';

import { Icon } from './icons';

import { useEffect, useRef, useState } from 'react';
import type { Dict } from '@/i18n/config';

export interface PickerOption {
  /** null — любая тема */
  key: string | null;
  label: string;
}

/**
 * Выбор категории. Не нативный select: его нельзя оформить
 * и он выглядит инородно в тёмной теме.
 */
export function TopicPicker({
  options,
  value,
  anyLabel,
  onChange,
}: {
  options: PickerOption[];
  value: string | null;
  anyLabel: string;
  onChange(v: string | null): void;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  /* Закрытие по клику мимо и по Escape — иначе список
     остаётся висеть и перекрывает тему */
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const current = options.find((o) => o.key === value);

  return (
    <div className="picker" ref={boxRef}>
      <button
        className={`picker-trigger ${value ? 'is-set' : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <PickerIcon k={current?.key ?? null} />
        {/* У «любой темы» label пустой — берём общую подпись,
            иначе кнопка остаётся с одним значком */}
        <span>{current && current.key ? current.label : anyLabel}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="picker-menu" role="listbox">
          {options.map((o) => (
            <button
              key={o.key ?? '*'}
              role="option"
              aria-selected={o.key === value}
              className={o.key === value ? 'on' : ''}
              onClick={() => { onChange(o.key); setOpen(false); }}
            >
              <PickerIcon k={o.key} />
              <span>{o.key === null ? anyLabel : o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** «Любая тема» получает свой знак — три точки как жребий */
function PickerIcon({ k }: { k: string | null }) {
  if (k) return <Icon name={k} className="pk-ic" />;
  return (
    <svg className="pk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="9.2" cy="10" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="10" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Категории считаются из самого банка — руками список
    поддерживать негде и незачем */
export function buildOptions(
  topics: readonly { domain: string }[],
  labels: Record<string, string>,
): PickerOption[] {
  /* Считаем только чтобы отсортировать: числа на экран не выходят —
     счётчик рядом с темой читается как счёт очков, а игры тут нет */
  const counts = new Map<string, number>();
  for (const t of topics) counts.set(t.domain, (counts.get(t.domain) ?? 0) + 1);
  /* По алфавиту, а не по числу тем: в списке из девятнадцати
     пунктов ищут глазами конкретное слово, и порядок «кого
     больше» выглядит случайным */
  const list = [...counts.entries()]
    .map(([key, n]) => ({ key, label: labels[key] ?? key, n }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
    .map(({ key, label }) => ({ key, label }));
  return [{ key: null, label: '' }, ...list];
}

export type { Dict };
