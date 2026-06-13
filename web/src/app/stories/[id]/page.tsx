'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import RecordButton from '@/components/RecordButton';
import AudioWaveform from '@/components/AudioWaveform';
import ChatBubble from '@/components/ChatBubble';
import AgentStatusBar from '@/components/AgentStatusBar';
import { useRecording } from '@/hooks/useRecording';
import { useSessionStatus } from '@/hooks/useSessionStatus';
import { uploadChunk, generateBook } from '@/lib/api';

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function SessionContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { session, messages } = useSessionStatus(sessionId);
  const recording = useRecording();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [generatingBook, setGeneratingBook] = useState(false);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle audio blob (upload when recording stops)
  useEffect(() => {
    if (recording.audioBlob && !uploading) {
      handleUpload(recording.audioBlob);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording.audioBlob]);

  const handleUpload = async (blob: Blob) => {
    setUploading(true);
    try {
      await uploadChunk(sessionId, blob, chunkIndex);
      setChunkIndex((prev) => prev + 1);
      recording.resetRecording();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRecordToggle = useCallback(() => {
    if (recording.isRecording) {
      recording.stopRecording();
    } else {
      recording.startRecording();
    }
  }, [recording]);

  const handleGenerateBook = async () => {
    setGeneratingBook(true);
    try {
      await generateBook(sessionId);
      router.push(`/stories/${sessionId}/book`);
    } catch (err) {
      console.error('Generate book failed:', err);
      setGeneratingBook(false);
    }
  };

  const showBookButton =
    session &&
    messages.length > 0 &&
    !recording.isRecording &&
    !uploading &&
    session.status !== 'generating_book' &&
    session.status !== 'book_ready';

  return (
    <div className="page-container safe-bottom">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          paddingTop: '16px',
          paddingBottom: '12px',
          opacity: 0,
          animation: 'fadeInDown 400ms ease-out forwards',
        }}
      >
        <button
          onClick={() => router.push('/stories')}
          className="btn btn-ghost"
          style={{ padding: '8px', marginLeft: '-8px' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            className="heading-sm"
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {session?.title || 'My Story'}
          </h1>
          <span className="body-text-sm">
            Phase {session?.phase || 1}
          </span>
        </div>
        {session?.status === 'book_ready' && (
          <Link
            href={`/stories/${sessionId}/book`}
            className="btn btn-secondary btn-sm"
          >
            📖 Book
          </Link>
        )}
      </div>

      {/* Status Bar */}
      {session && (
        <div style={{ marginBottom: '16px' }}>
          <AgentStatusBar
            status={session.status}
            errorMessage={session.error_message}
          />
        </div>
      )}

      {/* Chat Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: '200px',
        }}
      >
        {messages.length === 0 && !recording.isRecording ? (
          <div
            className="empty-state"
            style={{
              padding: '40px 20px',
              opacity: 0,
              animation: 'fadeInUp 600ms ease-out 300ms forwards',
            }}
          >
            <div
              className="empty-state-icon"
              style={{ width: '60px', height: '60px', marginBottom: '20px' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.5">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </div>
            <p className="body-text" style={{ maxWidth: '260px' }}>
              Press the record button and start telling your story. Speak naturally — in any language.
            </p>
          </div>
        ) : (
          <div className="chat-container">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            {uploading && (
              <div
                className="chat-row chat-row-user"
                style={{ opacity: 0.6 }}
              >
                <div className="chat-avatar chat-avatar-user">✦</div>
                <div className="chat-bubble chat-bubble-user">
                  <div className="loading-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Recording Controls - Fixed bottom */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, var(--bg-primary) 30%)',
          padding: '40px 20px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          zIndex: 50,
        }}
      >
        {/* Error */}
        {recording.error && (
          <div className="auth-error" style={{ width: '100%', maxWidth: '400px', marginBottom: '8px' }}>
            {recording.error}
          </div>
        )}

        {/* Waveform */}
        {recording.isRecording && (
          <div style={{ opacity: 0, animation: 'fadeIn 300ms ease-out forwards' }}>
            <AudioWaveform
              levels={recording.levels}
              isActive={recording.isRecording && !recording.isPaused}
            />
          </div>
        )}

        {/* Duration */}
        {recording.isRecording && (
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              fontWeight: 500,
              color: recording.isPaused ? 'var(--text-secondary)' : 'var(--red)',
              letterSpacing: '0.05em',
            }}
          >
            {formatDuration(recording.durationMs)}
            {recording.isPaused && (
              <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>
                PAUSED
              </span>
            )}
          </div>
        )}

        {/* Record button row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {recording.isRecording && (
            <button
              className="btn btn-ghost"
              onClick={recording.isPaused ? recording.resumeRecording : recording.pauseRecording}
              style={{ padding: '12px' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-secondary)">
                {recording.isPaused ? (
                  <path d="M8 5v14l11-7z" />
                ) : (
                  <>
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </>
                )}
              </svg>
            </button>
          )}

          <RecordButton
            isRecording={recording.isRecording}
            isPaused={recording.isPaused}
            onPress={handleRecordToggle}
            disabled={uploading || session?.status === 'processing_chunk'}
          />

          {recording.isRecording && (
            <button
              className="btn btn-ghost"
              onClick={recording.resetRecording}
              style={{ padding: '12px' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Generate Book Button */}
        {showBookButton && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleGenerateBook}
            disabled={generatingBook}
            style={{
              marginTop: '4px',
              opacity: 0,
              animation: 'fadeInUp 400ms ease-out forwards',
            }}
          >
            {generatingBook ? (
              <>
                <div className="spinner spinner-sm" />
                Generating…
              </>
            ) : (
              <>
                📖 Generate Book
              </>
            )}
          </button>
        )}

        {/* Uploading indicator */}
        {uploading && (
          <div
            className="body-text-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: 0,
              animation: 'fadeIn 300ms ease-out forwards',
            }}
          >
            <div className="spinner spinner-sm" />
            Processing your recording…
          </div>
        )}
      </div>
    </div>
  );
}

export default function SessionPage() {
  return (
    <AuthGuard>
      <SessionContent />
    </AuthGuard>
  );
}
