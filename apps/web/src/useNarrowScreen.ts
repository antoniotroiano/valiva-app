import { useEffect, useState } from 'react';

/** Same breakpoint as the single-column layout in styles.css. */
const QUERY = '(max-width: 900px)';

export function useNarrowScreen(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}
