'use client';

import React from 'react';

interface AudioWaveformProps {
  levels: number[];
  isActive: boolean;
  barCount?: number;
}

export default function AudioWaveform({
  levels,
  isActive,
  barCount = 30,
}: AudioWaveformProps) {
  // Ensure we have enough bars
  const displayLevels = levels.length >= barCount
    ? levels.slice(-barCount)
    : [...new Array(barCount - levels.length).fill(0), ...levels];

  return (
    <div className="waveform-container">
      {displayLevels.map((level, i) => {
        const height = isActive
          ? Math.max(4, level * 44)
          : Math.max(4, Math.sin((i / barCount) * Math.PI) * 8 + 4);

        return (
          <div
            key={i}
            className={`waveform-bar ${isActive ? 'waveform-bar-active' : ''}`}
            style={{
              height: `${height}px`,
              opacity: isActive ? 0.5 + level * 0.5 : 0.3,
            }}
          />
        );
      })}
    </div>
  );
}
