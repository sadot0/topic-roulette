'use client';

export interface PickerOption {
  /** null — любая тема */
  key: string | null;
  label: string;
  icon: string;
}

/**
 * Категории лежат открытым рядом, а не прячутся в списке.
 * Выбор режима — это уже одно решение; прятать второе за
 * раскрывающимся списком значит сделать его невидимым.
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
  return (
    <div className="cats" role="group" aria-label="Categories">
      {options.map((o) => (
        <button
          key={o.key ?? '*'}
          className={`cat ${o.key === value ? 'on' : ''}`}
          aria-pressed={o.key === value}
          onClick={() => onChange(o.key)}
        >
          <i aria-hidden>{o.icon}</i>
          <span>{o.key === null ? anyLabel : o.label}</span>
        </button>
      ))}
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
