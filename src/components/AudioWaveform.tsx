import React from 'react';
import { View, StyleSheet } from 'react-native';

interface AudioWaveformProps {
  levels: number[];
  isActive: boolean;
}

export function AudioWaveform({ levels, isActive }: AudioWaveformProps) {
  // Show last 30 bars
  const bars = levels.length > 0 ? levels.slice(-30) : Array(30).fill(0.1);

  return (
    <View style={styles.container}>
      {bars.map((level, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            {
              height: Math.max(4, level * 40),
              opacity: isActive ? 0.6 + level * 0.4 : 0.3,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    gap: 2,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#C9933A',
  },
});
