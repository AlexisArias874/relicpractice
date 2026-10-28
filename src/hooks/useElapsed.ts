import { useEffect, useState } from 'react';

export function useElapsed(startedAt: number): number {
  const [seconds, setSeconds] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
  );
  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  return seconds;
}
