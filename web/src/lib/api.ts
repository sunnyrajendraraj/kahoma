'use client';

import { supabase } from './supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const url = `${API_BASE}${API_PREFIX}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text() as unknown as T;
}

export async function createSession(title?: string): Promise<{ id: string }> {
  return apiRequest('/sessions/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title || 'My Story' }),
  });
}

export async function uploadChunk(
  sessionId: string,
  audioBlob: Blob,
  chunkIndex: number
): Promise<{ chunk_id: string; session_id: string; chunk_order: number }> {
  const formData = new FormData();
  formData.append('audio', audioBlob, `chunk_${chunkIndex}.webm`);
  formData.append('session_id', sessionId);
  formData.append('chunk_order', String(chunkIndex));

  return apiRequest('/chunks/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function generateBook(sessionId: string): Promise<{ session_id: string }> {
  return apiRequest(`/sessions/${sessionId}/generate-book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getBookStatus(sessionId: string): Promise<{
  status: string;
  progress: number;
  book_id?: string;
}> {
  return apiRequest(`/sessions/${sessionId}/book/status`);
}

export async function getBookDownloadUrl(sessionId: string): Promise<{ url: string }> {
  return apiRequest(`/sessions/${sessionId}/book/download`);
}

export async function getSessions(): Promise<{ sessions: Array<Record<string, unknown>>; count: number }> {
  return apiRequest('/sessions/');
}

export async function getSession(sessionId: string): Promise<Record<string, unknown>> {
  return apiRequest(`/sessions/${sessionId}`);
}

export async function getSessionMessages(sessionId: string): Promise<Array<Record<string, unknown>>> {
  return apiRequest(`/sessions/${sessionId}/messages`);
}
