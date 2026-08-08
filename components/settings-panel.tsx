'use client';

import { useEffect, useRef } from 'react';
import type { Dict } from '@/i18n/config';

export function SettingsPanel({
  dict, research, speech, onChange, onClose,
}: {
  dict: Dict;
  research: number;
  speech: number;
  onChange(p: { research?: number; speech?: number }): void;
  onClose(): void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  /* Фокус на контейнер, а не на слайдер: input всегда матчит
     :focus-visible, и кольцо фокуса вокруг 2-пиксельной дорожки
     читается как заливка */
  useEffect(() => { panelRef.current?.focus(); }, []);

  return (
    <div className="overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ov-in" onClick={(e) => e.stopPropagation()}>
        <div className="panel" ref={panelRef} tabIndex={-1}>
          <h2>{dict.settings}</h2>
          <p className="note">{dict.settingsNote}</p>

          <div className="field-row">
            <div className="lab"><span>{dict.research}</span><b>{research}</b></div>
            <input
              type="range" min={1} max={60} step={1} value={research}
              onChange={(e) => onChange({ research: +e.target.value })}
            />
          </div>

          <div className="field-row">
            <div className="lab"><span>{dict.speech}</span><b>{speech}</b></div>
            <input
              type="range" min={1} max={10} step={1} value={speech}
              onChange={(e) => onChange({ speech: +e.target.value })}
            />
          </div>

          <button className="btn go" onClick={onClose}>{dict.done}</button>
        </div>
      </div>
    </div>
  );
}
