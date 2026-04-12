import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BookCoverProps {
  title: string;
  authorName: string;
  year?: number;
}

export function BookCover({ title, authorName, year }: BookCoverProps) {
  return (
    <View style={styles.cover}>
      <View style={styles.border}>
        <Text style={styles.ornament}>✦</Text>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.divider} />
        <Text style={styles.author}>By {authorName}</Text>
        {year && <Text style={styles.year}>{year}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    backgroundColor: '#0F0D0A',
    borderRadius: 12,
    padding: 4,
    aspectRatio: 0.7,
    width: '80%',
    alignSelf: 'center',
    shadowColor: '#C9933A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  border: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#8a7a6a',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  ornament: {
    fontSize: 24,
    color: '#8a7a6a',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#C9933A',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 16,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: '#8a7a6a',
    marginBottom: 16,
  },
  author: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6b5c4e',
    textAlign: 'center',
  },
  year: {
    fontSize: 12,
    color: '#8a7a6a',
    marginTop: 12,
  },
});
