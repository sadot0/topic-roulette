'use client';

import { useEffect, useRef } from 'react';
import type { Dict } from '@/i18n/config';
import type { TopicSlice } from '@/lib/topics/types';
import type { CountdownState } from '@/hooks/use-countdown';

export function TimerOverlay({
  dict, topic, state, ringCss, onPause, onClose, onToSpeech, onNextTopic,
}: {
  dict: Dict;
  topic: TopicSlice;
  state: CountdownState;
  ringCss: string;
  onPause(): void;
  onClose(): void;
  onToSpeech(): void;
  onNextTopic(): void;
}) {
  const pauseRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { pauseRef.current?.focus(); }, []);

  /* Ресёрч идёт в ДРУГИХ вкладках — оверлей в этот момент
     не виден, и заголовок остаётся единственной поверхностью,
     куда можно вынести отсчёт */
  useEffect(() => {
    const clock = `${Math.floor(state.left / 60)}:${String(state.left % 60).padStart(2, '0')}`;
    const phase =
      state.phase === 'research' ? dict.phaseResearch
      : state.phase === 'build' ? dict.phaseBuild
      : dict.phaseSpeech;
    document.title = state.finished ? `✓ ${dict.brand}` : `${clock} · ${phase}`;
    return () => { document.title = dict.brand; };
  }, [state.left, state.finished, state.phase, dict]);

  const clock = `${Math.floor(state.left / 60)}:${String(state.left % 60).padStart(2, '0')}`;
  const stageIdx = state.finished
    ? 2
    : Math.min(2, Math.floor((state.total - state.left) / (state.total / 3)));

  return (
    <div className={`overlay ${state.finished ? 'done' : ''}`} role="dialog" aria-modal="true">
      <div className="ov-in">
        <div className="t-topic">{topic.title}</div>

        <Ring
          frac={state.finished ? 0 : state.frac}
          colour={ringCss}
          urgent={!state.finished && !state.paused && state.left <= 10}
          paused={state.paused}
        >
          <div className="t-digits">{clock}</div>
          <div className="t-phase">
            {state.phase === 'research' ? dict.phaseResearch
              : state.phase === 'build' ? dict.phaseBuild
              : dict.phaseSpeech}
          </div>
        </Ring>

        {state.phase === 'speech' && (
          <div className="stages">
            {[dict.st1, dict.st2, dict.st3].map((s, i) => (
              <span key={s} className={i === stageIdx ? 'on' : i < stageIdx ? 'past' : ''}>
                {s}
              </span>
            ))}
          </div>
        )}

        <div className="t-status">
          {state.finished
            ? state.phase === 'research' ? dict.researchDone
              : state.phase === 'build' ? dict.buildDone
              : dict.timeUp
            : state.paused ? dict.statusPaused
            : state.phase === 'research' ? dict.statusResearch
              : state.phase === 'build' ? dict.statusBuild
              : dict.statusSpeech}
        </div>

        <div className="t-actions">
          {!state.finished && (
            <button ref={pauseRef} className="btn" onClick={onPause}>
              {state.paused ? dict.resume : dict.pause}
            </button>
          )}
          {/* Из завершённого ресёрча — прямой путь в речь.
              У референса тут тупик: приходится перезапускать таймер */}
          {state.phase === 'research' && (
            <button className={`btn ${state.finished ? 'go' : ''}`} onClick={onToSpeech}>
              {state.finished ? dict.toSpeech : dict.skipToSpeech}
            </button>
          )}
          {/* У кодинга нет фазы «после»: закончил — бери следующее.
              Речь идёт только за ресёрчем */}
          {state.phase === 'build' && state.finished && (
            <button className="btn go" onClick={onNextTopic}>{dict.nextTopic}</button>
          )}
          {state.phase === 'speech' && state.finished && (
            <button className="btn go" onClick={onNextTopic}>{dict.nextTopic}</button>
          )}
          <button className="btn" onClick={onClose}>{dict.close}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Кольцо ───────────────────────────────────────────────
   SVG, а не conic-gradient: коническому градиенту нельзя
   скруглить конец дуги, и на тонком кольце обрубленный край
   выглядит браком. Здесь stroke-linecap: round плюс головка
   на конце — та же логика, что у циферблата часов.       */

const R = 86;                       // радиус дуги в системе viewBox
const C = 2 * Math.PI * R;          // длина окружности
const TICKS = 12;                   // деления как на циферблате

function Ring({
  frac, colour, urgent, paused, children,
}: {
  frac: number;
  colour: string;
  urgent: boolean;
  paused: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`dial ${urgent ? 'is-urgent' : ''} ${paused ? 'is-paused' : ''}`}
      style={{ ['--ring-col' as string]: colour }}
    >
      <svg viewBox="0 0 220 220" aria-hidden>
        {/* Деления: тихая шкала, по которой видно пройденную долю
            даже боковым зрением */}
        <g className="dial-ticks">
          {Array.from({ length: TICKS }, (_, i) => {
            const t = (i / TICKS) * 360 - 90;
            const rad = t * (Math.PI / 180);
            const r1 = R + 10, r2 = R + 15;
            /* Округление обязательно: несовпадение строк
               в атрибутах ломает гидратацию */
            const q = (v: number) => +v.toFixed(3);
            return (
              <line
                key={i}
                x1={q(110 + r1 * Math.cos(rad))} y1={q(110 + r1 * Math.sin(rad))}
                x2={q(110 + r2 * Math.cos(rad))} y2={q(110 + r2 * Math.sin(rad))}
                className={i / TICKS > frac ? 'past' : ''}
              />
            );
          })}
        </g>

        <circle className="dial-track" cx="110" cy="110" r={R} />
        {/* Ореол — вторая дуга той же формы, толще и полупрозрачная.
            Свечение фильтром здесь не годится: drop-shadow считает
            прямоугольную область отрисовки, и её край виден на
            тёмном фоне как рамка вокруг кольца */}
        <circle
          className="dial-halo"
          cx="110" cy="110" r={R}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
        />
        <circle
          className="dial-arc"
          cx="110" cy="110" r={R}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
        />
        {/* Головка вращается CSS-поворотом, а не пересчётом координат:
            атрибуты cx/cy React переписывал раз в секунду, и точка
            прыгала на 6°, отставая от плавно едущей дуги */}
        {frac > 0.004 && frac < 0.999 && (
          <g className="dial-head-g" style={{ ['--head-a' as string]: `${frac * 360}deg` }}>
            <circle className="dial-head" cx="110" cy={110 - R} r="5" />
          </g>
        )}
      </svg>

      <div className="dial-in">{children}</div>
    </div>
  );
}
