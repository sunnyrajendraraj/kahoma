import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RecordButtonProps {
  isRecording: boolean;
  isPaused: boolean;
  onPress: () => void;
  size?: number;
}

export function RecordButton({
  isRecording,
  isPaused,
  onPress,
  size = 72,
}: RecordButtonProps) {
  const iconName = isRecording && !isPaused ? 'pause' : 'mic';
  const iconSize = size * 0.45;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        isRecording && !isPaused && styles.buttonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.innerRing}>
        <Ionicons name={iconName} size={iconSize} color="#050508" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#C9933A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C9933A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonActive: {
    backgroundColor: '#D4443B',
    shadowColor: '#D4443B',
  },
  innerRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
