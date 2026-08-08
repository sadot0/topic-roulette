/**
 * Мешок: выдаёт все темы по разу, потом пересдаётся.
 * Честный Math.random() на 66 темах повторяется в среднем каждый
 * восьмой спин — это читается как поломка, даже когда работает
 * правильно.
 */
export class Bag {
  private queue: number[] = [];

  constructor(private size: number, private rand: () => number = Math.random) {}

  private refill(exclude?: number) {
    const pool = Array.from({ length: this.size }, (_, i) => i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    /* Новый мешок не должен начинаться с той же темы,
       на которой закончился прежний */
    if (pool.length > 1 && pool[0] === exclude) [pool[0], pool[1]] = [pool[1], pool[0]];
    this.queue = pool;
  }

  next(exclude?: number): number {
    if (!this.queue.length) this.refill(exclude);
    return this.queue.pop()!;
  }

  /** Изъять конкретную тему — для ссылки-вызова ?t=slug */
  take(index: number) {
    const at = this.queue.indexOf(index);
    if (at >= 0) this.queue.splice(at, 1);
  }

  resize(size: number) {
    if (size === this.size) return;
    this.size = size;
    this.queue = [];
  }
}
