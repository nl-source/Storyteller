import { useCallback, useEffect, useRef, useState } from 'react';
import { matchAlternatives, type MatchResult, type VocabEntry } from '@/lib/speech-match';

/**
 * One shared microphone hook for every chapter.
 *
 * What it fixes compared with calling SpeechRecognition directly:
 * - asks for 5 alternative transcripts and keeps the one with the most target words;
 * - matches leniently against the page's small word list (see lib/speech-match.ts);
 * - Chrome silently stops "continuous" listening after a pause, so we restart it
 *   while the child still has the mic switched on;
 * - a sentence that never became "final" is still used when the recogniser stops;
 * - ignores what the app itself just said aloud (word cards read the word);
 * - exposes a live loudness level so the mic button can show the child is heard.
 */

type SpeechAlternative = { transcript: string; confidence?: number };
type SpeechResult = ArrayLike<SpeechAlternative> & { isFinal: boolean };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type SpeechRecognizer = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  phrases?: unknown;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: SpeechEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognizerConstructor = new () => SpeechRecognizer;

export type MicStatus = 'idle' | 'listening' | 'unsupported' | 'blocked' | 'offline';
export type HeardUtterance = MatchResult & { alternatives: string[] };

function getRecognizer(): SpeechRecognizerConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognizerConstructor;
    webkitSpeechRecognition?: SpeechRecognizerConstructor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
}

const isIOS = () => typeof navigator !== 'undefined'
  && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

// ---- The app's own voice -------------------------------------------------
let appVoiceQuietUntil = 0;

function appIsSpeaking() {
  return Boolean(typeof window !== 'undefined' && window.speechSynthesis?.speaking) || Date.now() < appVoiceQuietUntil;
}

/** Read a word aloud slowly; the microphone ignores what it hears meanwhile. */
export function speakWord(text: string, rate = 0.78) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1.08;
    appVoiceQuietUntil = Date.now() + 1500 + text.length * 120;
    utterance.onend = () => { appVoiceQuietUntil = Date.now() + 700; };
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

// ---- Hook ------------------------------------------------------------------
type Options = {
  vocab: VocabEntry[];
  onUtterance: (heard: HeardUtterance) => void;
  /** Stop on our own after this long without any speech (ms). */
  idleTimeoutMs?: number;
};

export function useSpeechWords({ vocab, onUtterance, idleTimeoutMs = 45000 }: Options) {
  const [status, setStatus] = useState<MicStatus>(() => (getRecognizer() ? 'idle' : 'unsupported'));
  const [interim, setInterim] = useState('');
  const [level, setLevel] = useState(0);

  const vocabRef = useRef(vocab);
  const onUtteranceRef = useRef(onUtterance);
  vocabRef.current = vocab;
  onUtteranceRef.current = onUtterance;

  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const wantListeningRef = useRef(false);
  const pendingRef = useRef<string[] | null>(null);
  const lastSpeechRef = useRef(0);
  const restartTimesRef = useRef<number[]>([]);
  const meterRef = useRef<{ stream: MediaStream; context: AudioContext; frame: number } | null>(null);

  const stopMeter = useCallback(() => {
    const meter = meterRef.current;
    meterRef.current = null;
    if (!meter) return;
    cancelAnimationFrame(meter.frame);
    meter.stream.getTracks().forEach((track) => track.stop());
    void meter.context.close().catch(() => undefined);
    setLevel(0);
  }, []);

  const startMeter = useCallback(async () => {
    // iOS Safari can drop speech recognition when a second microphone stream opens.
    if (meterRef.current || isIOS() || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!wantListeningRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      const AudioContextConstructor = window.AudioContext
        || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) { stream.getTracks().forEach((track) => track.stop()); return; }
      const context = new AudioContextConstructor();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      let smoothed = 0;
      let lastPaint = 0;
      const tick = (time: number) => {
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) sum += sample * sample;
        const rms = Math.sqrt(sum / samples.length);
        smoothed = Math.max(rms, smoothed * 0.85);
        if (time - lastPaint > 70) { lastPaint = time; setLevel(Math.min(1, smoothed * 9)); }
        if (meterRef.current) meterRef.current.frame = requestAnimationFrame(tick);
      };
      meterRef.current = { stream, context, frame: requestAnimationFrame(tick) };
    } catch {
      // The level ring is decoration; recognition keeps working without it.
    }
  }, []);

  const deliver = useCallback((alternatives: string[]) => {
    pendingRef.current = null;
    setInterim('');
    const cleaned = alternatives.map((text) => text.trim()).filter(Boolean);
    if (!cleaned.length) return;
    lastSpeechRef.current = Date.now();
    const best = matchAlternatives(cleaned, vocabRef.current);
    onUtteranceRef.current({ ...best, alternatives: cleaned });
  }, []);

  const finish = useCallback((nextStatus: MicStatus = 'idle') => {
    wantListeningRef.current = false;
    const recognizer = recognizerRef.current;
    recognizerRef.current = null;
    if (recognizer) {
      recognizer.onend = null;
      try { recognizer.stop(); } catch { /* already stopped */ }
    }
    if (pendingRef.current) deliver(pendingRef.current);
    stopMeter();
    setInterim('');
    setStatus(nextStatus);
  }, [deliver, stopMeter]);

  const launch = useCallback(() => {
    const Recognizer = getRecognizer();
    if (!Recognizer) { finish('unsupported'); return; }
    const recognizer = new Recognizer();
    recognizer.lang = 'en-US';
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 5;
    // Newer Chrome can bias recognition towards expected words; ignored elsewhere.
    const PhraseConstructor = (window as Window & { SpeechRecognitionPhrase?: new (phrase: string, boost: number) => unknown }).SpeechRecognitionPhrase;
    if (PhraseConstructor && 'phrases' in recognizer) {
      try { recognizer.phrases = vocabRef.current.map(({ word }) => new PhraseConstructor(word, 5)); } catch { /* not supported in this mode */ }
    }

    recognizer.onstart = () => setStatus('listening');
    recognizer.onresult = (event) => {
      if (appIsSpeaking()) { pendingRef.current = null; setInterim(''); return; }
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const alternatives = Array.from({ length: result.length }, (_, alt) => result[alt]?.transcript ?? '');
        if (result.isFinal) deliver(alternatives);
        else {
          pendingRef.current = alternatives;
          lastSpeechRef.current = Date.now();
          setInterim(alternatives[0] ?? '');
        }
      }
    };
    recognizer.onerror = (event) => {
      const error = event.error ?? '';
      if (error === 'not-allowed' || error === 'service-not-allowed' || error === 'audio-capture') finish('blocked');
      else if (error === 'network') finish('offline');
      // "no-speech" and "aborted" are normal pauses: onend restarts us.
    };
    recognizer.onend = () => {
      if (recognizerRef.current !== recognizer) return;
      recognizerRef.current = null;
      if (pendingRef.current) deliver(pendingRef.current);
      const now = Date.now();
      restartTimesRef.current = restartTimesRef.current.filter((time) => now - time < 10000);
      const tooManyRestarts = restartTimesRef.current.length >= 6;
      const idleTooLong = now - lastSpeechRef.current > idleTimeoutMs;
      if (wantListeningRef.current && !tooManyRestarts && !idleTooLong) {
        restartTimesRef.current.push(now);
        window.setTimeout(() => { if (wantListeningRef.current && !recognizerRef.current) launch(); }, 120);
      } else {
        finish('idle');
      }
    };

    recognizerRef.current = recognizer;
    try {
      recognizer.start();
    } catch {
      recognizerRef.current = null;
      finish('idle');
    }
  }, [deliver, finish, idleTimeoutMs]);

  const start = useCallback(() => {
    if (!getRecognizer()) { setStatus('unsupported'); return; }
    if (wantListeningRef.current) return;
    wantListeningRef.current = true;
    lastSpeechRef.current = Date.now();
    restartTimesRef.current = [];
    setStatus('listening');
    launch();
    void startMeter();
  }, [launch, startMeter]);

  const stop = useCallback(() => finish('idle'), [finish]);
  const toggle = useCallback(() => (wantListeningRef.current ? stop() : start()), [start, stop]);

  useEffect(() => () => {
    wantListeningRef.current = false;
    const recognizer = recognizerRef.current;
    recognizerRef.current = null;
    if (recognizer) { recognizer.onend = null; recognizer.onresult = null; try { recognizer.abort(); } catch { /* ignore */ } }
    stopMeter();
  }, [stopMeter]);

  return { status, listening: status === 'listening', interim, level, start, stop, toggle };
}
