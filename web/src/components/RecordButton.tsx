'use client';

import React from 'react';

interface RecordButtonProps {
  isRecording: boolean;
  isPaused: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export default function RecordButton({
  isRecording,
  isPaused,
  onPress,
  disabled = false,
}: RecordButtonProps) {
  return (
    <div className={`record-btn-wrapper ${isRecording ? 'active' : ''}`}>
      <div className="record-btn-ring" />
      <button
        className={`record-btn ${isRecording && !isPaused ? 'record-btn-active' : ''}`}
        onClick={onPress}
        disabled={disabled}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording && !isPaused ? (
          /* Stop icon (square) */
          <svg className="record-btn-icon" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : isPaused ? (
          /* Resume icon (play) */
          <svg className="record-btn-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          /* Microphone icon */
          <svg className="record-btn-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
