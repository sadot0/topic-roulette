'use client';

import { useSyncExternalStore } from 'react';
import { store } from '@/lib/store/store';
import type { PersistedV4 } from '@/lib/store/schema';

/** Читать localStorage при рендере нельзя — сервер его не видит,
    и разметка разойдётся при гидрации. useSyncExternalStore
    отдаёт дефолты на сервере и настоящее состояние после монтирования */
export function usePersisted<T>(select: (s: PersistedV4) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.getSnapshot()),
    () => select(store.getServerSnapshot()),
  );
}

export const patch = store.patch;
