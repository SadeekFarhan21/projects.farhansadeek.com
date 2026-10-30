'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export function useTimer(duration: number, onTimeout: () => void) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeoutRef = useRef(onTimeout);

  onTimeoutRef.current = onTimeout;

  const start = useCallback(() => {
    startTimeRef.current = Date.now();
    setTimeLeft(duration);
    setIsRunning(true);
  }, [duration]);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const getElapsedSeconds = useCallback(() => {
    if (startTimeRef.current === 0) return 0;
    return (Date.now() - startTimeRef.current) / 1000;
  }, []);

  const reset = useCallback(() => {
    stop();
    setTimeLeft(duration);
    startTimeRef.current = 0;
  }, [stop, duration]);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setIsRunning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        onTimeoutRef.current();
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, duration]);

  return { timeLeft, isRunning, start, stop, reset, getElapsedSeconds };
}
