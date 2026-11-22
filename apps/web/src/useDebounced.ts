import { useEffect, useRef, useState } from 'react';

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/**
 * Saves the debounced value whenever it changes and once more with the latest live value on unmount,
 * so a quick person switch does not lose the last edit. `save` must ignore invalid values itself.
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
}
