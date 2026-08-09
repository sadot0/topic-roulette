'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useDrum } from '@/hooks/use-drum';
import { useCountdown, type Phase } from '@/hooks/use-countdown';
import { useFitText } from '@/hooks/use-fit-text';
import { useSound } from '@/hooks/use-sound';
import { usePersisted, patch } from '@/hooks/use-persisted';
import { useReducedMotion } from '@/hooks/use-media-query';
import { useHydrated } from '@/hooks/use-hydrated';
import { ringColor } from '@/lib/ring';
import { localDay } from '@/lib/daily';
import type { Bank, Lang, TopicSlice } from '@/lib/topics/types';
import type { Dict } from '@/i18n/config';

import { TimerOverlay } from './timer/timer-overlay';
import { SettingsPanel } from './settings-panel';
import { Rail } from './rail';

const DOMAIN_LABEL: Record<string, Record<Lang, string>> = {
  mind: { ru: 'Разум', en: 'Mind', uz: 'Ong' },
  economy: { ru: 'Экономика', en: 'Economy', uz: 'Iqtisod' },
  society: { ru: 'Общество', en: 'Society', uz: 'Jamiyat' },
  philosophy: { ru: 'Философия', en: 'Philosophy', uz: 'Falsafa' },
  systems: { ru: 'Системы', en: 'Systems', uz: 'Tizimlar' },
  power: { ru: 'Власть', en: 'Power', uz: 'Hokimiyat' },
  tech: { ru: 'Технологии', en: 'Tech', uz: 'Texnologiya' },
  culture: { ru: 'Культура', en: 'Culture', uz: 'Madaniyat' },
  objects: { ru: 'Предметы', en: 'Objects', uz: 'Buyumlar' },
  routine: { ru: 'Рутина', en: 'Routine', uz: 'Kundalik' },
  city: { ru: 'Город', en: 'City', uz: 'Shahar' },
  memory: { ru: 'Память', en: 'Memory', uz: 'Xotira' },
  people: { ru: 'Люди', en: 'People', uz: 'Odamlar' },
  digital: { ru: 'Цифра', en: 'Digital', uz: 'Raqamli' },
};

const ERA_LABEL: Record<string, Record<Lang, string>> = {
  classic: { ru: 'классика', en: 'classic', uz: 'klassik' },
  modern: { ru: '2020-е', en: '2020s', uz: '2020-yil' },
};

export interface RouletteAppProps {
  lang: Lang;
  dict: Dict;
  banks: Record<Bank, TopicSlice[]>;
  seed: string;
  initialTopic?: string;
  initialMode?: Bank;
}

export function RouletteApp({ lang, dict, banks, seed, initialTopic, initialMode }: RouletteAppProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const snd = useSound();

  const storedMode = usePersisted((s) => s.mode);
  const soundOn = usePersisted((s) => s.sound);
  const research = usePersisted((s) => s.research);
  const speech = usePersisted((s) => s.speech);
  const seenAll = usePersisted((s) => s.seen);

  const mode: Bank = initialMode ?? storedMode;
  const topics = banks[mode] ?? [];

  const [current, setCurrent] = useState<TopicSlice | null>(null);
  const [revealHook, setRevealHook] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [frame, setFrame] = useState(false);
  const restoredRef = useRef(false);

  const drum = useDrum({
    topics,
    seed,
    reduceMotion,
    soundOn,
    onSettled: (topic) => {
      setCurrent(topic);
      setRevealHook(false);
      const list = seenAll[mode] ?? [];
      if (!list.includes(topic.slug)) {
        patch({ seen: { ...seenAll, [mode]: [...list, topic.slug] } });
      }
      /* Тему запоминаем: ресёрч уходит в другие вкладки, и любая
         перезагрузка иначе стирает то, ради чего человек пришёл */
      patch({ last: { ...readStoredLast(), [mode]: topic.slug } });
      /* replaceState, а не router.replace — иначе перерисуется
         всё дерево ради строки в адресе */
      const u = new URL(window.location.href);
      u.searchParams.set('t', topic.slug);
      window.history.replaceState(null, '', u);
    },
  });

  const timer = useCountdown(
    useCallback(
      (p: Phase) => {
        if (p === 'speech') markStreakDay();
      },
      [],
    ),
  );

  const fit = useFitText<HTMLHeadingElement>({
    text: current?.title ?? '',
    deps: [lang, mode, frame],
  });

  /* Восстановление темы: из ссылки-вызова или из прошлой сессии.
     setState здесь однократный — гварда restoredRef достаточно,
     каскада ререндеров не будет */
  useEffect(() => {
    if (restoredRef.current || !topics.length) return;
    restoredRef.current = true;
    const slug = initialTopic ?? readLast(mode);
    if (!slug) return;
    const idx = topics.findIndex((t) => t.slug === slug);
    if (idx < 0) return;
    setCurrent(topics[idx]);
    drum.settleOn(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics.length]);

  const spinOrSkip = useCallback(() => {
    setRevealHook(false);
    drum.spinOrSkip();
  }, [drum]);

  const startPhase = useCallback(() => {
    if (!current) return;
    if (mode === 'deep') timer.open('research', research * 60);
    else timer.open('speech', speech * 60);
  }, [current, mode, research, speech, timer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (timer.phase) {
        if (e.code === 'Escape') { e.preventDefault(); timer.close(); }
        else if (e.code === 'Space') { e.preventDefault(); timer.togglePause(); }
        return;
      }
      if (settingsOpen) {
        if (e.code === 'Escape') { e.preventDefault(); setSettingsOpen(false); }
        return;
      }
      if (e.code === 'KeyF' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setFrame((v) => !v);
        return;
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        const el = document.activeElement;
        if (e.code === 'Enter' && el && /^(BUTTON|A|INPUT)$/.test(el.tagName)) return;
        e.preventDefault();
        spinOrSkip();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [spinOrSkip, timer, settingsOpen]);


  return (
    <>
      <div
        className={`app ${drum.spinning ? 'is-spinning' : ''} ${current && !drum.spinning ? 'is-settled' : ''} ${frame ? 'is-frame' : ''}`}
        id="app"
      >
        <Rail
          lang={lang}
          dict={dict}
          soundOn={soundOn}
          onLang={(l) => { patch({ lang: l }); router.push(`/${l}`); }}
          onSound={() => { const v = !soundOn; patch({ sound: v }); snd.setEnabled(v); if (v) snd.unlock(); }}
        />

        <main className="field">
          <div className="field-line top" />
          <div className="field-line bot" />

          <div className="status">
            <div className="modes" role="group" aria-label="Mode">
              {(['quick', 'deep'] as Bank[]).map((m) => (
                <button
                  key={m}
                  aria-pressed={hydrated ? mode === m : m === 'deep'}
                  onClick={() => {
                    if (m === mode) return;
                    patch({ mode: m });
                    setCurrent(null);
                    setRevealHook(false);
                    snd.unlock();
                    snd.blip(m === 'deep' ? 660 : 520, 0.04);
                  }}
                >
                  {m === 'quick' ? dict.modeQuick : dict.modeDeep}
                </button>
              ))}
            </div>

          </div>

          <div className="window" ref={fit.boxRef as React.RefObject<HTMLDivElement>}>
            {current ? (
              <div className={`reveal show`} key={current.slug}>
                <div className="eyebrow">
                  <span>{DOMAIN_LABEL[current.domain]?.[lang] ?? current.domain}</span>
                  {current.era && (
                    <>
                      <span className="sep">·</span>
                      <span>{ERA_LABEL[current.era][lang]}</span>
                    </>
                  )}
                </div>
                <h1 className="title" ref={fit.ref}>{current.title}</h1>
                {/* При кропе 9:16 подпись обязана остаться в кадре
                    вместе с темой — в шапке она бы срезалась */}
                <div className="frame-sign">
                  <b>@mirzabek_vokhidov</b>
                  <span>topic-roulette.vercel.app</span>
                </div>
                {revealHook && current.hook && (
                  <p className="hook">{current.hook}</p>
                )}
              </div>
            ) : (
              <div className="idle-txt">
                <b>{dict.brand}</b>
                <span>{dict.tagline}</span>
              </div>
            )}
          </div>

          <div className="foot">
            <button className="btn go" onClick={spinOrSkip}>
              {drum.spinning ? dict.skipSpin : current ? dict.spinAgain : dict.spin}
            </button>
            <button className="btn" onClick={startPhase} disabled={!current}>
              {mode === 'deep'
                ? `${research} ${dict.min}`
                : `${dict.speech} · ${speech} ${dict.min}`}
            </button>
            <button className="btn sq" onClick={() => { snd.unlock(); setSettingsOpen(true); }} aria-label={dict.settings}>
              <GearIcon />
            </button>
            <button className="btn" onClick={() => setFrame(true)} disabled={!current}>
              {dict.frameMode}
            </button>
            <span className="hint"><kbd>{dict.kbd}</kbd></span>
          </div>
        </main>

        <aside className="tape">
          <div className="tape-win" ref={drum.windowRef}>
            <div className="strip" ref={drum.stripRef}>
              {drum.rows.map((idx, i) => (
                <div className="row" key={`${i}-${idx}`}>
                  {topics[idx]?.title ?? ''}
                </div>
              ))}
            </div>
          </div>
          <div className="ticks" />
          <div className="index" />
        </aside>
      </div>

      <div className="grain" aria-hidden />
      {frame && <div className="frame-exit">{dict.frameHint}</div>}

      {timer.phase && current && (
        <TimerOverlay
          dict={dict}
          topic={current}
          state={timer}
          ringCss={ringColor(timer.phase, 1 - timer.frac)}
          onPause={timer.togglePause}
          onClose={() => { timer.close(); setRevealHook(true); }}
          onToSpeech={() => timer.open('speech', speech * 60)}
          onNextTopic={() => { timer.close(); setRevealHook(false); spinOrSkip(); }}
        />
      )}

      {settingsOpen && (
        <SettingsPanel
          dict={dict}
          research={research}
          speech={speech}
          onChange={(p) => patch(p)}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </>
  );
}

/* Вспомогательное: чтение last вне React-цикла */
function readStoredLast(): Partial<Record<Bank, string>> {
  try {
    const raw = localStorage.getItem('roulette-tem/v4');
    return raw ? (JSON.parse(raw).last ?? {}) : {};
  } catch {
    return {};
  }
}
function readLast(mode: Bank): string | undefined {
  return readStoredLast()[mode];
}

/** Стрик отмечается по локальной дате — тот же формат, что
    у темы дня, иначе сетка и тема разъедутся */
function markStreakDay() {
  try {
    const raw = localStorage.getItem('roulette-tem/v4');
    const s = raw ? JSON.parse(raw) : null;
    if (!s) return;
    const day = localDay();
    if (s.streak?.lastDay === day) return;
    const yesterday = localDay(new Date(Date.now() - 864e5));
    const current = s.streak?.lastDay === yesterday ? (s.streak.current || 0) + 1 : 1;
    s.streak = {
      current,
      best: Math.max(current, s.streak?.best || 0),
      lastDay: day,
      days: [...(s.streak?.days ?? []), day].slice(-60),
    };
    localStorage.setItem('roulette-tem/v4', JSON.stringify(s));
  } catch {}
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.6h.08A1.6 1.6 0 0 0 10 3.13V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.4 9v.08a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </svg>
  );
}
