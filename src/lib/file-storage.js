import 'server-only';
import { getSupabaseAdmin, getSupabaseBucket } from './supabase';

export async function saveFile(storageFileName, buffer, mimeType) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(getSupabaseBucket())
    .upload(storageFileName, buffer, { contentType: mimeType, upsert: false });
  if (error) throw error;
}

export async function readStoredFile(storageFileName) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(getSupabaseBucket()).download(storageFileName);
  if (error) throw error;
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteStoredFile(storageFileName) {
  const supabase = getSupabaseAdmin();
  await supabase.storage.from(getSupabaseBucket()).remove([storageFileName]).catch(() => {});
}
