'use client';

import React from 'react';
import type { SessionStatus } from '@/types';

interface AgentStatusBarProps {
  status: SessionStatus;
  errorMessage?: string;
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; dotClass: string }> = {
  recording: { label: 'Listening to your story…', dotClass: 'status-dot-recording' },
  processing_chunk: { label: 'Processing your words…', dotClass: 'status-dot-processing' },
  awaiting_user: { label: 'Ready for more of your story', dotClass: 'status-dot-awaiting' },
  generating_book: { label: 'Crafting your book…', dotClass: 'status-dot-generating' },
  book_ready: { label: 'Your book is ready!', dotClass: 'status-dot-ready' },
  failed: { label: 'Something went wrong', dotClass: 'status-dot-failed' },
};

export default function AgentStatusBar({ status, errorMessage }: AgentStatusBarProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.awaiting_user;

  return (
    <div className="agent-status-bar">
      <div className={`status-dot ${config.dotClass}`} />
      <span className="agent-status-text">
        {errorMessage || config.label}
      </span>
      {(status === 'processing_chunk' || status === 'generating_book') && (
        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
      )}
    </div>
  );
}
