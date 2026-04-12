import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ClarificationBubbleProps {
  content: string;
  timestamp?: string;
}

export function ClarificationBubble({ content, timestamp }: ClarificationBubbleProps) {
  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatar}>K</Text>
      </View>
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
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingRight: 48,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C9933A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatar: {
    color: '#050508',
    fontWeight: '700',
    fontSize: 14,
  },
  bubble: {
    flex: 1,
    backgroundColor: 'rgba(201, 147, 58, 0.12)',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
