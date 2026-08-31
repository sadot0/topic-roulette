'use client';

import { useEffect, useRef } from 'react';
import type { Dict } from '@/i18n/config';

/* Пресеты закрывают то, ради чего обычно и лезут в настройки.
   Слайдер остаётся для точной подгонки, но попасть в «15» мышью
   на дорожке 1–60 — отдельная работа */
const RESEARCH_PRESETS = [5, 10, 15, 30];
const SPEECH_PRESETS = [1, 2, 3, 5];
/* Полчаса — минимум, за который успеваешь что-то доделать;
   час — верх комфортного сеанса без перерыва */
const BUILD_PRESETS = [20, 30, 40, 60];

export function SettingsPanel({
  dict, research, speech, build, sound, onChange, onSound, onClose,
}: {
  dict: Dict;
  research: number;
  speech: number;
  build: number;
  sound: boolean;
  onChange(p: { research?: number; speech?: number; build?: number }): void;
  onSound(v: boolean): void;
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
            <div className="lab"><span>{dict.research}</span><b>{research} {dict.min}</b></div>
            <input
              type="range" min={1} max={60} step={1} value={research}
              onChange={(e) => onChange({ research: +e.target.value })}
            />
            <div className="chips">
              {RESEARCH_PRESETS.map((v) => (
                <button key={v} className={v === research ? 'on' : ''}
                        onClick={() => onChange({ research: v })}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="field-row">
            <div className="lab"><span>{dict.speech}</span><b>{speech} {dict.min}</b></div>
            <input
              type="range" min={1} max={10} step={1} value={speech}
              onChange={(e) => onChange({ speech: +e.target.value })}
            />
            <div className="chips">
              {SPEECH_PRESETS.map((v) => (
                <button key={v} className={v === speech ? 'on' : ''}
                        onClick={() => onChange({ speech: v })}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="field-row">
            <div className="lab"><span>{dict.buildLabel}</span><b>{build} {dict.min}</b></div>
            <input
              type="range" min={5} max={120} step={5} value={build}
              onChange={(e) => onChange({ build: +e.target.value })}
            />
            <div className="chips">
              {BUILD_PRESETS.map((v) => (
                <button key={v} className={v === build ? 'on' : ''}
                        onClick={() => onChange({ build: v })}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Переключатель звука дублирует угловую кнопку намеренно:
              там его ищут по иконке, здесь — по названию */}
          <button className="toggle-row" aria-pressed={sound} onClick={() => onSound(!sound)}>
            <span className="tr-lab">{dict.soundLabel}</span>
            <span className="tr-val">{sound ? dict.soundOnTxt : dict.soundOffTxt}</span>
            <span className="switch" aria-hidden><i /></span>
          </button>

          <button className="btn go" onClick={onClose}>{dict.done}</button>
        </div>
      </div>
    </div>
  );
}
