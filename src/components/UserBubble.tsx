import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface UserBubbleProps {
  content: string;
  timestamp?: string;
}

export function UserBubble({ content, timestamp }: UserBubbleProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{content}</Text>
        {timestamp && <Text style={styles.time}>{timestamp}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
    paddingLeft: 48,
  },
  bubble: {
    backgroundColor: '#1A1714',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  text: {
    color: '#F5EDD8',
    fontSize: 15,
    lineHeight: 22,
  },
  time: {
    color: '#6b5c4e',
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
});
