'use client';

import React from 'react';
import Link from 'next/link';
import type { Session, SessionStatus } from '@/types';

interface SessionCardProps {
  session: Session;
}

function getStatusDotClass(status: SessionStatus): string {
  const map: Record<SessionStatus, string> = {
    recording: 'status-dot-recording',
    processing_chunk: 'status-dot-processing',
    awaiting_user: 'status-dot-awaiting',
    generating_book: 'status-dot-generating',
    book_ready: 'status-dot-ready',
    failed: 'status-dot-failed',
  };
  return map[status] || 'status-dot-awaiting';
}

function getStatusLabel(status: SessionStatus): string {
  const map: Record<SessionStatus, string> = {
    recording: 'Recording',
    processing_chunk: 'Processing',
    awaiting_user: 'In Progress',
    generating_book: 'Generating Book',
    book_ready: 'Book Ready',
    failed: 'Failed',
  };
  return map[status] || status;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function SessionCard({ session }: SessionCardProps) {
  return (
    <Link href={`/stories/${session.id}`} className="session-card">
      <div className="session-card-icon">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--amber)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      </div>
      <div className="session-card-content">
        <div className="session-card-title">{session.title}</div>
        <div className="session-card-meta">
          <div className={`status-dot ${getStatusDotClass(session.status)}`} />
          <span>{getStatusLabel(session.status)}</span>
          <span>·</span>
          <span>{formatDate(session.updated_at)}</span>
        </div>
      </div>
      <div className="session-card-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </Link>
  );
}
