import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth';
import { useSessionsStore } from '../../store/sessions';
import { createSession } from '../../lib/uploadService';
import { SessionCard } from '../../components/SessionCard';
import type { Session } from '../../types';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { sessions, loading, fetchSessions } = useSessionsStore();
  const router = useRouter();

  useEffect(() => {
    if (user?.id) {
      fetchSessions(user.id);
    }
  }, [user?.id, fetchSessions]);

  const handleNewStory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const session = await createSession(user.id, 'My Story');
      router.push(`/session/${session.id}`);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  }, [user?.id, router]);

  const handleSessionPress = useCallback(
    (session: Session) => {
      if (session.status === 'book_ready') {
        router.push(`/book/${session.id}`);
      } else {
        router.push(`/session/${session.id}`);
      }
    },
    [router]
  );

  // Empty state
  if (!loading && sessions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons
            name="pencil-outline"
            size={64}
            color="#C9933A"
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyHeading}>
            Every life holds a story{'\n'}worth telling.
          </Text>
          <Text style={styles.emptySubtext}>
            Speak your memories, and we&apos;ll turn them{'\n'}into a
            beautifully written book.
          </Text>
          <TouchableOpacity
            style={styles.beginButton}
            onPress={handleNewStory}
            activeOpacity={0.7}
          >
            <Text style={styles.beginButtonText}>Begin yours</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Stories</Text>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <SessionCard
            title={item.title}
            status={item.status}
            date={item.created_at}
            onPress={() => handleSessionPress(item)}
          />
        )}
        refreshing={loading}
        onRefresh={() => user?.id && fetchSessions(user.id)}
      />

      {/* Floating New Story button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleNewStory}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={28} color="#050508" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5EDD8',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  emptyIcon: {
    marginBottom: 24,
    opacity: 0.6,
  },
  emptyHeading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F5EDD8',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#6b5c4e',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  beginButton: {
    backgroundColor: '#C9933A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  beginButtonText: {
    color: '#050508',
    fontSize: 16,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C9933A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C9933A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
