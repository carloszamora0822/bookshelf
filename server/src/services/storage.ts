import { supabase, STORAGE_BUCKET } from "../lib/supabase.js";

const SIGNED_URL_EXPIRY = 3600; // 1 hour

export async function createSignedUploadUrl(
  userId: string,
  filename: string
): Promise<{ uploadUrl: string; filePath: string; expiresAt: string }> {
  const filePath = `${userId}/pdfs/${Date.now()}-${filename}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(filePath);

  if (error) throw error;

  const expiresAt = new Date(
    Date.now() + SIGNED_URL_EXPIRY * 1000
  ).toISOString();

  return {
    uploadUrl: data.signedUrl,
    filePath,
    expiresAt,
  };
}

export async function createSignedDownloadUrl(
  filePath: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRY);

  if (error) throw error;
  return data.signedUrl;
}

export async function uploadBuffer(
  filePath: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, buffer, { contentType, upsert: true });

  if (error) throw error;
}

export async function downloadFile(filePath: string): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(filePath);

  if (error) throw error;
  return data.arrayBuffer();
}

export async function deleteFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([filePath]);

  if (error) throw error;
}
