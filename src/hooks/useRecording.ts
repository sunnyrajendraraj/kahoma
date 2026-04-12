import { useState, useRef, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';

type RecordingState = 'idle' | 'recording' | 'paused';

const MAX_DURATION_MS = 600000; // 10 minutes

export function useRecording() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [durationMillis, setDurationMillis] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setPermissionDenied(true);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      await recording.startAsync();

      recordingRef.current = recording;
      setRecordingState('recording');
      setDurationMillis(0);
      setAudioLevels([]);

      // Update duration and metering every 200ms
      timerRef.current = setInterval(async () => {
        if (recordingRef.current) {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording) {
            setDurationMillis(status.durationMillis);
            // Normalize metering to 0-1 range (metering is in dB, typically -160 to 0)
            const level = status.metering !== undefined
              ? Math.max(0, (status.metering + 60) / 60)
              : 0;
            setAudioLevels((prev) => [...prev.slice(-29), level]);

            // Auto-stop at max duration
            if (status.durationMillis >= MAX_DURATION_MS) {
              clearInterval(timerRef.current!);
              timerRef.current = null;
            }
          }
        }
      }, 200);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setRecordingState('idle');
    }
  }, []);

  const pauseRecording = useCallback(async () => {
    if (recordingRef.current && recordingState === 'recording') {
      await recordingRef.current.pauseAsync();
      setRecordingState('paused');
    }
  }, [recordingState]);

  const resumeRecording = useCallback(async () => {
    if (recordingRef.current && recordingState === 'paused') {
      await recordingRef.current.startAsync();
      setRecordingState('recording');
    }
  }, [recordingState]);

  const stopAndGetUri = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) return null;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setRecordingState('idle');
      setDurationMillis(0);
      setAudioLevels([]);

      return uri;
    } catch (err) {
      console.error('Failed to stop recording:', err);
      recordingRef.current = null;
      setRecordingState('idle');
      return null;
    }
  }, []);

  const discardRecording = useCallback(async () => {
    if (recordingRef.current) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // Already stopped
      }
      recordingRef.current = null;
    }
    setRecordingState('idle');
    setDurationMillis(0);
    setAudioLevels([]);
  }, []);

  return {
    recordingState,
    durationMillis,
    audioLevels,
    permissionDenied,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopAndGetUri,
    discardRecording,
  };
}
