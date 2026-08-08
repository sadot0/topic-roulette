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
    const phase = state.phase === 'research' ? dict.phaseResearch : dict.phaseSpeech;
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

        <div
          className="ring"
          style={{
            ['--p' as string]: state.finished ? 0 : state.frac,
            ['--ring-col' as string]: ringCss,
          }}
        >
          <div className="ring-b">
            <div className="t-digits">{clock}</div>
            <div className="t-phase">
              {state.phase === 'research' ? dict.phaseResearch : dict.phaseSpeech}
            </div>
          </div>
        </div>

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
            ? state.phase === 'research' ? dict.researchDone : dict.timeUp
            : state.paused ? dict.statusPaused
            : state.phase === 'research' ? dict.statusResearch : dict.statusSpeech}
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
          {state.phase === 'speech' && state.finished && (
            <button className="btn go" onClick={onNextTopic}>{dict.nextTopic}</button>
          )}
          <button className="btn" onClick={onClose}>{dict.close}</button>
        </div>
      </div>
    </div>
  );
}
