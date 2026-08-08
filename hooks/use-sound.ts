'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { sound, SERVER_SNAPSHOT } from '@/lib/audio/engine';

export function useSound() {
  const snap = useSyncExternalStore(sound.subscribe, sound.getSnapshot, () => SERVER_SNAPSHOT);

  useEffect(() => {
    const on = () => sound.resumeIfSuspended();
    document.addEventListener('visibilitychange', on);
    window.addEventListener('pointerdown', on, { passive: true });
    return () => {
      document.removeEventListener('visibilitychange', on);
      window.removeEventListener('pointerdown', on);
    };
  }, []);

  return { ...sound, enabled: snap.enabled, ready: snap.ready };
}
