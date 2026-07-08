import { getSupabaseAdmin } from './supabase';

function mapRowToCV(row) {
  return {
    id: row.id,
    originalUrl: row.original_url,
    fileName: row.file_name,
    storageFileName: row.storage_file_name,
    mimeType: row.mime_type,
    status: row.status,
    extractedData: row.extracted_data,
    rawText: row.raw_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCVs() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRowToCV);
}

export async function getCV(id) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('candidates').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapRowToCV(data) : null;
}

export async function createCV({ originalUrl, fileName, storageFileName = null, mimeType = null }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('candidates')
    .insert({
      original_url: originalUrl,
      file_name: fileName,
      storage_file_name: storageFileName,
      mime_type: mimeType,
      status: 'PENDING',
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapRowToCV(data);
}

export async function updateCV(id, data) {
  const supabase = getSupabaseAdmin();
  const payload = {
    ...(data.originalUrl !== undefined ? { original_url: data.originalUrl } : {}),
    ...(data.fileName !== undefined ? { file_name: data.fileName } : {}),
    ...(data.storageFileName !== undefined ? { storage_file_name: data.storageFileName } : {}),
    ...(data.mimeType !== undefined ? { mime_type: data.mimeType } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.extractedData !== undefined ? { extracted_data: data.extractedData } : {}),
    ...(data.rawText !== undefined ? { raw_text: data.rawText } : {}),
    updated_at: new Date().toISOString(),
  };
  const { data: updated, error } = await supabase
    .from('candidates')
    .update(payload)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return updated ? mapRowToCV(updated) : null;
}

export async function deleteCV(id) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('candidates').delete().eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  return data ? mapRowToCV(data) : null;
}
