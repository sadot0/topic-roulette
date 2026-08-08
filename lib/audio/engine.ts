/* ═══════════════════════════════════════════════════════════
   Звук. Синтезируется целиком, ни одного аудиофайла.

   Синглтон на уровне модуля, а не на компонент: Safari
   ограничивает число AudioContext (~4), а StrictMode в dev
   смонтирует компонент дважды.

   Числа в огибающих и фильтрах подобраны на слух — при переносе
   не трогаются.
   ═══════════════════════════════════════════════════════════ */

export interface SoundApi {
  /** Только из обработчика жеста: контекст, созданный раньше,
      стартует suspended, а на iOS может залипнуть навсегда */
  unlock(): void;
  resumeIfSuspended(): void;
  setEnabled(on: boolean): void;
  tick(speed?: number): void;
  thud(): void;
  blip(freq?: number, vol?: number): void;
  chime(up?: boolean, vol?: number): void;
  pip(last?: boolean): void;
  subscribe(fn: () => void): () => void;
  getSnapshot(): SoundSnapshot;
}

export interface SoundSnapshot {
  enabled: boolean;
  ready: boolean;
}

const SERVER: SoundSnapshot = { enabled: true, ready: false };

class SoundEngine implements SoundApi {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private enabled = true;
  private listeners = new Set<() => void>();
  private snapshot: SoundSnapshot = { enabled: true, ready: false };

  private emit() {
    this.snapshot = { enabled: this.enabled, ready: !!this.ctx };
    this.listeners.forEach((f) => f());
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  /* Должен возвращать ТУ ЖЕ ссылку, пока данные не менялись —
     иначе useSyncExternalStore уходит в бесконечный цикл */
  getSnapshot = () => this.snapshot;

  unlock() {
    if (this.ctx) {
      this.resumeIfSuspended();
      return;
    }
    const AC: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;

    this.ctx = new AC();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 5;
    comp.release.value = 0.25;

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);

    const n = Math.floor(this.ctx.sampleRate * 0.35);
    this.noise = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;

    this.emit();
  }

  resumeIfSuspended() {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (on) this.resumeIfSuspended();
    this.emit();
  }

  private get live() {
    return this.enabled && this.ctx && this.master ? this.ctx : null;
  }

  /** Щелчок храповика. На замедлении ниже и глуше — слышно,
      как механизм теряет ход */
  tick(speed = 1) {
    const c = this.live;
    if (!c || !this.noise || !this.master) return;
    const t = c.currentTime;
    const s = Math.min(1, Math.max(0, speed));

    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + s * 0.5;

    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1200 + s * 1500;
    bp.Q.value = 5.5;

    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 420;

    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05 + s * 0.08, t + 0.0012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.026 + (1 - s) * 0.024);

    src.connect(bp);
    bp.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + 0.09);

    const o = c.createOscillator();
    const og = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(2050 + s * 900, t);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.022);
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(0.026 + s * 0.032, t + 0.001);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    o.connect(og);
    og.connect(this.master);
    o.start(t);
    o.stop(t + 0.06);
  }

  /** Остановка: удар плюс обертон на 45 мс позже. Металл звенит
      ПОСЛЕ контакта, а не вместе с ним */
  thud() {
    const c = this.live;
    if (!c || !this.noise || !this.master) return;
    const t = c.currentTime;

    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.32);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.36, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.55);

    const src = c.createBufferSource();
    src.buffer = this.noise;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2600, t);
    lp.frequency.exponentialRampToValueAtTime(300, t + 0.13);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.11, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    src.connect(lp);
    lp.connect(ng);
    ng.connect(this.master);
    src.start(t);
    src.stop(t + 0.2);

    const o2 = c.createOscillator();
    const g2 = c.createGain();
    o2.type = 'sine';
    o2.frequency.value = 1320;
    g2.gain.setValueAtTime(0, t + 0.045);
    g2.gain.linearRampToValueAtTime(0.038, t + 0.055);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.78);
    o2.connect(g2);
    g2.connect(this.master);
    o2.start(t + 0.045);
    o2.stop(t + 0.82);
  }

  blip(freq = 620, vol = 0.05) {
    const c = this.live;
    if (!c || !this.master) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.1);
  }

  /** Арпеджио на конец фазы */
  chime(up = true, vol = 0.17) {
    const c = this.live;
    if (!c || !this.master) return;
    const t = c.currentTime;
    const notes = up ? [523.25, 659.25, 783.99, 1046.5] : [783.99, 659.25, 523.25];
    notes.forEach((f, i) => {
      const at = t + i * 0.11;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(vol, at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.62);
      o.connect(g);
      g.connect(this.master!);
      o.start(at);
      o.stop(at + 0.68);
    });
  }

  pip(last = false) {
    const c = this.live;
    if (!c || !this.master) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = last ? 1180 : 880;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(last ? 0.07 : 0.04, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.15);
  }
}

const NOOP: SoundApi = {
  unlock() {},
  resumeIfSuspended() {},
  setEnabled() {},
  tick() {},
  thud() {},
  blip() {},
  chime() {},
  pip() {},
  subscribe: () => () => {},
  getSnapshot: () => SERVER,
};

export const sound: SoundApi = typeof window === 'undefined' ? NOOP : new SoundEngine();
export const SERVER_SNAPSHOT = SERVER;
