import { supabase } from './supabase';
import type { Session, VoiceChunk } from '../types';

/**
 * Create a new storytelling session for the user.
 */
export async function createSession(
  userId: string,
  title: string = 'My Story'
): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: userId, title })
    .select()
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return data as Session;
}

/**
 * Upload a voice chunk to storage and insert a DB record.
 * Then fire-and-forget transcribe-chunk edge function.
 */
export async function uploadChunk(
  localUri: string,
  sessionId: string,
  userId: string,
  chunkOrder: number
): Promise<VoiceChunk> {
  const timestamp = Date.now();
  const storagePath = `${userId}/${sessionId}/chunk_${chunkOrder}_${timestamp}.m4a`;

  // Read the file and upload to storage
  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(storagePath, blob, {
      contentType: 'audio/m4a',
      upsert: false,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // Insert voice_chunk record
  const { data: chunk, error: dbError } = await supabase
    .from('voice_chunks')
    .insert({
      session_id: sessionId,
      user_id: userId,
      audio_url: storagePath,
      chunk_order: chunkOrder,
      whisper_status: 'pending',
    })
    .select()
    .single();

  if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);

  // Fire-and-forget: invoke transcribe-chunk edge function
  supabase.functions
    .invoke('transcribe-chunk', {
      body: { chunk_id: chunk.id },
    })
    .catch((err: Error) => {
      console.error('Failed to invoke transcribe-chunk:', err.message);
    });

  return chunk as VoiceChunk;
}

/**
 * Upload a character photo and update the character record.
 */
export async function uploadCharacterPhoto(
  localUri: string,
  sessionId: string,
  userId: string,
  characterId: string
): Promise<string> {
  const storagePath = `${userId}/${sessionId}/char_${characterId}.jpg`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  // Validate size: 20MB max
  if (blob.size > 20 * 1024 * 1024) {
    throw new Error('Photo must be under 20MB');
  }

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(storagePath, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);

  // Update character record
  const { error: updateError } = await supabase
    .from('characters')
    .update({ photo_url: storagePath })
    .eq('id', characterId);

  if (updateError) throw new Error(`Character update failed: ${updateError.message}`);

  return storagePath;
}
