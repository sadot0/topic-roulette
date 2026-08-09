/* ═══════════════════════════════════════════════════════════
   Движок барабана. НИ ОДНОГО импорта из React — это условие
   корректности, а не стилистика: анимация мутирует DOM напрямую
   по рефам, минуя рендер.

   Движение считается ФИЗИЧЕСКИ, а не подгонкой кривой:
   разгон с постоянным ускорением → равномерный ход →
   торможение с постоянным замедлением. Так ведёт себя
   настоящий барабан, и так не бывает рывка с места.

   Прежняя easeOutQuint давала стартовую скорость впятеро выше
   средней — первый кадр проскакивал десяток строк, и это
   читалось как «проскакивает вверх».
   ═══════════════════════════════════════════════════════════ */

export interface DrumTargets {
  strip: HTMLElement;
  window: HTMLElement;
  blur: SVGFEGaussianBlurElement | null;
}

export interface DrumHooks {
  /** speed 0..1 — задаёт тембр щелчка */
  onTick(speed: number): void;
  onLiveRow(slot: number): void;
  onSettled(token: number, slot: number): void;
}

export interface SpinParams {
  token: number;
  startSlot: number;
  targetSlot: number;
  /** заморожена на весь спин: iOS меняет высоту вьюпорта при
      скрытии URL-бара, и пересчёт посреди хода сдвинул бы ленту */
  rowHeight: number;
  /** полная длительность, мс */
  durationMs: number;
  reduceMotion: boolean;
  blurEnabled: boolean;
}

export interface DrumEngine {
  spin(p: SpinParams): void;
  skip(): void;
  cancel(): void;
  settleAt(slot: number, rowHeight: number): void;
  readonly spinning: boolean;
  destroy(): void;
}

/**
 * Профиль скорости трапецией: разгон, полка, торможение.
 * Возвращает долю пройденного пути от 0 до 1.
 *
 * Доли фаз подобраны так, чтобы торможение занимало больше
 * половины хода — именно долгий выбег создаёт напряжение
 * перед остановкой.
 */
const ACC = 0.16;   // разгон
const CRUISE = 0.26; // равномерный ход
const DEC = 0.58;   // торможение

/* Нормировочный множитель: путь при трапеции скорости равен
   площади под ней. Делим на неё, чтобы на выходе получить
   ровно единицу */
const AREA = ACC / 2 + CRUISE + DEC / 2;

function travelled(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  let s: number;
  if (t < ACC) {
    /* Разгон: скорость линейно растёт от 0, путь квадратичен.
       Ноль в начале — именно это убирает рывок с места */
    const k = t / ACC;
    s = (ACC * k * k) / 2;
  } else if (t < ACC + CRUISE) {
    const k = t - ACC;
    s = ACC / 2 + k;
  } else {
    /* Торможение: скорость линейно падает до нуля */
    const k = (t - ACC - CRUISE) / DEC;
    s = ACC / 2 + CRUISE + DEC * (k - (k * k) / 2);
  }
  return s / AREA;
}

/** Мгновенная скорость в долях средней — для тембра и размытия */
function speedAt(t: number): number {
  if (t <= 0 || t >= 1) return 0;
  if (t < ACC) return t / ACC;
  if (t < ACC + CRUISE) return 1;
  return 1 - (t - ACC - CRUISE) / DEC;
}

export function createDrumEngine(t: DrumTargets, h: DrumHooks): DrumEngine {
  let raf = 0;
  let spinning = false;
  let skipReq = false;
  let blurOn = false;

  function setOffset(pos: number, rowHeight: number) {
    const centre = t.window.clientHeight / 2;
    t.strip.style.transform = `translate3d(0,${centre - (pos + rowHeight / 2)}px,0)`;
  }

  function setBlur(v: number, enabled: boolean) {
    if (!enabled || !t.blur) return;
    t.blur.setAttribute('stdDeviation', `0 ${v.toFixed(2)}`);
    /* Свойство filter переключаем только на смене состояния:
       присваивание строки каждый кадр заставляет браузер
       пересобирать цепочку фильтров впустую */
    const want = v > 0.12;
    if (want !== blurOn) {
      t.strip.style.filter = want ? 'url(#vblur)' : '';
      blurOn = want;
    }
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    spinning = false;
  }

  return {
    get spinning() {
      return spinning;
    },

    spin(p: SpinParams) {
      stop();
      skipReq = false;
      spinning = true;

      const h0 = p.rowHeight;
      const from = p.startSlot * h0;
      const exact = p.targetSlot * h0;
      const dist = from - exact;

      if (p.reduceMotion) {
        setBlur(0, p.blurEnabled);
        setOffset(exact, h0);
        h.onLiveRow(p.targetSlot);
        spinning = false;
        h.onSettled(p.token, p.targetSlot);
        return;
      }

      let lastCard = -1;
      const t0 = performance.now();

      const land = () => {
        setBlur(0, p.blurEnabled);
        setOffset(exact, h0);
        h.onLiveRow(p.targetSlot);
        spinning = false;
        raf = 0;
        h.onSettled(p.token, p.targetSlot);
      };

      const frame = (now: number) => {
        if (skipReq) return land();

        const t1 = Math.min(1, (now - t0) / p.durationMs);
        const pos = from - dist * travelled(t1);
        setOffset(pos, h0);

        /* Скорость берём из профиля, а не из разницы кадров:
           так тембр и размытие не зависят от того, успел ли
           браузер отрисовать предыдущий кадр */
        const v = speedAt(t1);
        setBlur(Math.min(9, v * 7.5), p.blurEnabled);

        const card = Math.floor(pos / h0);
        if (card !== lastCard) {
          if (lastCard !== -1) h.onTick(v);
          lastCard = card;
          h.onLiveRow(card);
        }

        if (t1 < 1) raf = requestAnimationFrame(frame);
        else land();
      };

      setOffset(from, h0);
      raf = requestAnimationFrame(frame);
    },

    skip() {
      if (spinning) skipReq = true;
    },

    cancel() {
      stop();
    },

    settleAt(slot: number, rowHeight: number) {
      stop();
      setBlur(0, true);
      setOffset(slot * rowHeight, rowHeight);
      h.onLiveRow(slot);
    },

    destroy() {
      stop();
    },
  };
}
