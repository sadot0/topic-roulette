'use client';
import { useSyncExternalStore } from 'react';

/** prefers-reduced-motion читается реактивно: смена настройки
    в системе не должна требовать перезагрузки страницы */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
