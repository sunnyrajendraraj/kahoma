import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRecording } from '../../hooks/useRecording';
import { useSessionStatus } from '../../hooks/useSessionStatus';
import { useAuthStore } from '../../store/auth';
import { uploadChunk, uploadCharacterPhoto } from '../../lib/uploadService';
import { generateBook } from '../../lib/pdfService';
import { AudioWaveform } from '../../components/AudioWaveform';
import { RecordButton } from '../../components/RecordButton';
import { ClarificationBubble } from '../../components/ClarificationBubble';
import { UserBubble } from '../../components/UserBubble';
import { AgentStatusBar } from '../../components/AgentStatusBar';
import type { ContextMessage } from '../../types';

export default function SessionScreen() {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const scrollRef = useRef<ScrollView>(null);

  const { session, messages, loading: sessionLoading } = useSessionStatus(sessionId);
  const {
    recordingState,
    durationMillis,
    audioLevels,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopAndGetUri,
    discardRecording,
  } = useRecording();

  const [chunkOrder, setChunkOrder] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Navigate to book screen when book is ready or generating
  useEffect(() => {
    if (session?.status === 'generating_book' || session?.status === 'book_ready') {
      router.replace(`/book/${sessionId}`);
    }
  }, [session?.status, sessionId, router]);

  const handleRecordToggle = useCallback(async () => {
    if (recordingState === 'idle') {
      await startRecording();
    } else if (recordingState === 'recording') {
      await pauseRecording();
    } else if (recordingState === 'paused') {
      await resumeRecording();
    }
  }, [recordingState, startRecording, pauseRecording, resumeRecording]);

  const handleDone = useCallback(async () => {
    if (!user?.id || !sessionId) return;

    const uri = await stopAndGetUri();
    if (!uri) return;

    setUploading(true);
    try {
      const nextOrder = chunkOrder + 1;
      await uploadChunk(uri, sessionId, user.id, nextOrder);
      setChunkOrder(nextOrder);
    } catch (err) {
      console.error('Upload failed:', err);
      Alert.alert('Upload Error', 'Failed to upload recording. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [user?.id, sessionId, chunkOrder, stopAndGetUri]);

  const handleDiscard = useCallback(async () => {
    Alert.alert('Discard Recording', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => discardRecording(),
      },
    ]);
  }, [discardRecording]);

  const handleGenerateBook = useCallback(async () => {
    if (!sessionId) return;

    Alert.alert(
      "That's your story?",
      "We'll start creating your book. This takes about 5 minutes.",
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: "Yes, that's my story",
          onPress: async () => {
            try {
              await generateBook(sessionId);
            } catch (err) {
              console.error('Generate book failed:', err);
              Alert.alert('Error', 'Failed to start book generation.');
            }
          },
        },
      ]
    );
  }, [sessionId]);

  const handlePhotoUpload = useCallback(
    async (characterId: string) => {
      if (!user?.id || !sessionId) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });

      if (result.canceled || !result.assets[0]) return;

      try {
        await uploadCharacterPhoto(
          result.assets[0].uri,
          sessionId,
          user.id,
          characterId
        );
        Alert.alert('Photo added', "Thank you! We'll use this in your book.");
      } catch (err) {
        console.error('Photo upload failed:', err);
        Alert.alert('Error', 'Failed to upload photo.');
      }
    },
    [user?.id, sessionId]
  );

  const formatDuration = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const isRecordingActive = recordingState !== 'idle';
  const isProcessing = session?.status === 'processing_chunk';
  const isAwaiting = session?.status === 'awaiting_user' || session?.status === 'recording';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#C9933A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>Session</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {session?.title ?? 'My Story'}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Chat messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && !sessionLoading && (
          <View style={styles.emptyChat}>
            <Ionicons name="mic-outline" size={40} color="#C9933A" style={{ opacity: 0.4 }} />
            <Text style={styles.emptyChatText}>
              Tap the mic button below and start speaking.{'\n'}
              Tell us your story.
            </Text>
          </View>
        )}

        {messages.map((msg: ContextMessage) => {
          if (msg.role === 'assistant') {
            return (
              <ClarificationBubble
                key={msg.id}
                content={msg.content}
              />
            );
          }
          return (
            <UserBubble
              key={msg.id}
              content={msg.content}
            />
          );
        })}

        {isProcessing && (
          <AgentStatusBar message="Listening to your story..." />
        )}

        {uploading && (
          <AgentStatusBar message="Uploading your recording..." />
        )}
      </ScrollView>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        {isRecordingActive ? (
          // Recording mode
          <View style={styles.recordingControls}>
            <AudioWaveform levels={audioLevels} isActive={recordingState === 'recording'} />
            <Text style={styles.timer}>{formatDuration(durationMillis)}</Text>
            <View style={styles.recordingButtons}>
              <TouchableOpacity
                style={styles.discardButton}
                onPress={handleDiscard}
              >
                <Ionicons name="trash-outline" size={20} color="#D4443B" />
              </TouchableOpacity>

              <RecordButton
                isRecording={recordingState === 'recording'}
                isPaused={recordingState === 'paused'}
                onPress={handleRecordToggle}
                size={56}
              />

              <TouchableOpacity
                style={styles.doneButton}
                onPress={handleDone}
              >
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Idle / awaiting mode
          <View style={styles.idleControls}>
            <RecordButton
              isRecording={false}
              isPaused={false}
              onPress={handleRecordToggle}
              size={64}
            />

            {messages.length > 0 && isAwaiting && (
              <TouchableOpacity
                style={styles.generateButton}
                onPress={handleGenerateBook}
                activeOpacity={0.7}
              >
                <Text style={styles.generateText}>That&apos;s my story →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
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
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 147, 58, 0.08)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 11,
    color: '#6b5c4e',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 16,
    color: '#F5EDD8',
    fontWeight: '600',
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
  },
  emptyChatText: {
    color: '#6b5c4e',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 16,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(201, 147, 58, 0.08)',
  },
  recordingControls: {
    alignItems: 'center',
  },
  timer: {
    color: '#C9933A',
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 8,
    fontVariant: ['tabular-nums'],
  },
  recordingButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  discardButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 68, 59, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButton: {
    backgroundColor: 'rgba(201, 147, 58, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  doneText: {
    color: '#C9933A',
    fontSize: 14,
    fontWeight: '600',
  },
  idleControls: {
    alignItems: 'center',
    gap: 16,
  },
  generateButton: {
    backgroundColor: '#C9933A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
  },
  generateText: {
    color: '#050508',
    fontSize: 16,
    fontWeight: '700',
  },
});
