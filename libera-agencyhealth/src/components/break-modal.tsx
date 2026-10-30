'use client';
import { useReducer, useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  STEPS,
  PACKAGES,
  type PackageId,
  type StepId,
} from '@/lib/session-data';
import { EFT_CONFIGS, screenForNegativity } from '@/lib/eft-config';
import { useSessionStore } from '@/lib/session-store';
import { useTTS } from '@/lib/use-tts';

// ── Props ──
interface BreakModalProps {
  packageId: PackageId;
  level: number;
  onClose: () => void;
}

// ── State Machine ──
interface SessionState {
  stepIndex: number;
  secondsRemaining: number;
  moodValue: number; // 0–100 continuous
  journal: { q1: string; q2: string; q3: string };
  eftAnswers: string[]; // [A, B, C, D] — up to 4 slots
  completed: boolean;
}

type SessionAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'TICK' }
  | { type: 'SET_MOOD'; value: number }
  | { type: 'UPDATE_JOURNAL'; field: 'q1' | 'q2' | 'q3'; value: string }
  | { type: 'UPDATE_EFT'; index: number; value: string }
  | { type: 'COMPLETE' };

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'TICK':
      if (state.secondsRemaining <= 0) return state;
      return { ...state, secondsRemaining: state.secondsRemaining - 1 };
    case 'NEXT_STEP': {
      const next = state.stepIndex + 1;
      if (next >= STEPS.length) return { ...state, completed: true };
      return { ...state, stepIndex: next, secondsRemaining: STEPS[next].duration };
    }
    case 'PREV_STEP': {
      const prev = state.stepIndex - 1;
      if (prev < 0) return state;
      return { ...state, stepIndex: prev, secondsRemaining: STEPS[prev].duration };
    }
    case 'SET_MOOD':
      return { ...state, moodValue: action.value };
    case 'UPDATE_JOURNAL':
      return { ...state, journal: { ...state.journal, [action.field]: action.value } };
    case 'UPDATE_EFT': {
      const answers = [...state.eftAnswers];
      answers[action.index] = action.value;
      return { ...state, eftAnswers: answers };
    }
    case 'COMPLETE':
      return { ...state, completed: true };
    default:
      return state;
  }
}

function initState(): SessionState {
  return {
    stepIndex: 0,
    secondsRemaining: STEPS[0].duration,
    moodValue: 50,
    journal: { q1: '', q2: '', q3: '' },
    eftAnswers: ['', '', '', ''],
    completed: false,
  };
}

// ── Helpers ──
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getMoodLabel(v: number): string {
  if (v < 15) return 'Very Low';
  if (v < 35) return 'Low';
  if (v < 55) return 'Neutral';
  if (v < 75) return 'Good';
  return 'Great';
}

function getMoodEmoji(v: number): string {
  if (v < 15) return '\u{1F622}';
  if (v < 35) return '\u{1F61F}';
  if (v < 55) return '\u{1F610}';
  if (v < 75) return '\u{1F642}';
  return '\u{1F604}';
}

// ── Inline Countdown Timer ──
function StepTimer({ seconds }: { seconds: number }) {
  const urgent = seconds <= 10 && seconds > 0;
  return (
    <div className="flex items-center justify-center gap-1.5 py-1">
      <span className="material-symbols-outlined text-xs text-on-surface-variant/40">timer</span>
      <span
        className={`font-mono text-sm tabular-nums transition-colors duration-300 ${
          urgent ? 'text-secondary' : 'text-on-surface-variant/40'
        }`}
      >
        {formatTime(seconds)}
      </span>
    </div>
  );
}

// ── Ambient Audio ──
type AmbientTrack = 'rain' | 'white-noise' | 'cello' | 'singing-bowl';

const AMBIENT_TRACKS: { id: AmbientTrack; label: string; icon: string }[] = [
  { id: 'rain', label: 'Rain', icon: 'water_drop' },
  { id: 'white-noise', label: 'White Noise', icon: 'graphic_eq' },
  { id: 'cello', label: 'Cello Classical', icon: 'music_note' },
  { id: 'singing-bowl', label: 'Singing Bowl', icon: 'notifications' },
];

function createRainSound(ctx: AudioContext, dest: AudioNode) {
  // Pink noise (Voss-McCartney) filtered to sound like rain
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const hipass = ctx.createBiquadFilter();
  hipass.type = 'highpass';
  hipass.frequency.value = 800;
  const gain = ctx.createGain();
  gain.gain.value = 0.18;
  source.connect(hipass);
  hipass.connect(gain);
  gain.connect(dest);
  source.start();
}

function createWhiteNoiseSound(ctx: AudioContext, dest: AudioNode) {
  // Warm brown noise (low-passed white noise)
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  const gain = ctx.createGain();
  gain.gain.value = 0.14;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  source.start();
}

function createCelloSound(ctx: AudioContext, dest: AudioNode) {
  // Cello-like drone: layered sawtooth oscillators with vibrato + warm filtering
  const fundamentals = [130.81, 196.0, 261.63]; // C3, G3, C4
  const master = ctx.createGain();
  master.gain.value = 0.06;
  master.connect(dest);

  fundamentals.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    // Slow vibrato
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 4.5 + i * 0.3;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 2;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800 + i * 200;
    filter.Q.value = 2;

    const oscGain = ctx.createGain();
    oscGain.gain.value = i === 0 ? 1 : 0.5;

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(master);
    osc.start();
  });
}

function createSingingBowlSound(ctx: AudioContext, dest: AudioNode) {
  // Singing bowl: sine pairs with slight detuning for natural beating
  const frequencies = [261.6, 392.0, 523.3, 659.3];
  const master = ctx.createGain();
  master.gain.value = 0.08;
  master.connect(dest);

  frequencies.forEach((freq, i) => {
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq + 1.5; // slight detune → beat frequency

    // Slow amplitude modulation
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.1 + i * 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.3;
    lfo.connect(lfoGain);

    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.5 / (i + 1);
    lfoGain.connect(oscGain.gain);

    osc1.connect(oscGain);
    osc2.connect(oscGain);
    oscGain.connect(master);

    osc1.start();
    osc2.start();
    lfo.start();
  });
}

function useAmbientAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<AmbientTrack>('cello');
  const [menuOpen, setMenuOpen] = useState(false);

  const stop = useCallback(() => {
    ctxRef.current?.close();
    ctxRef.current = null;
    setPlaying(false);
  }, []);

  const play = useCallback((track: AmbientTrack) => {
    if (ctxRef.current) {
      ctxRef.current.close();
      ctxRef.current = null;
    }
    const ctx = new AudioContext();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);

    switch (track) {
      case 'rain':
        createRainSound(ctx, masterGain);
        break;
      case 'white-noise':
        createWhiteNoiseSound(ctx, masterGain);
        break;
      case 'cello':
        createCelloSound(ctx, masterGain);
        break;
      case 'singing-bowl':
        createSingingBowlSound(ctx, masterGain);
        break;
    }

    ctxRef.current = ctx;
    setCurrentTrack(track);
    setPlaying(true);
  }, []);

  const selectTrack = useCallback(
    (track: AmbientTrack) => {
      setCurrentTrack(track);
      if (playing) play(track);
      setMenuOpen(false);
    },
    [playing, play],
  );

  const toggle = useCallback(() => {
    if (playing) stop();
    else play(currentTrack);
  }, [playing, currentTrack, play, stop]);

  useEffect(() => {
    return () => {
      ctxRef.current?.close();
    };
  }, []);

  return { playing, currentTrack, menuOpen, setMenuOpen, toggle, selectTrack };
}

// ── Main Component ──
export default function BreakModal({ packageId, level, onClose }: BreakModalProps) {
  const pkg = PACKAGES[packageId];
  const [state, dispatch] = useReducer(sessionReducer, undefined, initState);
  const { stepIndex, secondsRemaining, completed } = state;
  const currentStep = STEPS[stepIndex];
  const timerDone = secondsRemaining === 0;
  const ambient = useAmbientAudio();
  const audioMenuRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const { saveSession } = useSessionStore();

  // Close audio menu on outside click
  useEffect(() => {
    if (!ambient.menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (audioMenuRef.current && !audioMenuRef.current.contains(e.target as Node)) {
        ambient.setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ambient.menuOpen, ambient]);

  // ── Countdown timer ──
  useEffect(() => {
    if (completed) return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, [stepIndex, completed]);

  // ── Auto-advance when timer hits 0 for timed steps ──
  useEffect(() => {
    if (completed || secondsRemaining !== 0) return;
    const autoSteps: StepId[] = ['mood', 'breathwork', 'breath-watching'];
    if (!autoSteps.includes(STEPS[stepIndex].id)) return;
    const timeout = setTimeout(() => {
      setDirection(1);
      dispatch({ type: 'NEXT_STEP' });
    }, 1500);
    return () => clearTimeout(timeout);
  }, [secondsRemaining, completed, stepIndex]);

  const handleNext = useCallback(() => {
    setDirection(1);
    if (stepIndex === STEPS.length - 1) {
      saveSession({
        date: new Date().toISOString(),
        packageId,
        mood: state.moodValue,
        eftAnswers: state.eftAnswers,
        journal: state.journal,
      });
      dispatch({ type: 'COMPLETE' });
    } else {
      dispatch({ type: 'NEXT_STEP' });
    }
  }, [stepIndex, packageId, state, saveSession]);

  const handlePrev = useCallback(() => {
    if (stepIndex > 0) {
      setDirection(-1);
      dispatch({ type: 'PREV_STEP' });
    }
  }, [stepIndex]);

  // Total session progress
  const elapsed = useMemo(() => {
    let t = 0;
    for (let i = 0; i < stepIndex; i++) t += STEPS[i].duration;
    t += STEPS[stepIndex].duration - secondsRemaining;
    return t;
  }, [stepIndex, secondsRemaining]);
  const totalDuration = STEPS.reduce((a, s) => a + s.duration, 0);
  const progress = completed ? 1 : elapsed / totalDuration;

  const activeTrackLabel = AMBIENT_TRACKS.find((t) => t.id === ambient.currentTrack)?.label ?? 'Sound';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(61, 26, 40, 0.35) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(212, 165, 116, 0.1) 0%, transparent 50%),
            rgba(8, 11, 20, 0.95)
          `,
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel rounded-2xl shadow-2xl glow-edge w-full max-w-lg max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="p-6 pb-0">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-headline font-bold text-lg text-on-surface">{pkg.label}</h2>
              <div className="flex items-center gap-2">
                {/* ── Audio Settings Menu ── */}
                <div className="relative" ref={audioMenuRef}>
                  <button
                    onClick={() => ambient.setMenuOpen(!ambient.menuOpen)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label transition-all duration-300 ${
                      ambient.playing
                        ? 'bg-primary/15 text-primary border border-primary/25'
                        : 'bg-surface-container-high text-on-surface-variant/50 border border-outline-variant/15 hover:text-on-surface-variant hover:border-outline-variant/30'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">tune</span>
                    Sounds
                  </button>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {ambient.menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-60 bg-surface-container-highest rounded-xl border border-outline-variant/20 shadow-2xl z-[100] overflow-hidden"
                      >
                        <div className="p-3 border-b border-outline-variant/10 flex items-center justify-between">
                          <span className="text-xs font-label uppercase tracking-[0.1em] text-on-surface-variant/50">
                            Ambient Sound
                          </span>
                          <button
                            onClick={ambient.toggle}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-300 ${
                              ambient.playing
                                ? 'bg-primary/20 text-primary'
                                : 'bg-surface-container-high text-on-surface-variant/60'
                            }`}
                          >
                            <span className="material-symbols-outlined text-xs" style={ambient.playing ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                              {ambient.playing ? 'pause' : 'play_arrow'}
                            </span>
                            {ambient.playing ? 'On' : 'Off'}
                          </button>
                        </div>

                        <div className="p-1.5">
                          {AMBIENT_TRACKS.map((track) => {
                            const isActive = ambient.currentTrack === track.id;
                            return (
                              <button
                                key={track.id}
                                onClick={() => ambient.selectTrack(track.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                                  isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-on-surface-variant/70 hover:bg-surface-container-high hover:text-on-surface'
                                }`}
                              >
                                <span className="material-symbols-outlined text-base" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                                  {track.icon}
                                </span>
                                <span className="flex-1 text-left">{track.label}</span>
                                {isActive && (
                                  <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    check_circle
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button onClick={onClose} className="text-on-surface-variant/50 hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1 bg-surface-variant rounded-full overflow-hidden mt-3">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-tertiary rounded-full"
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* ── Step Content ── */}
          <div className="flex-1 overflow-y-auto p-6 min-h-[360px]">
            <AnimatePresence mode="wait">
              {completed ? (
                <CompletionScreen key="done" level={level} onClose={onClose} />
              ) : (
                <motion.div
                  key={stepIndex}
                  initial={{ x: 40 * direction, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -40 * direction, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  {currentStep.id === 'mood' && (
                    <MoodStep
                      value={state.moodValue}
                      onChange={(v) => dispatch({ type: 'SET_MOOD', value: v })}
                      secondsRemaining={secondsRemaining}
                    />
                  )}
                  {currentStep.id === 'breathwork' && (
                    <BreathworkStep packageId={packageId} secondsRemaining={secondsRemaining} totalDuration={STEPS[1].duration} />
                  )}
                  {currentStep.id === 'breath-watching' && (
                    <BreathWatchingStep secondsRemaining={secondsRemaining} />
                  )}
                  {currentStep.id === 'eft' && (
                    <EFTStep
                      packageId={packageId}
                      eftAnswers={state.eftAnswers}
                      onUpdateEft={(i, v) => dispatch({ type: 'UPDATE_EFT', index: i, value: v })}
                      onNext={handleNext}
                    />
                  )}
                  {currentStep.id === 'journal' && (
                    <JournalStep
                      packageId={packageId}
                      journal={state.journal}
                      onUpdate={(f, v) => dispatch({ type: 'UPDATE_JOURNAL', field: f, value: v })}
                      secondsRemaining={secondsRemaining}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Footer ── */}
          {!completed && (
            <div className="p-6 pt-4 border-t border-outline-variant/10 flex items-center justify-between gap-4">
              {/* Back button */}
              <button
                onClick={handlePrev}
                disabled={stepIndex === 0}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 active:scale-95 ${
                  stepIndex === 0
                    ? 'text-on-surface-variant/20 cursor-not-allowed'
                    : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Back
              </button>

              {/* Step dots */}
              <div className="flex gap-2">
                {STEPS.map((s, i) => (
                  <div
                    key={s.id}
                    className={`w-2 h-2 rounded-full transition-all duration-500 ${
                      i < stepIndex ? 'bg-primary' : i === stepIndex ? 'bg-primary scale-125' : 'bg-surface-variant'
                    }`}
                  />
                ))}
              </div>

              {/* Timer */}
              <span className={`font-mono text-sm tabular-nums ${timerDone ? 'text-tertiary' : 'text-on-surface-variant/60'}`}>
                {formatTime(secondsRemaining)}
              </span>

              {/* Next button */}
              <button
                onClick={handleNext}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-500 active:scale-95 ${
                  timerDone
                    ? 'bg-gradient-to-r from-primary to-tertiary text-on-primary-fixed shadow-[0_4px_20px_rgba(205,197,240,0.15)]'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-bright'
                }`}
              >
                {stepIndex === STEPS.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Step 0: Mood Slider (smiley thumb + tick marks + 75% width) ──
function MoodStep({
  value,
  onChange,
  secondsRemaining,
}: {
  value: number;
  onChange: (v: number) => void;
  secondsRemaining: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const updateFromPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      onChange(Math.round(pct));
    },
    [onChange],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => updateFromPointer(e.clientX);
    const onTouchMove = (e: TouchEvent) => updateFromPointer(e.touches[0].clientX);
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, updateFromPointer]);

  return (
    <div className="flex flex-col items-center gap-8 py-6">
      <div className="text-center">
        <h3 className="font-headline font-bold text-2xl text-on-surface mb-2">How are you feeling?</h3>
        <p className="text-on-surface-variant/75 text-sm">Slide to capture how you feel right now</p>
      </div>

      <StepTimer seconds={secondsRemaining} />

      {/* Dynamic mood label */}
      <p className="font-headline text-xl text-primary transition-all">{getMoodLabel(value)}</p>

      {/* Custom continuous slider — 75% width */}
      <div className="w-3/4">
        <div
          ref={trackRef}
          className="relative w-full h-2.5 rounded-full cursor-pointer bg-surface-variant"
          onMouseDown={(e) => {
            setDragging(true);
            updateFromPointer(e.clientX);
          }}
          onTouchStart={(e) => {
            setDragging(true);
            updateFromPointer(e.touches[0].clientX);
          }}
        >
          {/* Filled track */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-secondary-dim via-primary-dim to-primary transition-[width] duration-75"
            style={{ width: `${value}%` }}
          />

          {/* Tick marks dividing track into 4 sections */}
          {[25, 50, 75].map((pct) => (
            <div
              key={pct}
              className="absolute top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-full bg-on-surface-variant/25 pointer-events-none"
              style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)' }}
            />
          ))}

          {/* Smiley face thumb */}
          <div
            className={`absolute top-1/2 flex items-center justify-center w-10 h-10 text-2xl select-none rounded-full transition-[left] duration-75 ${
              dragging ? 'scale-110' : ''
            }`}
            style={{
              left: `calc(${value}% - 20px)`,
              transform: 'translateY(-50%)',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
              cursor: dragging ? 'grabbing' : 'grab',
            }}
          >
            {getMoodEmoji(value)}
          </div>
        </div>

        {/* Section labels under tick marks */}
        <div className="flex justify-between mt-4 px-0">
          <span className="text-[10px] font-label uppercase tracking-wide text-on-surface-variant/40 w-1/4 text-left">Low</span>
          <span className="text-[10px] font-label uppercase tracking-wide text-on-surface-variant/40 w-1/4 text-center">Neutral</span>
          <span className="text-[10px] font-label uppercase tracking-wide text-on-surface-variant/40 w-1/4 text-center">Good</span>
          <span className="text-[10px] font-label uppercase tracking-wide text-on-surface-variant/40 w-1/4 text-right">Great</span>
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Breathwork (strict 80s with visible countdown) ──
function BreathworkStep({
  packageId,
  secondsRemaining,
  totalDuration,
}: {
  packageId: PackageId;
  secondsRemaining: number;
  totalDuration: number;
}) {
  const pkg = PACKAGES[packageId];
  const { inhale, holdIn, exhale, holdOut } = pkg.breath;
  const cycleLen = inhale + holdIn + exhale + holdOut;
  const elapsed = totalDuration - secondsRemaining;
  const inCycle = elapsed % cycleLen;

  // Phase label — updates per second, fine for text
  let phase: string;
  if (inCycle < inhale) {
    phase = 'Breathe In';
  } else if (holdIn > 0 && inCycle < inhale + holdIn) {
    phase = 'Hold';
  } else if (inCycle < inhale + holdIn + exhale) {
    phase = 'Breathe Out';
  } else {
    phase = holdOut > 0 ? 'Hold' : 'Breathe In';
  }

  // Smooth keyframe animation — driven by framer-motion, not the second ticker
  const scaleValues: number[] = [1, 1.5];
  const timeValues: number[] = [0, inhale / cycleLen];
  const easeValues: import('framer-motion').Easing[] = ['easeInOut'];
  if (holdIn > 0) {
    scaleValues.push(1.5);
    timeValues.push((inhale + holdIn) / cycleLen);
    easeValues.push('linear');
  }
  scaleValues.push(1);
  timeValues.push((inhale + holdIn + exhale) / cycleLen);
  easeValues.push('easeInOut');
  if (holdOut > 0) {
    scaleValues.push(1);
    timeValues.push(1);
    easeValues.push('linear');
  }
  const breathTransition = {
    duration: cycleLen,
    repeat: Infinity,
    ease: easeValues,
    times: timeValues,
  };

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="text-center">
        <p className="text-xs font-label uppercase tracking-[0.15em] text-on-surface-variant/50 mb-1">{pkg.breath.name}</p>
        <h3 className="font-headline font-bold text-xl text-on-surface">{pkg.label}</h3>
      </div>

      {/* Visible countdown timer */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-sm text-on-surface-variant/40">timer</span>
        <span
          className={`font-mono text-lg tabular-nums transition-colors duration-300 ${
            secondsRemaining <= 10 ? 'text-secondary' : 'text-on-surface-variant/50'
          }`}
        >
          {formatTime(secondsRemaining)}
        </span>
      </div>

      {/* Breathing circle */}
      <div className="relative flex items-center justify-center w-48 h-48">
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/5"
          animate={{ scale: scaleValues }}
          transition={breathTransition}
        />
        <motion.div
          className="absolute w-32 h-32 rounded-full border-2 border-primary/20"
          animate={{ scale: scaleValues }}
          transition={breathTransition}
        />
        <motion.div
          className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-tertiary/20"
          animate={{ scale: scaleValues }}
          transition={breathTransition}
        />
      </div>

      <p className="font-headline font-bold text-2xl text-primary">{phase}</p>
      <p className="text-on-surface-variant/75 text-sm">
        {inhale}s in{holdIn > 0 ? ` · ${holdIn}s hold` : ''} · {exhale}s out
        {holdOut > 0 ? ` · ${holdOut}s hold` : ''}
      </p>

      {/* Diaphragmatic breathing instruction */}
      {pkg.breathInstruction && (
        <p className="text-xs text-on-surface-variant/85 text-center max-w-[300px] leading-relaxed px-4 py-2 rounded-lg bg-surface-container/40 border border-outline-variant/10">
          {pkg.breathInstruction}
        </p>
      )}
    </div>
  );
}

// ── Step 2: Breath Watching ──
function BreathWatchingStep({ secondsRemaining }: { secondsRemaining: number }) {
  return (
    <div className="flex flex-col items-center gap-10 py-8">
      <h3 className="font-headline text-xl text-on-surface-variant/85 text-center leading-relaxed">
        Simply observe your breath
      </h3>

      <motion.div
        className="w-6 h-6 rounded-full bg-primary/40"
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <span
        className={`font-mono text-5xl tabular-nums transition-colors duration-300 ${
          secondsRemaining <= 10 ? 'text-secondary/40' : 'text-on-surface/30'
        }`}
      >
        {formatTime(secondsRemaining)}
      </span>

      <p className="text-on-surface-variant/75 text-xs text-center max-w-[240px]">
        No technique. No counting. Just awareness.
      </p>
    </div>
  );
}

// ── Step 3: EFT Practice ──
function EFTStep({
  packageId,
  eftAnswers,
  onUpdateEft,
  onNext,
}: {
  packageId: PackageId;
  eftAnswers: string[];
  onUpdateEft: (index: number, value: string) => void;
  onNext: () => void;
}) {
  const config = EFT_CONFIGS[packageId];
  type Phase = 'countdown' | 'inputs' | 'playback';
  const [phase, setPhase] = useState<Phase>('countdown');
  const [countdown, setCountdown] = useState(10);
  const [errors, setErrors] = useState([false, false, false, false]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [muted, setMuted] = useState(false);

  const promptTts = useTTS();
  const narrativeTts = useTTS();

  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);
  const carouselRef0 = useRef<HTMLInputElement>(null);
  const carouselRef1 = useRef<HTMLInputElement>(null);
  const carouselRef2 = useRef<HTMLInputElement>(null);
  const carouselRefs = [carouselRef0, carouselRef1, carouselRef2];

  // ── 10-second countdown before revealing inputs ──
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) { setPhase('inputs'); return; }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, countdown]);

  // Auto-read the prompt during countdown
  useEffect(() => {
    if (phase === 'countdown' && !muted) promptTts.speak(config.prompt);
    if (phase !== 'countdown') promptTts.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Focus first input when inputs phase starts
  useEffect(() => {
    if (phase === 'inputs') setTimeout(() => inputARef.current?.focus(), 300);
  }, [phase]);

  // Focus active carousel input when slide changes
  useEffect(() => {
    if (phase === 'inputs') setTimeout(() => carouselRefs[carouselIndex]?.current?.focus(), 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carouselIndex, phase]);

  // Narrative
  const narrative = useMemo(() => config.buildNarrative(eftAnswers), [config, eftAnswers]);

  // Auto-play narrative on entering playback phase
  useEffect(() => {
    if (phase === 'playback' && !muted) narrativeTts.speak(narrative);
    if (phase !== 'playback') narrativeTts.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Validate all relevant inputs, then advance to playback
  function handleSubmit() {
    const count = config.inputType === 'two-singles' ? 2 : 4;
    const newErrors = Array.from({ length: count }, (_, i) =>
      screenForNegativity(eftAnswers[i] ?? '')
    );
    setErrors([...newErrors, false, false, false].slice(0, 4) as boolean[]);
    if (newErrors.some(Boolean)) return;
    setPhase('playback');
  }

  function clearError(i: number) {
    setErrors((prev) => { const n = [...prev]; n[i] = false; return n; });
  }

  // ── Countdown phase ──
  if (phase === 'countdown') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 py-4">
        <div className="text-center">
          <p className="text-xs font-label uppercase tracking-[0.15em] text-on-surface-variant/50 mb-1">EFT Practice</p>
          <h3 className="font-headline font-bold text-xl text-on-surface">{PACKAGES[packageId].label}</h3>
        </div>

        <p className="text-base leading-relaxed text-on-surface-variant/85 italic text-center px-4">
          &ldquo;{config.prompt}&rdquo;
        </p>

        <div className="flex flex-col items-center gap-3 mt-2">
          <span className="material-symbols-outlined text-2xl text-primary/40">visibility_off</span>

          {/* Voice status / mute toggle */}
          <button
            onClick={() => {
              const next = !muted;
              setMuted(next);
              if (next) promptTts.stop();
              else promptTts.speak(config.prompt);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label transition-all duration-300 ${
              muted
                ? 'bg-surface-container-high text-on-surface-variant/40 border border-outline-variant/10'
                : 'bg-primary/10 text-primary/70 border border-primary/20'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {muted ? 'voice_over_off' : promptTts.state === 'loading' ? 'hourglass_empty' : 'record_voice_over'}
            </span>
            {muted ? 'Muted' : promptTts.state === 'loading' ? 'Loading…' : promptTts.state === 'playing' ? 'Speaking…' : 'Voice on'}
          </button>

          {/* Circular countdown */}
          <div className="relative w-14 h-14 mt-1">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" strokeWidth="3" className="stroke-surface-variant" />
              <motion.circle
                cx="28" cy="28" r="22" fill="none" strokeWidth="3"
                className="stroke-primary" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 22}
                animate={{ strokeDashoffset: 2 * Math.PI * 22 * (countdown / 10) }}
                transition={{ duration: 0.9, ease: 'linear' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono text-lg font-bold text-primary">
              {countdown}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Playback phase ──
  if (phase === 'playback') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5 py-4">
        <div className="text-center">
          <p className="text-xs font-label uppercase tracking-[0.15em] text-on-surface-variant/50 mb-2">Your Narrative</p>
          <p className="font-headline text-lg text-on-surface/60 italic">Close your eyes: it is the future&hellip;</p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => {
              const next = !muted;
              setMuted(next);
              if (next) narrativeTts.stop();
              else narrativeTts.speak(narrative);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label transition-all duration-300 ${
              muted
                ? 'bg-surface-container-high text-on-surface-variant/50 border border-outline-variant/15'
                : 'bg-primary/15 text-primary border border-primary/25'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {muted ? 'voice_over_off' : 'record_voice_over'}
            </span>
            {muted ? 'Muted' : narrativeTts.state === 'loading' ? 'Loading…' : 'Reading'}
          </button>
        </div>

        {narrativeTts.state === 'loading' && (
          <div className="flex items-center gap-2">
            <motion.div className="w-2 h-2 rounded-full bg-primary/40" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }} />
            <span className="text-xs text-on-surface-variant/50">Preparing voice&hellip;</span>
          </div>
        )}
        {narrativeTts.state === 'playing' && (
          <div className="flex items-center gap-2">
            <motion.div className="w-2 h-2 rounded-full bg-primary" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
            <span className="text-xs text-primary/70">Reading aloud&hellip;</span>
          </div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="text-base leading-relaxed text-on-surface-variant/85 font-light italic whitespace-pre-line"
        >
          {narrative}
        </motion.p>

        <button
          onClick={onNext}
          className="mt-4 self-center px-8 py-2.5 bg-gradient-to-r from-primary to-tertiary text-on-primary-fixed font-bold rounded-xl text-sm shadow-[0_4px_20px_rgba(205,197,240,0.12)] hover:shadow-[0_4px_30px_rgba(205,197,240,0.18)] transition-all duration-500 active:scale-95"
        >
          Continue to Journal
        </button>
      </motion.div>
    );
  }

  // ── Inputs phase ──
  const isCarousel = config.inputType === 'single-plus-carousel';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5 py-4">
      <div className="text-center">
        <p className="text-xs font-label uppercase tracking-[0.15em] text-on-surface-variant/50 mb-1">EFT Practice</p>
        <h3 className="font-headline font-bold text-xl text-on-surface">{PACKAGES[packageId].label}</h3>
      </div>

      <p className="text-sm leading-relaxed text-on-surface-variant/75 italic text-center px-2">
        &ldquo;{config.prompt}&rdquo;
      </p>

      <div className="flex flex-col gap-4 mt-1">
        {/* ── Input A (always single-line) ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col gap-1.5">
          <label className="text-xs text-on-surface-variant/75 italic pl-3 border-l-2 border-primary/20">
            {config.labelA}
          </label>
          <input
            ref={inputARef}
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            value={eftAnswers[0] ?? ''}
            onChange={(e) => { onUpdateEft(0, e.target.value); clearError(0); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                isCarousel ? carouselRef0.current?.focus() : inputBRef.current?.focus();
              }
            }}
            placeholder="Write freely…"
            className={`w-full bg-surface-container/40 border rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/25 focus:outline-none transition-colors ${
              errors[0] ? 'border-secondary/50 bg-secondary/5' : 'border-outline-variant/10 focus:border-primary/25'
            }`}
          />
          {errors[0] && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-secondary/80 pl-3">
              What&rsquo;s there instead?
            </motion.p>
          )}
        </motion.div>

        {/* ── Input B — two-singles variant ── */}
        {!isCarousel && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col gap-1.5">
            <label className="text-xs text-on-surface-variant/75 italic pl-3 border-l-2 border-primary/20">
              {config.labelB}
            </label>
            <input
              ref={inputBRef}
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              value={eftAnswers[1] ?? ''}
              onChange={(e) => { onUpdateEft(1, e.target.value); clearError(1); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="Write freely…"
              className={`w-full bg-surface-container/40 border rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/25 focus:outline-none transition-colors ${
                errors[1] ? 'border-secondary/50 bg-secondary/5' : 'border-outline-variant/10 focus:border-primary/25'
              }`}
            />
            {errors[1] && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-secondary/80 pl-3">
                What&rsquo;s there instead?
              </motion.p>
            )}
          </motion.div>
        )}

        {/* ── Carousel — single-plus-carousel variant ── */}
        {isCarousel && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col gap-2">
            <label className="text-xs text-on-surface-variant/75 italic pl-3 border-l-2 border-primary/20">
              {config.labelB}
            </label>

            {/* Progress dots */}
            <div className="flex gap-1.5 px-1">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  onClick={() => setCarouselIndex(i)}
                  className={`flex-1 h-0.5 rounded-full transition-all duration-300 ${
                    i === carouselIndex ? 'bg-primary' : i < carouselIndex ? 'bg-primary/40' : 'bg-surface-variant'
                  }`}
                />
              ))}
            </div>

            {/* Sliding input */}
            <div className="overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={carouselIndex}
                  initial={{ x: 24, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -24, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-1.5"
                >
                  <p className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider pl-1">
                    {carouselIndex + 1} of 3
                  </p>
                  <input
                    ref={carouselRefs[carouselIndex]}
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={eftAnswers[carouselIndex + 1] ?? ''}
                    onChange={(e) => { onUpdateEft(carouselIndex + 1, e.target.value); clearError(carouselIndex + 1); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (carouselIndex < 2) setCarouselIndex((c) => c + 1);
                        else handleSubmit();
                      }
                    }}
                    placeholder={['First…', 'Second…', 'Third…'][carouselIndex]}
                    className={`w-full bg-surface-container/40 border rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/25 focus:outline-none transition-colors ${
                      errors[carouselIndex + 1] ? 'border-secondary/50 bg-secondary/5' : 'border-outline-variant/10 focus:border-primary/25'
                    }`}
                  />
                  {errors[carouselIndex + 1] && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-secondary/80 pl-3">
                      What&rsquo;s there instead?
                    </motion.p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Nav arrows */}
            <div className="flex justify-between mt-0.5">
              <button
                onClick={() => setCarouselIndex((c) => Math.max(0, c - 1))}
                disabled={carouselIndex === 0}
                className="text-on-surface-variant/30 hover:text-on-surface-variant/60 disabled:opacity-0 transition-all p-1"
              >
                <span className="material-symbols-outlined text-base">arrow_back_ios</span>
              </button>
              <button
                onClick={() => setCarouselIndex((c) => Math.min(2, c + 1))}
                disabled={carouselIndex === 2}
                className="text-on-surface-variant/30 hover:text-on-surface-variant/60 disabled:opacity-0 transition-all p-1"
              >
                <span className="material-symbols-outlined text-base">arrow_forward_ios</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={handleSubmit}
        className="mt-2 self-center px-8 py-2.5 bg-gradient-to-r from-primary to-tertiary text-on-primary-fixed font-bold rounded-xl text-sm shadow-[0_4px_20px_rgba(205,197,240,0.12)] hover:shadow-[0_4px_30px_rgba(205,197,240,0.18)] transition-all duration-500 active:scale-95"
      >
        Hear Your Narrative
      </motion.button>
    </motion.div>
  );
}

// ── Step 4: Micro-Journal ──
function JournalStep({
  packageId,
  journal,
  onUpdate,
  secondsRemaining,
}: {
  packageId: PackageId;
  journal: { q1: string; q2: string; q3: string };
  onUpdate: (field: 'q1' | 'q2' | 'q3', value: string) => void;
  secondsRemaining: number;
}) {
  const pkg = PACKAGES[packageId];

  const questions = [
    { key: 'q1' as const, label: 'In one word: how am I feeling right now?' },
    { key: 'q2' as const, label: 'What is one thing that is good right now, however small?' },
    { key: 'q3' as const, label: pkg.journalQ3 },
  ];

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="text-center mb-2">
        <h3 className="font-headline font-bold text-xl text-on-surface">Micro-Journal</h3>
        <p className="text-on-surface-variant/75 text-sm mt-1">Brief reflections — no pressure</p>
      </div>

      <StepTimer seconds={secondsRemaining} />

      {questions.map((q, i) => (
        <motion.div
          key={q.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15 }}
          className="flex flex-col gap-2"
        >
          <label className="text-sm text-on-surface-variant/75 font-medium">{q.label}</label>
          <input
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            value={journal[q.key]}
            onChange={(e) => onUpdate(q.key, e.target.value)}
            placeholder={i === 0 ? 'One word...' : 'Write freely...'}
            className="w-full bg-surface-container/60 border border-outline-variant/15 rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface-variant/25 focus:outline-none focus:border-primary/30 transition-colors"
          />
        </motion.div>
      ))}
    </div>
  );
}

// ── Completion Screen ──
function CompletionScreen({ level, onClose }: { level: number; onClose: () => void }) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-6 py-12"
    >
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}>
        <span className="material-symbols-outlined text-6xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
          check_circle
        </span>
      </motion.div>

      <div className="text-center">
        <h3 className="font-headline font-bold text-2xl text-on-surface">Training Complete</h3>
        <p className="text-on-surface-variant/50 text-sm mt-1">Level {level}</p>
      </div>

      <button
        onClick={onClose}
        className="mt-4 px-10 py-3 bg-gradient-to-r from-primary to-tertiary text-on-primary-fixed font-bold rounded-xl shadow-[0_4px_20px_rgba(205,197,240,0.12)] hover:shadow-[0_4px_30px_rgba(205,197,240,0.2)] transition-all duration-500 active:scale-95"
      >
        Continue
      </button>
    </motion.div>
  );
}
