'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  durationMs: number;
  audioLevel: number;
  audioBlob: Blob | null;
  error: string | null;
}

interface RecordingControls {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  levels: number[];
}

const MAX_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const LEVEL_UPDATE_INTERVAL = 100;
const LEVEL_HISTORY_SIZE = 30;

export function useRecording(): RecordingState & RecordingControls {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    durationMs: 0,
    audioLevel: 0,
    audioBlob: null,
    error: null,
  });

  const [levels, setLevels] = useState<number[]>(
    new Array(LEVEL_HISTORY_SIZE).fill(0)
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (levelTimerRef.current) {
      clearInterval(levelTimerRef.current);
      levelTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const updateLevels = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate RMS level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const normalizedLevel = Math.min(rms / 128, 1);

    setState((prev) => ({ ...prev, audioLevel: normalizedLevel }));
    setLevels((prev) => {
      const next = [...prev.slice(1), normalizedLevel];
      return next;
    });
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null, audioBlob: null }));
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      // Set up AnalyserNode
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Determine supported mimeType
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setState((prev) => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          audioBlob: blob,
        }));
        cleanup();
      };

      mediaRecorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;

      // Duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current - pausedDurationRef.current;
        setState((prev) => ({ ...prev, durationMs: elapsed }));

        if (elapsed >= MAX_DURATION_MS) {
          mediaRecorderRef.current?.stop();
        }
      }, 200);

      // Audio level timer
      levelTimerRef.current = setInterval(updateLevels, LEVEL_UPDATE_INTERVAL);

      setState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        durationMs: 0,
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Microphone access denied';
      setState((prev) => ({ ...prev, error: message }));
      cleanup();
    }
  }, [cleanup, updateLevels]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.pause();
      setState((prev) => ({ ...prev, isPaused: true }));
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'paused'
    ) {
      mediaRecorderRef.current.resume();
      setState((prev) => ({ ...prev, isPaused: false }));
    }
  }, []);

  const resetRecording = useCallback(() => {
    cleanup();
    chunksRef.current = [];
    setLevels(new Array(LEVEL_HISTORY_SIZE).fill(0));
    setState({
      isRecording: false,
      isPaused: false,
      durationMs: 0,
      audioLevel: 0,
      audioBlob: null,
      error: null,
    });
  }, [cleanup]);

  return {
    ...state,
    levels,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  };
}
