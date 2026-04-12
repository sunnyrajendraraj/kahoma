import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getBookPdfUrl } from '../../lib/pdfService';
import { BookCover } from '../../components/BookCover';
import { AgentStatusBar } from '../../components/AgentStatusBar';
import type { Book, Session } from '../../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export default function BookScreen() {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [chaptersReady, setChaptersReady] = useState(0);

  // Fetch initial data
  useEffect(() => {
    if (!sessionId) return;

    Promise.all([
      supabase.from('books').select('*').eq('session_id', sessionId).single(),
      supabase.from('sessions').select('*').eq('id', sessionId).single(),
    ]).then(([bookResult, sessionResult]) => {
      if (bookResult.data) setBook(bookResult.data as Book);
      if (sessionResult.data) setSession(sessionResult.data as Session);
      setLoading(false);
    });
  }, [sessionId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!sessionId) return;

    const channels: RealtimeChannel[] = [];

    // Listen for book updates
    const bookChannel = supabase
      .channel(`book-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'books',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new) setBook(payload.new as Book);
        }
      )
      .subscribe();
    channels.push(bookChannel);

    // Listen for session updates
    const sessionChannel = supabase
      .channel(`book-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setSession(payload.new as Session);
        }
      )
      .subscribe();
    channels.push(sessionChannel);

    // Listen for chapter progress
    const chaptersChannel = supabase
      .channel(`book-chapters-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chapters',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          setChaptersReady((prev) => prev + 1);
        }
      )
      .subscribe();
    channels.push(chaptersChannel);

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [sessionId]);

  const handleReadBook = useCallback(async () => {
    if (!sessionId) return;
    try {
      const url = await getBookPdfUrl(sessionId);
      if (url) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Could not load book URL.');
      }
    } catch (err) {
      console.error('Failed to open book:', err);
    }
  }, [sessionId]);

  const handleDownload = useCallback(async () => {
    if (!sessionId) return;
    try {
      const url = await getBookPdfUrl(sessionId);
      if (!url) {
        Alert.alert('Error', 'Book not available.');
        return;
      }
      const fileUri = FileSystem.documentDirectory + 'kahoma_book.pdf';
      const download = await FileSystem.downloadAsync(url, fileUri);
      Alert.alert('Downloaded', `Book saved to ${download.uri}`);
    } catch (err) {
      console.error('Download failed:', err);
      Alert.alert('Error', 'Failed to download book.');
    }
  }, [sessionId]);

  const handleShare = useCallback(async () => {
    if (!sessionId) return;
    try {
      const url = await getBookPdfUrl(sessionId);
      if (!url) return;
      const fileUri = FileSystem.documentDirectory + 'kahoma_book.pdf';
      await FileSystem.downloadAsync(url, fileUri);
      await Sharing.shareAsync(fileUri);
    } catch (err) {
      console.error('Share failed:', err);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#C9933A" />
      </View>
    );
  }

  const isReady = book?.status === 'ready' || session?.status === 'book_ready';
  const isFailed = session?.status === 'failed';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#C9933A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Book</Text>
        <View style={{ width: 24 }} />
      </View>

      {isReady ? (
        // Book ready — show cover and actions
        <View style={styles.readyContent}>
          <BookCover
            title={book?.cover_title ?? session?.title ?? 'My Story'}
            authorName={book?.author_name ?? 'Author'}
            year={new Date().getFullYear()}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleReadBook}
              activeOpacity={0.7}
            >
              <Ionicons name="book-outline" size={20} color="#050508" />
              <Text style={styles.primaryButtonText}>Read My Book</Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleDownload}
              >
                <Ionicons name="download-outline" size={20} color="#C9933A" />
                <Text style={styles.secondaryText}>Download</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={20} color="#C9933A" />
                <Text style={styles.secondaryText}>Share</Text>
              </TouchableOpacity>
            </View>

            {book?.page_count && (
              <Text style={styles.pageCount}>{book.page_count} pages</Text>
            )}
          </View>
        </View>
      ) : isFailed ? (
        // Failed state
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color="#D4443B" />
          <Text style={styles.failedText}>
            Something went wrong while creating your book.
          </Text>
          <Text style={styles.failedSubtext}>
            {session?.error_message ?? 'Please try again.'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Generating state
        <View style={styles.centerContent}>
          <View style={styles.bookAnimation}>
            <Ionicons name="book" size={64} color="#C9933A" style={{ opacity: 0.6 }} />
          </View>

          <Text style={styles.generatingTitle}>
            We&apos;re writing your story...
          </Text>
          <Text style={styles.generatingSubtext}>
            This takes about 5 minutes.{'\n'}
            We&apos;re crafting chapters, writing prose,{'\n'}
            and generating images.
          </Text>

          <AgentStatusBar
            message={
              chaptersReady > 0
                ? `${chaptersReady} chapters written...`
                : 'Structuring your story...'
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    color: '#F5EDD8',
    fontWeight: '600',
  },
  readyContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  actions: {
    marginTop: 32,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#C9933A',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#050508',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(201, 147, 58, 0.3)',
    borderRadius: 10,
  },
  secondaryText: {
    color: '#C9933A',
    fontSize: 14,
  },
  pageCount: {
    color: '#6b5c4e',
    fontSize: 12,
    marginTop: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  bookAnimation: {
    marginBottom: 24,
  },
  generatingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5EDD8',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  generatingSubtext: {
    fontSize: 14,
    color: '#6b5c4e',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  failedText: {
    fontSize: 18,
    color: '#F5EDD8',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  failedSubtext: {
    fontSize: 14,
    color: '#6b5c4e',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: '#C9933A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryText: {
    color: '#C9933A',
    fontSize: 14,
    fontWeight: '600',
  },
});
