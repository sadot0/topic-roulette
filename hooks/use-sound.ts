'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
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

  /* Методы перечислены поимённо, а не через spread: sound —
     экземпляр класса, его методы живут в прототипе, и {...sound}
     копирует только собственные свойства. Spread молча отдавал
     объект без unlock/blip/setEnabled, и любой вызов падал */
  const api = useMemo(
    () => ({
      unlock: () => sound.unlock(),
      resumeIfSuspended: () => sound.resumeIfSuspended(),
      setEnabled: (on: boolean) => sound.setEnabled(on),
      tick: (speed?: number) => sound.tick(speed),
      thud: () => sound.thud(),
      reward: () => sound.reward(),
      blip: (freq?: number, vol?: number) => sound.blip(freq, vol),
      chime: (up?: boolean, vol?: number) => sound.chime(up, vol),
      pip: (last?: boolean) => sound.pip(last),
    }),
    [],
  );

  return { ...api, enabled: snap.enabled, ready: snap.ready };
}
