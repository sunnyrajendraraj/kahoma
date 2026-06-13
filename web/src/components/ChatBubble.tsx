'use client';

import React from 'react';
import type { ContextMessage } from '@/types';

interface ChatBubbleProps {
  message: ContextMessage;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`chat-row ${isUser ? 'chat-row-user' : 'chat-row-assistant'}`}>
      <div
        className={`chat-avatar ${
          isUser ? 'chat-avatar-user' : 'chat-avatar-assistant'
        }`}
      >
        {isUser ? '✦' : 'K'}
      </div>
      <div>
        <div
          className={`chat-bubble ${
            isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'
          }`}
        >
          {message.content}
        </div>
        <div
          className="chat-time"
          style={{ textAlign: isUser ? 'right' : 'left' }}
        >
          {formatTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}
