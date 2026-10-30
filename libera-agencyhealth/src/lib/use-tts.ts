'use client';
import { useState, useCallback, useRef, useEffect } from 'react';

export type TtsState = 'idle' | 'loading' | 'playing' | 'error';

function speakWithBrowser(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('No speechSynthesis'));
      return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.88;
    utt.pitch = 1.0;
    utt.volume = 1.0;

    // Prefer a female English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        /female|samantha|karen|victoria|moira|fiona|tessa/i.test(v.name),
    );
    if (preferred) utt.voice = preferred;

    utt.onend = () => resolve();
    utt.onerror = (e) => reject(e);
    window.speechSynthesis.speak(utt);
  });
}

export function useTTS() {
  const [state, setState] = useState<TtsState>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const uttActiveRef = useRef(false);
  // Incremented on every speak() call; lets async paths self-cancel if superseded
  const speakIdRef = useRef(0);

  const cleanup = useCallback(() => {
    speakIdRef.current += 1; // invalidate any in-flight speak
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    if (uttActiveRef.current) {
      window.speechSynthesis?.cancel();
      uttActiveRef.current = false;
    }
    setState('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  const speak = useCallback(
    async (text: string) => {
      // Cancel everything globally first (stops any other useTTS instance too)
      window.speechSynthesis?.cancel();
      cleanup();
      setState('loading');

      const id = ++speakIdRef.current;

      // ── Try ElevenLabs first ──
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        // If a newer speak() call has already started, bail out silently
        if (speakIdRef.current !== id) return;

        if (res.ok) {
          const blob = await res.blob();
          if (speakIdRef.current !== id) return;

          const url = URL.createObjectURL(blob);
          urlRef.current = url;

          const audio = new Audio(url);
          audioRef.current = audio;

          audio.onplay = () => setState('playing');
          audio.onended = () => {
            URL.revokeObjectURL(url);
            urlRef.current = null;
            setState('idle');
          };
          audio.onerror = () => setState('error');

          await audio.play();
          return;
        }
        // Non-OK (e.g. 402) — fall through to browser TTS
        console.warn(`ElevenLabs TTS returned ${res.status}, falling back to browser TTS`);
      } catch (err) {
        console.warn('ElevenLabs TTS fetch failed, falling back to browser TTS', err);
      }

      // Bail if superseded before reaching browser TTS
      if (speakIdRef.current !== id) return;

      // ── Fallback: Web Speech API ──
      try {
        setState('playing');
        uttActiveRef.current = true;
        await speakWithBrowser(text);
        if (speakIdRef.current === id) {
          uttActiveRef.current = false;
          setState('idle');
        }
      } catch {
        if (speakIdRef.current === id) {
          uttActiveRef.current = false;
          setState('error');
        }
      }
    },
    [cleanup],
  );

  const stop = cleanup;

  return { state, speak, stop };
}
