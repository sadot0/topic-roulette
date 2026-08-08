/* ═══════════════════════════════════════════════════════════
   Движок барабана. НИ ОДНОГО импорта из React — это условие
   корректности, а не стилистика: анимация мутирует DOM напрямую
   по рефам, минуя рендер. Проведи хоть одно покадровое значение
   через setState — получишь 450 ререндеров за спин и рваные кадры.
   ═══════════════════════════════════════════════════════════ */

export interface DrumTargets {
  strip: HTMLElement;
  window: HTMLElement;
  blur: SVGFEGaussianBlurElement | null;
}

export interface DrumHooks {
  /** speed 0..1 — задаёт тембр щелчка */
  onTick(speed: number): void;
  /** строка прошла через прицел */
  onLiveRow(slot: number): void;
  /** спин завершён; token отсекает результат устаревшего спина */
  onSettled(token: number, slot: number): void;
}

export interface SpinParams {
  token: number;
  startSlot: number;
  targetSlot: number;
  /** заморожена на весь спин: iOS меняет высоту вьюпорта при
      скрытии URL-бара, и пересчёт посреди хода сдвинул бы ленту */
  rowHeight: number;
  runMs: number;
  crawlMs: number;
  brakeRows: number;
  reduceMotion: boolean;
  blurEnabled: boolean;
}

export interface DrumEngine {
  spin(p: SpinParams): void;
  /** досрочная посадка: инструмент, куда возвращаются по десять
      раз за сессию, обязан уметь пропускать свою анимацию */
  skip(): void;
  /** остановить без вызова onSettled — для размонтирования */
  cancel(): void;
  settleAt(slot: number, rowHeight: number): void;
  readonly spinning: boolean;
  destroy(): void;
}

const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

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

      if (p.reduceMotion) {
        setBlur(0, p.blurEnabled);
        setOffset(exact, h0);
        h.onLiveRow(p.targetSlot);
        spinning = false;
        h.onSettled(p.token, p.targetSlot);
        return;
      }

      /* Две фазы вместо одной — ради драматургии. Разгон проносит
         ленту почти до цели, затем начинается отдельный медленный
         доползок последних полутора строк. Один easing такого
         «почти взял» не даёт */
      const brake = exact + h0 * p.brakeRows;

      let lastCard = -1;
      let lastPos = from;
      let t0 = performance.now();

      const frame = (pos: number) => {
        setOffset(pos, h0);
        /* Мгновенная скорость задаёт и силу размытия, и тембр
           щелчка: всё привязано к физике, а не к таймеру */
        const dv = Math.abs(lastPos - pos) / h0;
        lastPos = pos;
        setBlur(Math.min(9, dv * 5.2), p.blurEnabled);

        const card = Math.floor(pos / h0);
        if (card !== lastCard) {
          if (lastCard !== -1) h.onTick(Math.min(1, dv / 1.5));
          lastCard = card;
          h.onLiveRow(card);
        }
      };

      const land = () => {
        setBlur(0, p.blurEnabled);
        setOffset(exact, h0);
        h.onLiveRow(p.targetSlot);
        spinning = false;
        raf = 0;
        h.onSettled(p.token, p.targetSlot);
      };

      const crawl = (now: number) => {
        if (skipReq) return land();
        const raw = Math.min(1, (now - t0) / p.crawlMs);
        frame(brake + (exact - brake) * easeOutCubic(raw));
        if (raw < 1) raf = requestAnimationFrame(crawl);
        else land();
      };

      const run = (now: number) => {
        if (skipReq) return land();
        const raw = Math.min(1, (now - t0) / p.runMs);
        frame(from + (brake - from) * easeOutQuint(raw));
        if (raw < 1) raf = requestAnimationFrame(run);
        else {
          t0 = performance.now();
          raf = requestAnimationFrame(crawl);
        }
      };

      setOffset(from, h0);
      raf = requestAnimationFrame(run);
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
