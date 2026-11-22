import { useEffect, useRef, useState } from 'react';
import { getStorageStatus, isPersistenceSuspended } from './storageStatus';

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/**
 * Calls `flush` when the page is hidden or unloaded (`pagehide`, `visibilitychange` to hidden). A debounced
 * edit made less than 250 ms before closing the tab would be lost otherwise (review 14, B-6). Skipped while
 * another tab changed the stored data (flushing would overwrite that change on "reload") and while an
 * import or reset reloads the page.
 */
export function useFlushOnHide(flush: () => void) {
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });
  useEffect(() => {
    const run = () => {
      if (!getStorageStatus().changedElsewhere && !isPersistenceSuspended()) flushRef.current();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') run();
    };
    window.addEventListener('pagehide', run);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', run);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}

/**
 * Saves the debounced value whenever it changes, with the latest live value on unmount (so a quick person
 * switch does not lose the last edit) and when the page is hidden. `save` must ignore invalid values itself.
 */
export function usePersist<T>(live: T, committed: T, save: (value: T) => void) {
  const saveRef = useRef(save);
  const liveRef = useRef(live);
  useEffect(() => {
    saveRef.current = save;
    liveRef.current = live;
  });
  useEffect(() => saveRef.current(committed), [committed]);
  useEffect(() => () => saveRef.current(liveRef.current), []);
  useFlushOnHide(() => saveRef.current(liveRef.current));
}
