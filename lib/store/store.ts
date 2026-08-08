import { KEY, LEGACY_KEY, DEFAULTS, migrate, normalize, type PersistedV4 } from './schema';

type Listener = () => void;

const listeners = new Set<Listener>();
let state: PersistedV4 = DEFAULTS;
let loaded = false;

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    state = migrate(localStorage.getItem(KEY), localStorage.getItem(LEGACY_KEY));
  } catch {
    state = { ...DEFAULTS };
  }
  emit();
}

function emit() {
  listeners.forEach((f) => f());
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* приватный режим — работаем без сохранения */
  }
}

export const store = {
  subscribe(fn: Listener) {
    load();
    listeners.add(fn);
    /* Другая вкладка изменила состояние — подхватываем */
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        state = normalize(JSON.parse(e.newValue));
        emit();
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(fn);
      window.removeEventListener('storage', onStorage);
    };
  },

  /* Ссылка меняется ТОЛЬКО при реальном изменении: иначе
     useSyncExternalStore уходит в бесконечный цикл */
  getSnapshot(): PersistedV4 {
    return state;
  },

  getServerSnapshot(): PersistedV4 {
    return DEFAULTS;
  },

  patch(p: Partial<PersistedV4>) {
    state = { ...state, ...p };
    persist();
    emit();
  },
};
