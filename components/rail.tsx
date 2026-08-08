'use client';

import type { Lang } from '@/lib/topics/types';
import type { Dict } from '@/i18n/config';
import { LANGS } from '@/lib/topics/types';

export function Rail({
  lang, dict, soundOn, onLang, onSound,
}: {
  lang: Lang;
  dict: Dict;
  soundOn: boolean;
  onLang(l: Lang): void;
  onSound(): void;
}) {
  return (
    <aside className="rail">
      <div className="rail-cell mark"><i /><i /><i /></div>

      <div className="rail-cell rail-lang" role="group" aria-label="Language">
        {LANGS.map((l) => (
          <button key={l} aria-pressed={l === lang} onClick={() => onLang(l)}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="rail-cell">
        <button className="rail-btn" aria-pressed={soundOn} onClick={onSound} aria-label="Sound">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z" />
            <path className="wave" d="M15.6 9.2a4 4 0 0 1 0 5.6" />
            <path className="wave" d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8" />
            <path className="slash" d="M3 3l18 18" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      <div className="rail-spacer" />

      <div className="rail-author">
        <a href="https://www.instagram.com/mirzabek_vokhidov" target="_blank" rel="noopener noreferrer">
          @mirzabek_vokhidov
        </a>
      </div>
    </aside>
  );
}
