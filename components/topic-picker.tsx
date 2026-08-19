'use client';

import { useEffect, useRef, useState } from 'react';
import type { Dict } from '@/i18n/config';

export interface PickerOption {
  /** null — любая тема */
  key: string | null;
  label: string;
  icon: string;
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
        <i className="pk-ic" aria-hidden>{current?.icon ?? '🎲'}</i>
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
              <i className="pk-ic" aria-hidden>{o.icon}</i>
              <span>{o.key === null ? anyLabel : o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Категории считаются из самого банка — руками список
    поддерживать негде и незачем */
export function buildOptions(
  topics: readonly { domain: string }[],
  labels: Record<string, string>,
  icons: Record<string, string>,
): PickerOption[] {
  /* Считаем только чтобы отсортировать: числа на экран не выходят —
     счётчик рядом с темой читается как счёт очков, а игры тут нет */
  const counts = new Map<string, number>();
  for (const t of topics) counts.set(t.domain, (counts.get(t.domain) ?? 0) + 1);
  const list = [...counts.entries()]
    .map(([key, n]) => ({ key, label: labels[key] ?? key, icon: icons[key] ?? '•', n }))
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
    .map(({ key, label, icon }) => ({ key, label, icon }));
  return [{ key: null, label: '', icon: '🎲' }, ...list];
}

export type { Dict };
