import { supabase } from './supabase';

/**
 * Get a signed URL for the book PDF so the user can view/download it.
 */
export async function getBookPdfUrl(sessionId: string): Promise<string | null> {
  const { data: book, error } = await supabase
    .from('books')
    .select('pdf_url')
    .eq('session_id', sessionId)
    .single();

  if (error || !book?.pdf_url) return null;

  const { data: signedData, error: signError } = await supabase.storage
    .from('books')
    .createSignedUrl(book.pdf_url, 3600); // 1 hour expiry

  if (signError || !signedData?.signedUrl) return null;

  return signedData.signedUrl;
}

/**
 * Trigger book generation for a session (Phase 2).
 */
export async function generateBook(sessionId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('generate-book', {
    body: { session_id: sessionId },
  });

  if (error) throw new Error(`Book generation failed: ${error.message}`);
}
