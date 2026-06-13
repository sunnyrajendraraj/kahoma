'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import SessionCard from '@/components/SessionCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useSessionsStore } from '@/store/sessions';
import { createSession } from '@/lib/api';
import type { Session } from '@/types';

function StoriesContent() {
  const { user } = useAuth();
  const { sessions, setSessions } = useSessionsStore();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setSessions((data || []) as Session[]);
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [user, setSessions]);

  const handleNewStory = async () => {
    setCreating(true);
    try {
      const result = await createSession('My Story');
      router.push(`/stories/${result.id}`);
    } catch (err) {
      console.error('Failed to create session:', err);
      setCreating(false);
    }
  };

  return (
    <div className="page-container safe-bottom">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '24px',
          paddingBottom: '8px',
        }}
      >
        <div>
          <h1 className="heading-lg" style={{ opacity: 0, animation: 'fadeInDown 500ms ease-out forwards' }}>
            My Stories
          </h1>
          <p
            className="body-text-sm"
            style={{
              marginTop: '4px',
              opacity: 0,
              animation: 'fadeIn 500ms ease-out 200ms forwards',
            }}
          >
            {sessions.length > 0
              ? `${sessions.length} stor${sessions.length === 1 ? 'y' : 'ies'}`
              : 'No stories yet'}
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleNewStory}
          disabled={creating}
          style={{
            opacity: 0,
            animation: 'fadeInDown 500ms ease-out 100ms forwards',
          }}
        >
          {creating ? (
            <div className="spinner spinner-sm" style={{ borderTopColor: 'var(--text-inverse)' }} />
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New
            </>
          )}
        </button>
      </div>

      {/* Ornament */}
      <div className="ornament" style={{ margin: '16px 0 24px' }}>
        <span className="ornament-icon">◆</span>
      </div>

      {/* Content */}
      {loading ? (
        /* Skeleton loading */
        <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: '76px', opacity: 0, animation: 'fadeIn 500ms ease-out forwards' }}
            />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        /* Empty state */
        <div
          className="empty-state"
          style={{ opacity: 0, animation: 'fadeInUp 600ms ease-out forwards' }}
        >
          <div className="empty-state-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.5">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </div>
          <h3 className="heading-md" style={{ marginBottom: '12px' }}>
            Your story begins here
          </h3>
          <p className="body-text" style={{ maxWidth: '280px', marginBottom: '32px' }}>
            Tap the button above to start recording your first memoir. Just speak naturally — we&apos;ll do the rest.
          </p>
          <button className="btn btn-primary" onClick={handleNewStory} disabled={creating}>
            {creating ? (
              <div className="spinner spinner-sm" style={{ borderTopColor: 'var(--text-inverse)' }} />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
                Start Recording
              </>
            )}
          </button>
        </div>
      ) : (
        /* Session list */
        <div
          className="stagger-children"
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          {sessions.map((session, index) => (
            <div
              key={session.id}
              style={{
                opacity: 0,
                animation: `fadeInUp 400ms ease-out ${index * 80}ms forwards`,
              }}
            >
              <SessionCard session={session} />
            </div>
          ))}
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <Link href="/stories" className="nav-item nav-item-active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
          Stories
        </Link>
        <Link href="/profile" className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Profile
        </Link>
      </nav>
    </div>
  );
}

export default function StoriesPage() {
  return (
    <AuthGuard>
      <StoriesContent />
    </AuthGuard>
  );
}
