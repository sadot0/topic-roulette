'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useShuffle } from '@/hooks/use-shuffle';
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
import { TopicPicker, buildOptions } from './topic-picker';
import { Icon, Mark } from './icons';
import { LangSwitch } from './lang-switch';

const DOMAIN_LABEL: Record<string, Partial<Record<Lang, string>>> = {
  mind: { ru: 'Разум', en: 'Mind', uz: 'Ong', kk: 'Сана', tr: 'Zihin', es: 'Mente', pt: 'Mente', ar: 'العقل', id: 'Pikiran' },
  economy: { ru: 'Экономика', en: 'Economy', uz: 'Iqtisod', kk: 'Экономика', tr: 'Ekonomi', es: 'Economía', pt: 'Economia', ar: 'الاقتصاد', id: 'Ekonomi' },
  society: { ru: 'Общество', en: 'Society', uz: 'Jamiyat', kk: 'Қоғам', tr: 'Toplum', es: 'Sociedad', pt: 'Sociedade', ar: 'المجتمع', id: 'Masyarakat' },
  philosophy: { ru: 'Философия', en: 'Philosophy', uz: 'Falsafa', kk: 'Философия', tr: 'Felsefe', es: 'Filosofía', pt: 'Filosofia', ar: 'الفلسفة', id: 'Filsafat' },
  systems: { ru: 'Системы', en: 'Systems', uz: 'Tizimlar', kk: 'Жүйелер', tr: 'Sistemler', es: 'Sistemas', pt: 'Sistemas', ar: 'الأنظمة', id: 'Sistem' },
  power: { ru: 'Власть', en: 'Power', uz: 'Hokimiyat', kk: 'Билік', tr: 'İktidar', es: 'Poder', pt: 'Poder', ar: 'السلطة', id: 'Kekuasaan' },
  tech: { ru: 'Технологии', en: 'Tech', uz: 'Texnologiya', kk: 'Технология', tr: 'Teknoloji', es: 'Tecnología', pt: 'Tecnologia', ar: 'التقنية', id: 'Teknologi' },
  culture: { ru: 'Культура', en: 'Culture', uz: 'Madaniyat', kk: 'Мәдениет', tr: 'Kültür', es: 'Cultura', pt: 'Cultura', ar: 'الثقافة', id: 'Budaya' },
  objects: { ru: 'Предметы', en: 'Objects', uz: 'Buyumlar', kk: 'Заттар', tr: 'Eşyalar', es: 'Objetos', pt: 'Objetos', ar: 'الأشياء', id: 'Benda' },
  routine: { ru: 'Рутина', en: 'Routine', uz: 'Kundalik', kk: 'Күнделік', tr: 'Rutin', es: 'Rutina', pt: 'Rotina', ar: 'الروتين', id: 'Rutinitas' },
  city: { ru: 'Город', en: 'City', uz: 'Shahar', kk: 'Қала', tr: 'Şehir', es: 'Ciudad', pt: 'Cidade', ar: 'المدينة', id: 'Kota' },
  memory: { ru: 'Память', en: 'Memory', uz: 'Xotira', kk: 'Жады', tr: 'Hafıza', es: 'Memoria', pt: 'Memória', ar: 'الذاكرة', id: 'Kenangan' },
  people: { ru: 'Люди', en: 'People', uz: 'Odamlar', kk: 'Адамдар', tr: 'İnsanlar', es: 'Gente', pt: 'Pessoas', ar: 'الناس', id: 'Orang' },
  digital: { ru: 'Цифра', en: 'Digital', uz: 'Raqamli', kk: 'Цифра', tr: 'Dijital', es: 'Digital', pt: 'Digital', ar: 'الرقمي', id: 'Digital' },
  food: { ru: 'Еда', en: 'Food', uz: 'Taom', kk: 'Тағам', tr: 'Yemek', es: 'Comida', pt: 'Comida', ar: 'الطعام', id: 'Makanan' },
  money: { ru: 'Деньги', en: 'Money', uz: 'Pul', kk: 'Ақша', tr: 'Para', es: 'Dinero', pt: 'Dinheiro', ar: 'المال', id: 'Uang' },
  work: { ru: 'Работа', en: 'Work', uz: 'Ish', kk: 'Жұмыс', tr: 'İş', es: 'Trabajo', pt: 'Trabalho', ar: 'العمل', id: 'Kerja' },
  home: { ru: 'Дом', en: 'Home', uz: 'Uy', kk: 'Үй', tr: 'Ev', es: 'Casa', pt: 'Casa', ar: 'البيت', id: 'Rumah' },
  road: { ru: 'Дорога', en: 'Road', uz: 'Yoʻl', kk: 'Жол', tr: 'Yol', es: 'Camino', pt: 'Estrada', ar: 'الطريق', id: 'Jalan' },
  childhood: { ru: 'Детство', en: 'Childhood', uz: 'Bolalik', kk: 'Балалық', tr: 'Çocukluk', es: 'Infancia', pt: 'Infância', ar: 'الطفولة', id: 'Masa kecil' },
  relations: { ru: 'Отношения', en: 'Relationships', uz: 'Munosabatlar', kk: 'Қарым-қатынас', tr: 'İlişkiler', es: 'Relaciones', pt: 'Relações', ar: 'العلاقات', id: 'Hubungan' },
  body: { ru: 'Тело', en: 'Body', uz: 'Tana', kk: 'Дене', tr: 'Beden', es: 'Cuerpo', pt: 'Corpo', ar: 'الجسد', id: 'Tubuh' },
  clothes: { ru: 'Одежда', en: 'Clothes', uz: 'Kiyim', kk: 'Киім', tr: 'Giysi', es: 'Ropa', pt: 'Roupa', ar: 'الملابس', id: 'Pakaian' },
  holiday: { ru: 'Праздники', en: 'Holidays', uz: 'Bayramlar', kk: 'Мерекелер', tr: 'Bayramlar', es: 'Fiestas', pt: 'Festas', ar: 'الأعياد', id: 'Perayaan' },
  nature: { ru: 'Природа', en: 'Nature', uz: 'Tabiat', kk: 'Табиғат', tr: 'Doğa', es: 'Naturaleza', pt: 'Natureza', ar: 'الطبيعة', id: 'Alam' },
  habits: { ru: 'Привычки', en: 'Habits', uz: 'Odatlar', kk: 'Әдеттер', tr: 'Alışkanlıklar', es: 'Hábitos', pt: 'Hábitos', ar: 'العادات', id: 'Kebiasaan' },
};

const ERA_LABEL: Record<string, Partial<Record<Lang, string>>> = {
  classic: { ru: 'классика', en: 'classic', uz: 'klassik', kk: 'классика', tr: 'klasik', es: 'clásico', pt: 'clássico', ar: 'كلاسيكي', id: 'klasik' },
  modern: { ru: '2020-е', en: '2020s', uz: '2020-yil', kk: '2020-шы', tr: '2020ler', es: 'años 2020', pt: 'anos 2020', ar: 'العشرينيات', id: '2020-an' },
};

export interface RouletteAppProps {
  lang: Lang;
  dict: Dict;
  banks: Record<Bank, TopicSlice[]>;
  seed: string;
  initialTopic?: string;
  initialMode?: Bank;
}

export function RouletteApp({ lang, dict, banks, initialTopic, initialMode }: RouletteAppProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const snd = useSound();

  const storedMode = usePersisted((s) => s.mode);
  const soundOn = usePersisted((s) => s.sound);
  const research = usePersisted((s) => s.research);
  const speech = usePersisted((s) => s.speech);
  const seenAll = usePersisted((s) => s.seen);
  const pickAll = usePersisted((s) => s.pick);

  const mode: Bank = initialMode ?? storedMode;
  const topics = banks[mode] ?? [];
  const pick = pickAll[mode] ?? null;

  /* Категория ограничивает только то, что может ВЫПАСТЬ;
     в переборе по-прежнему мелькает весь банк */
  /* Фильтр живёт только в быстром режиме: глубокий обязан
     выдавать случайное из всего банка */
  const poolIndices = useMemo(
    () =>
      mode === 'quick' && pick
        ? topics.map((t, i) => (t.domain === pick ? i : -1)).filter((i) => i >= 0)
        : undefined,
    [topics, pick, mode],
  );

  const pickerOptions = useMemo(
    () =>
      buildOptions(
        topics,
        /* Запасной — английский: он понятен большей части
           аудитории новых языков, в отличие от русского */
        Object.fromEntries(
          Object.entries(DOMAIN_LABEL).map(([k, v]) => [k, v[lang] ?? v.en ?? k]),
        ),
      ),
    [topics, lang, mode],
  );

  const [revealHook, setRevealHook] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [frame, setFrame] = useState(false);
  const restoredRef = useRef(false);

  const reel = useShuffle({
    topics,
    poolIndices,
    reduceMotion,
    onSettled: (topic) => {
      setRevealHook(false);
      const list = seenAll[mode] ?? [];
      if (!list.includes(topic.slug)) {
        patch({ seen: { ...seenAll, [mode]: [...list, topic.slug] } });
      }
      patch({ last: { ...readStoredLast(), [mode]: topic.slug } });
      /* replaceState, а не router.replace: иначе перерисуется
         всё дерево ради строки в адресе */
      const u = new URL(window.location.href);
      u.searchParams.set('t', topic.slug);
      window.history.replaceState(null, '', u);
    },
  });

  const timer = useCountdown(
    useCallback((p: Phase) => {
      if (p === 'speech') markStreakDay();
    }, []),
  );

  const fit = useFitText<HTMLHeadingElement>({
    text: reel.shown?.title ?? '',
    minPx: 28,
    maxPx: 128,
    deps: [lang, mode, frame],
  });

  /* Восстановление темы: из ссылки-вызова или из прошлой сессии */
  useEffect(() => {
    if (restoredRef.current || !topics.length) return;
    restoredRef.current = true;
    const slug = initialTopic ?? readStoredLast()[mode];
    if (!slug) return;
    const idx = topics.findIndex((t) => t.slug === slug);
    if (idx >= 0) reel.settleOn(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics.length]);

  const spinOrSkip = useCallback(() => {
    setRevealHook(false);
    reel.spinOrSkip();
  }, [reel]);

  const currentTopic = reel.current;
  const spinningRef = useRef(false);
  spinningRef.current = reel.spinning;
  const startPhase = useCallback(() => {
    if (!currentTopic) return;
    if (mode === 'deep') timer.open('research', research * 60);
    else timer.open('speech', speech * 60);
  }, [currentTopic, mode, research, speech, timer]);

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
      /* На телефоне клавиши F нет — режим «в кадр» был ловушкой
         без выхода, кроме перезагрузки */
      if (e.code === 'Escape') { e.preventDefault(); setFrame(false); return; }
      if (e.code === 'KeyF' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setFrame((v) => !v);
        return;
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        const el = document.activeElement;
        if (e.code === 'Enter' && el && /^(BUTTON|A|INPUT)$/.test(el.tagName)) return;
        e.preventDefault();
        /* Пробел во время прокрутки тоже не работает — иначе
           кнопка заблокирована, а клавиша обходит запрет */
        if (spinningRef.current) return;
        spinOrSkip();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [spinOrSkip, timer, settingsOpen]);

  const status = reel.spinning ? dict.stSpin : currentTopic ? dict.stLocked : dict.stReady;
  const shown = reel.shown;

  return (
    <>
      <div
        className={`stage ${reel.spinning ? 'is-spinning' : ''} ${frame ? 'is-frame' : ''} ${
          !currentTopic && !reel.spinning ? 'is-fresh' : ''
        }`}
      >
        <header className="head">
          <h1 className="brand">
            <Mark className="brand-mark" />
            {dict.brand}
          </h1>
          <a
            className="author"
            href="https://www.instagram.com/mirzabek_vokhidov"
            target="_blank"
            rel="noopener noreferrer"
            /* Координаты курсора внутри пилюли — для пятна света.
               Пишем в стиль напрямую: состояние тут не нужно,
               а ререндер на каждое движение мыши недопустим */
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
            }}
          >
            <span className="by">{dict.author}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                 strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="5.4" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" stroke="none" />
            </svg>
            <span>@mirzabek_vokhidov</span>
          </a>
        </header>

        <div className="controls">
          <div className="modes" role="group" aria-label="Mode">
            {(['quick', 'deep'] as Bank[]).map((m) => (
              <button
                key={m}
                aria-pressed={hydrated ? mode === m : m === 'deep'}
                disabled={reel.spinning}
                onClick={() => {
                  if (m === mode) return;
                  patch({ mode: m });
                  setRevealHook(false);
                  snd.unlock();
                  snd.blip(m === 'deep' ? 660 : 520, 0.05);
                }}
              >
                {m === 'quick' ? dict.modeQuick : dict.modeDeep}
              </button>
            ))}
          </div>

          {/* Категории — только в быстром режиме. Глубокий по замыслу
              выдаёт случайную тему, и любой довесок на экране
              отвлекает от единственного, что там должно быть */}
          {mode === 'quick' && (
            <TopicPicker
              options={pickerOptions}
              value={pick}
              anyLabel={dict.anyTopic}
              disabled={reel.spinning}
              onChange={(v) => {
                patch({ pick: { ...pickAll, [mode]: v } });
                snd.unlock();
                snd.blip(v ? 700 : 560, 0.05);
              }}
            />
          )}
        </div>

        <main className="reel">
          {/* До первого спина статуса нет: «ожидание» на пустом
              экране ничего не сообщает, только занимает место */}
          {(reel.spinning || currentTopic) && (
            <div className="reel-status">{status}</div>
          )}

          <div className="reel-box">
            {shown ? (
              <h2 className={`topic ${reel.spinning ? 'is-rolling' : 'is-landed'}`} ref={fit.ref}>
                {shown.title}
              </h2>
            ) : (
              <div className="idle">
                <p className="idle-lead">{dict.idleLead}</p>
                <p className="idle-note">{dict.tagline}</p>
              </div>
            )}
          </div>

          {!reel.spinning && currentTopic && (
            <div className="reel-meta">
              <span className="dm">
                <Icon name={currentTopic.domain} className="dm-ic" />
                {DOMAIN_LABEL[currentTopic.domain]?.[lang] ?? DOMAIN_LABEL[currentTopic.domain]?.en ?? currentTopic.domain}
              </span>
              {currentTopic.era && (
                <>
                  <span className="sep">·</span>
                  <span>{ERA_LABEL[currentTopic.era]?.[lang] ?? ERA_LABEL[currentTopic.era]?.en}</span>
                </>
              )}
            </div>
          )}

          {revealHook && currentTopic?.hook && <p className="hook">{currentTopic.hook}</p>}

          {/* При кропе 9:16 подпись обязана остаться в кадре
              вместе с темой — в шапке она бы срезалась */}
          <div className="frame-sign">
            <b>@mirzabek_vokhidov</b>
            <span>sadot0.github.io/topic-roulette</span>
          </div>
        </main>

        <footer className="actions">
          <button className="btn go" onClick={spinOrSkip} disabled={reel.spinning}>
            {reel.spinning ? dict.stSpin : currentTopic ? dict.spinAgain : dict.spin}
          </button>

          <button className="btn" onClick={startPhase} disabled={!currentTopic}>
            {mode === 'deep' ? `${research} ${dict.min}` : `${dict.speech} · ${speech} ${dict.min}`}
          </button>

          <button className="btn sq" onClick={() => setFrame(true)} disabled={!currentTopic}
                  aria-label={dict.frameMode} title={dict.frameMode}>
            <FrameIcon />
          </button>

          <button className="btn sq" onClick={() => { snd.unlock(); setSettingsOpen(true); }}
                  aria-label={dict.settings} title={dict.settings}>
            <GearIcon />
          </button>
        </footer>

        <div className="corner">
          <LangSwitch
            lang={lang}
            onPick={(l) => { patch({ lang: l }); router.push(`/${l}`); }}
          />
          <button
            className="mute"
            aria-pressed={soundOn}
            aria-label={dict.soundLabel}
            onClick={() => {
              const v = !soundOn;
              patch({ sound: v });
              snd.setEnabled(v);
              if (v) { snd.unlock(); snd.blip(700, 0.06); }
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                 strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z" />
              <path className="wave" d="M15.6 9.2a4 4 0 0 1 0 5.6" />
              <path className="wave" d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8" />
              <path className="slash" d="M3 3l18 18" strokeWidth="1.6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="vignette" aria-hidden />
      <div className="grain" aria-hidden />
      {frame && (
        <button className="frame-exit" onClick={() => setFrame(false)}>
          <span>{dict.frameHint}</span>
        </button>
      )}

      {timer.phase && currentTopic && (
        <TimerOverlay
          dict={dict}
          topic={currentTopic}
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
          sound={soundOn}
          onChange={(p) => patch(p)}
          onSound={(v) => {
            patch({ sound: v });
            snd.setEnabled(v);
            if (v) { snd.unlock(); snd.blip(700, 0.06); }
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </>
  );
}

/* Чтение вне React-цикла. Не хук — просто доступ к хранилищу */
function readStoredLast(): Partial<Record<Bank, string>> {
  try {
    const raw = localStorage.getItem('roulette-tem/v4');
    return raw ? (JSON.parse(raw).last ?? {}) : {};
  } catch {
    return {};
  }
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.6h.08A1.6 1.6 0 0 0 10 3.13V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.6 1.6 0 0 0 19.4 9v.08a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </svg>
  );
}

function FrameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="3" width="10" height="18" rx="2.4" />
      <path d="M3 8v8M21 8v8" />
    </svg>
  );
}
