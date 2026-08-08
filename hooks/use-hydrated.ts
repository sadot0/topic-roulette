'use client';
import { useEffect, useState } from 'react';

/** Для мест, где мигание дефолта заметно: счётчик, режим */
export function useHydrated(): boolean {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
