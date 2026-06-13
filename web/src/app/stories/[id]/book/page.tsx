'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import BookCover from '@/components/BookCover';
import { supabase } from '@/lib/supabase';
import { getBookDownloadUrl } from '@/lib/api';
import type { Book, Chapter } from '@/types';

function BookContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const fetchBookData = useCallback(async () => {
    try {
      // Fetch book
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (bookError && bookError.code !== 'PGRST116') throw bookError;
      if (bookData) {
        setBook(bookData as Book);

        // Fetch chapters
        const { data: chaptersData } = await supabase
          .from('chapters')
          .select('*')
          .eq('session_id', sessionId)
          .order('chapter_number', { ascending: true });

        setChapters((chaptersData || []) as Chapter[]);
      }
    } catch (err) {
      console.error('Failed to fetch book:', err);
      setError('Failed to load book data');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchBookData();
  }, [fetchBookData]);

  // Realtime updates for book status
  useEffect(() => {
    const channel = supabase
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
          if (payload.new) {
            setBook(payload.new as Book);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chapters',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          // Refetch chapters on any change
          fetchBookData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, fetchBookData]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { url } = await getBookDownloadUrl(sessionId);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to get download link');
    } finally {
      setDownloading(false);
    }
  };

  const completedChapters = chapters.filter((c) => c.status === 'completed').length;
  const totalChapters = chapters.length;
  const progress = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;
  const isReady = book?.status === 'completed' || book?.status === 'ready';

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
        }}
      >
        <button
          onClick={() => router.push(`/stories/${sessionId}`)}
          className="btn btn-ghost"
          style={{ padding: '8px', marginLeft: '-8px' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="heading-sm" style={{ flex: 1 }}>
          Your Book
        </h1>
      </div>

      {loading ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            paddingTop: '60px',
          }}
        >
          <div className="skeleton" style={{ width: '220px', height: '310px' }} />
          <div className="skeleton" style={{ width: '200px', height: '20px' }} />
          <div className="skeleton" style={{ width: '160px', height: '16px' }} />
        </div>
      ) : !book ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.5">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </div>
          <h3 className="heading-md" style={{ marginBottom: '12px' }}>
            Book not yet generated
          </h3>
          <p className="body-text" style={{ maxWidth: '280px', marginBottom: '24px' }}>
            Return to your story and record more, then generate your book when ready.
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => router.push(`/stories/${sessionId}`)}
          >
            Back to Story
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '32px',
            paddingTop: '24px',
            opacity: 0,
            animation: 'fadeInUp 600ms ease-out forwards',
          }}
        >
          {/* Book Cover */}
          <div style={{ animation: 'float 4s ease-in-out infinite' }}>
            <BookCover
              title={book.cover_title || 'My Memoir'}
              author={book.author_name || 'Anonymous'}
            />
          </div>

          {/* Status */}
          <div style={{ textAlign: 'center', width: '100%', maxWidth: '320px' }}>
            {!isReady && (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <span className="label-text">
                    {completedChapters}/{totalChapters} chapters
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p
                  className="body-text-sm"
                  style={{ marginTop: '12px' }}
                >
                  {book.status === 'generating'
                    ? 'Crafting your chapters…'
                    : book.status === 'processing'
                      ? 'Processing your stories…'
                      : 'Preparing your book…'}
                </p>
              </>
            )}

            {isReady && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <div className="status-dot status-dot-ready" />
                  <span
                    style={{
                      color: 'var(--green)',
                      fontWeight: 500,
                      fontSize: '15px',
                    }}
                  >
                    Book Ready
                  </span>
                </div>
                {book.page_count && (
                  <p className="body-text-sm">
                    {book.page_count} pages · {totalChapters} chapters
                  </p>
                )}
              </>
            )}
          </div>

          {/* Chapters list */}
          {chapters.length > 0 && (
            <div
              style={{
                width: '100%',
                maxWidth: '400px',
              }}
            >
              <div className="ornament" style={{ marginBottom: '20px' }}>
                <span className="ornament-icon">◆</span>
              </div>
              <h3 className="label-text" style={{ marginBottom: '16px', textAlign: 'center' }}>
                Chapters
              </h3>
              <div
                className="stagger-children"
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                {chapters.map((chapter, i) => (
                  <div
                    key={chapter.id}
                    className="glass-card"
                    style={{
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      opacity: 0,
                      animation: `fadeInUp 300ms ease-out ${i * 60}ms forwards`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '18px',
                        fontWeight: 500,
                        color: 'var(--amber)',
                        width: '28px',
                        textAlign: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {chapter.chapter_number}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '15px',
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {chapter.title}
                      </div>
                      {chapter.era && (
                        <div className="body-text-sm" style={{ fontSize: '12px' }}>
                          {chapter.era}
                          {chapter.location ? ` · ${chapter.location}` : ''}
                        </div>
                      )}
                    </div>
                    <div
                      className={`status-dot ${
                        chapter.status === 'completed'
                          ? 'status-dot-ready'
                          : chapter.status === 'writing'
                            ? 'status-dot-processing'
                            : ''
                      }`}
                      style={{
                        background:
                          chapter.status !== 'completed' && chapter.status !== 'writing'
                            ? 'var(--text-muted)'
                            : undefined,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download Button */}
          {isReady && (
            <button
              className="btn btn-primary btn-lg btn-full"
              onClick={handleDownload}
              disabled={downloading}
              style={{
                maxWidth: '320px',
                marginTop: '8px',
                opacity: 0,
                animation: 'fadeInUp 400ms ease-out 300ms forwards',
              }}
            >
              {downloading ? (
                <>
                  <div className="spinner spinner-sm" style={{ borderTopColor: 'var(--text-inverse)' }} />
                  Preparing download…
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
          )}

          {error && (
            <div className="auth-error" style={{ maxWidth: '320px', width: '100%' }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BookPage() {
  return (
    <AuthGuard>
      <BookContent />
    </AuthGuard>
  );
}
