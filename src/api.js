// API client — Supabase auth + REST API for books, tags, bookmarks, notes, etc.
// Shape is LOCKED — see prompt. Other modules depend on this exact surface.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!supabaseConfigured) {
  console.warn(
    "[bookshelf] Supabase env not configured. " +
    "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (Vercel: Project → Settings → Environment Variables, then redeploy).",
  );
}

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ───────────────────────────── http() wrapper ─────────────────────────────
// Attaches Bearer token from current Supabase session. Throws
// Error("api.<endpoint>: <message>") on non-2xx responses.

export async function http(method, path, body) {
  const endpoint = `${method} ${path}`;
  if (!supabase) throw notConfiguredError();
  const { data: { session } } = await supabase.auth.getSession();

  const headers = {};
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  let payload;
  if (body instanceof FormData) {
    payload = body; // browser sets multipart boundary
  } else if (body !== undefined && body !== null) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, { method, headers, body: payload });
  } catch (err) {
    throw new Error(`api.${endpoint}: ${err.message || "network error"}`);
  }

  if (res.status === 204) return null;

  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try { data = await res.json(); } catch { data = null; }
  } else {
    try { data = await res.text(); } catch { data = null; }
  }

  if (!res.ok) {
    const msg = (data && data.error && data.error.message)
      || (typeof data === "string" && data)
      || `HTTP ${res.status}`;
    throw new Error(`api.${endpoint}: ${msg}`);
  }
  return data;
}

// ───────────────────────────── Auth ─────────────────────────────

function notConfiguredError() {
  return new Error(
    "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (in Vercel: Project → Settings → Environment Variables) and redeploy.",
  );
}

export const auth = {
  async signIn(email, password) {
    if (!supabase) throw notConfiguredError();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`api.auth.signIn: ${error.message}`);
  },

  async signUp(email, password) {
    if (!supabase) throw notConfiguredError();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(`api.auth.signUp: ${error.message}`);
    return { needsConfirmation: !data.session };
  },

  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(`api.auth.signOut: ${error.message}`);
  },

  async getSession() {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return { user: session.user, access_token: session.access_token };
  },

  onAuthChange(cb) {
    if (!supabase) return () => {};
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(session ? { user: session.user, access_token: session.access_token } : null);
    });
    return () => subscription.unsubscribe();
  },
};

// ───────────────────────────── Books ─────────────────────────────

export const books = {
  list({ sort, tag_id } = {}) {
    const qs = new URLSearchParams();
    if (sort) qs.set("sort", sort);
    if (tag_id) qs.set("tag_id", tag_id);
    const s = qs.toString();
    return http("GET", `/api/books${s ? `?${s}` : ""}`);
  },

  get(id) {
    return http("GET", `/api/books/${id}`);
  },

  create({ title, author, file_path, file_size_bytes, tag_ids }) {
    return http("POST", "/api/books", { title, author, file_path, file_size_bytes, tag_ids });
  },

  update(id, patch) {
    return http("PATCH", `/api/books/${id}`, patch);
  },

  delete(id) {
    return http("DELETE", `/api/books/${id}`);
  },

  // payload: either a File (image) or { source: "page", page: number }
  cover(id, payload) {
    if (payload instanceof File || payload instanceof Blob) {
      const fd = new FormData();
      fd.append("image", payload);
      return http("POST", `/api/books/${id}/cover`, fd);
    }
    return http("POST", `/api/books/${id}/cover`, payload);
  },

  resume(id, page) {
    return http("POST", `/api/books/${id}/resume`, { page });
  },

  uploadUrl({ filename, size_bytes }) {
    return http("POST", "/api/books/upload-url", { filename, size_bytes });
  },

  // PUT the file directly to the Supabase signed URL with progress callback.
  async uploadFile(uploadUrl, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && typeof onProgress === "function") {
          onProgress(e.loaded / e.total);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`api.books.uploadFile: upload failed (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error("api.books.uploadFile: network error"));
      xhr.send(file);
    });
  },

  tags: {
    add(bookId, tagId) {
      return http("POST", `/api/books/${bookId}/tags`, { tag_id: tagId });
    },
    remove(bookId, tagId) {
      return http("DELETE", `/api/books/${bookId}/tags/${tagId}`);
    },
  },
};

// ───────────────────────────── Outline ─────────────────────────────

export const outline = {
  get(bookId) {
    return http("GET", `/api/books/${bookId}/outline`);
  },
};

// ───────────────────────────── Bookmarks ─────────────────────────────

export const bookmarks = {
  list(bookId) {
    return http("GET", `/api/books/${bookId}/bookmarks`);
  },
  create(bookId, { page_number, label }) {
    return http("POST", `/api/books/${bookId}/bookmarks`, { page_number, label });
  },
  update(id, patch) {
    return http("PATCH", `/api/bookmarks/${id}`, patch);
  },
  delete(id) {
    return http("DELETE", `/api/bookmarks/${id}`);
  },
};

// ───────────────────────────── Notes ─────────────────────────────

export const notes = {
  list(bookId, { page } = {}) {
    const qs = page ? `?page=${encodeURIComponent(page)}` : "";
    return http("GET", `/api/books/${bookId}/notes${qs}`);
  },
  create(bookId, { page_number, body }) {
    return http("POST", `/api/books/${bookId}/notes`, { page_number, body });
  },
  update(id, patch) {
    return http("PATCH", `/api/notes/${id}`, patch);
  },
  delete(id) {
    return http("DELETE", `/api/notes/${id}`);
  },
};

// ───────────────────────────── Tags ─────────────────────────────

export const tags = {
  list() {
    return http("GET", "/api/tags");
  },
  create({ name, color }) {
    return http("POST", "/api/tags", { name, color });
  },
  update(id, patch) {
    return http("PATCH", `/api/tags/${id}`, patch);
  },
  delete(id) {
    return http("DELETE", `/api/tags/${id}`);
  },
};

// ───────────────────────────── Preferences ─────────────────────────────

export const prefs = {
  get() {
    return http("GET", "/api/preferences");
  },
  update(patch) {
    return http("PATCH", "/api/preferences", patch);
  },
};

// ───────────────────────────── Normalizers ─────────────────────────────
// Map snake_case API shape ↔ camelCase UI shape used across screens.
// Outline/bookmarks/notes are loaded separately and merged in via app.hydrateBook.

export function normalizeTag(t) {
  if (!t) return t;
  return { id: t.id, name: t.name, color: t.color };
}

export function normalizeBook(b) {
  if (!b) return b;
  const tagIds = (b.tags || []).map(t => t.id);
  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle || null,
    author: b.author,
    coverKey: null,                          // legacy: no longer used; UI falls back gracefully
    coverUrl: b.cover_url || null,
    coverSource: b.cover_source || "page",
    coverPage: b.cover_page || null,
    coverPath: b.cover_path || null,
    pageCount: b.page_count || 0,
    lastOpenedPage: b.last_opened_page,
    lastOpenedAt: b.last_opened_at,
    addedAt: b.created_at,
    updatedAt: b.updated_at,
    tagIds,
    tags: (b.tags || []).map(normalizeTag),
    fileSize: b.file_size_bytes ? formatBytes(b.file_size_bytes) : "—",
    fileSizeBytes: b.file_size_bytes || null,
    filePath: b.file_path,
    fileUrl: b.file_url || null,
    extractionStatus: b.extraction_status || "pending",
    hasOutline: !!b.has_outline,
    pageSrc: null,                            // legacy: no longer used
    outline: [],                              // hydrated lazily
    bookmarks: [],                            // hydrated lazily
    notes: [],                                // hydrated lazily
    _hydrated: false,
  };
}

export function normalizeBookmark(bm) {
  if (!bm) return bm;
  return {
    id: bm.id,
    page: bm.page_number,
    label: bm.label,
    createdAt: bm.created_at,
  };
}

export function normalizeNote(n) {
  if (!n) return n;
  return {
    id: n.id,
    page: n.page_number,
    body: n.body,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  };
}

export function normalizeOutlineEntries(entries) {
  return (entries || []).map(e => ({
    id: e.id,
    title: e.title,
    page: e.page_number,
    children: normalizeOutlineEntries(e.children || []),
  }));
}

function formatBytes(n) {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// Make available to the upload.jsx agent + screens via window.api (script-loaded modules).
const api = {
  supabase, http, auth,
  books, outline, bookmarks, notes, tags, prefs,
  normalizeBook, normalizeTag, normalizeBookmark, normalizeNote, normalizeOutlineEntries,
};

if (typeof window !== "undefined") {
  window.api = api;
  window.supabase = supabase;
  window.normalizeBook = normalizeBook;
  window.normalizeTag = normalizeTag;
}

export default api;
