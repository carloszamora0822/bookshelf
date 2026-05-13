import { supabase, STORAGE_BUCKET } from "../supabase.js";

const SIGNED_URL_EXPIRY = 3600; // 1 hour

function sanitizeFilename(name: string): string {
  // Keep alphanumerics, dot, dash, underscore. Replace everything else with -.
  // Collapse repeated dashes. Cap at 120 chars before extension.
  const base = name.normalize("NFKD").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-");
  const m = base.match(/^(.+?)(\.[A-Za-z0-9]{1,8})?$/);
  if (!m) return base.slice(0, 120) || "file";
  const stem = (m[1] || "file").slice(0, 120);
  const ext = m[2] || "";
  return `${stem}${ext}`;
}

export async function createSignedUploadUrl(
  userId: string,
  filename: string
): Promise<{ uploadUrl: string; filePath: string; expiresAt: string }> {
  const safe = sanitizeFilename(filename);
  const filePath = `${userId}/pdfs/${Date.now()}-${safe}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(filePath);

  if (error) {
    throw new Error(`storage.createSignedUploadUrl: ${error.message}`);
  }

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
