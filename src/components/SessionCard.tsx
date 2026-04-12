import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import type { SessionStatus } from '../types';

interface SessionCardProps {
  title: string;
  status: SessionStatus;
  date: string;
  onPress: () => void;
}

function getStatusInfo(status: SessionStatus): { label: string; color: string } {
  switch (status) {
    case 'recording':
    case 'awaiting_user':
      return { label: 'In Progress', color: '#C9933A' };
    case 'processing_chunk':
      return { label: 'Listening...', color: '#C9933A' };
    case 'generating_book':
      return { label: 'Creating your book...', color: '#7B9FCC' };
    case 'book_ready':
      return { label: 'Book Ready', color: '#5C9E5C' };
    case 'failed':
      return { label: 'Error', color: '#D4443B' };
    default:
      return { label: status, color: '#6b5c4e' };
  }
}

export function SessionCard({ title, status, date, onPress }: SessionCardProps) {
  const { label, color } = getStatusInfo(status);

  // Format date
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.date}>{formattedDate}</Text>
      </View>
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={[styles.statusLabel, { color }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F0D0A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 147, 58, 0.1)',
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: '#F5EDD8',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  date: {
    color: '#6b5c4e',
    fontSize: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
