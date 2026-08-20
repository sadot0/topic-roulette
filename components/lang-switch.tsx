'use client';

import { useEffect, useRef, useState } from 'react';
import { LANGS, LANG_LABEL, LANG_NAME, type Lang } from '@/lib/topics/types';

/**
 * Переключатель языка. Свёрнут в список: восемь кодов в ряд
 * занимали весь угол и спорили с названием приложения, хотя
 * язык меняют один раз и больше к нему не возвращаются.
 *
 * В свёрнутом виде — код текущего языка, в раскрытом —
 * самоназвания: «Қазақша» найдут быстрее, чем «KK».
 */
export function LangSwitch({ lang, onPick }: { lang: Lang; onPick(l: Lang): void }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="lang" ref={boxRef}>
      <button
        className="lang-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={LANG_NAME[lang]}
        onClick={() => setOpen((v) => !v)}
      >
        <GlobeIcon />
        <span>{LANG_LABEL[lang]}</span>
      </button>

      {open && (
        <div className="lang-menu" role="listbox">
          {LANGS.map((l) => (
            <button
              key={l}
              role="option"
              aria-selected={l === lang}
              className={l === lang ? 'on' : ''}
              onClick={() => { onPick(l); setOpen(false); }}
            >
              <span className="ln">{LANG_NAME[l]}</span>
              <b>{LANG_LABEL[l]}</b>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Глобус нарисован меридианами, а не параллелями: две дуги
   читаются как шар даже в 16 пикселях, сетка — уже в кашу */
function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.6 9.6h16.8M3.6 14.4h16.8" />
      <path d="M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.3-3.6-8.6s1.2-6.2 3.6-8.6Z" />
    </svg>
  );
}
