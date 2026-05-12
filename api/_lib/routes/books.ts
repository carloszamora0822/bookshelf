import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";
import {
  createSignedUploadUrl,
  createSignedDownloadUrl,
  deleteFile,
  uploadBuffer,
} from "../services/storage.js";
import type { Book, Tag } from "../types/index.js";
import multer from "multer";

const router = Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB for cover images

const uploadUrlSchema = z.object({
  filename: z.string().min(1),
  size_bytes: z.number().int().positive().max(104857600),
});

const createBookSchema = z.object({
  title: z.string().min(1).max(500),
  author: z.string().max(500).optional(),
  file_path: z.string().min(1),
  file_size_bytes: z.number().int().positive().optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
});

const updateBookSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  author: z.string().max(500).nullable().optional(),
  cover_source: z.enum(["page", "upload"]).optional(),
  cover_page: z.number().int().positive().optional(),
});

// POST /api/books/upload-url
router.post("/upload-url", async (req: Request, res: Response) => {
  const parsed = uploadUrlSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  try {
    const result = await createSignedUploadUrl(req.userId, parsed.data.filename);
    res.json({
      upload_url: result.uploadUrl,
      file_path: result.filePath,
      expires_at: result.expiresAt,
    });
  } catch (err) {
    console.error("Upload URL error:", err);
    res.status(500).json({ error: { code: "internal", message: "Failed to create upload URL" } });
  }
});

// POST /api/books
router.post("/", async (req: Request, res: Response) => {
  const parsed = createBookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  const { title, author, file_path, file_size_bytes, tag_ids } = parsed.data;

  const { data: book, error } = await supabase
    .from("books")
    .insert({
      user_id: req.userId,
      title,
      author: author || null,
      file_path,
      file_size_bytes: file_size_bytes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Create book error:", error);
    res.status(500).json({ error: { code: "internal", message: "Failed to create book" } });
    return;
  }

  if (tag_ids?.length) {
    const tagRows = tag_ids.map((tag_id) => ({
      book_id: book.id,
      tag_id,
    }));
    await supabase.from("book_tags").insert(tagRows);
  }

  // Trigger extraction asynchronously
  triggerExtraction(book.id).catch((err) =>
    console.error("Extraction trigger failed:", err)
  );

  const bookWithTags = await getBookWithTags(book.id);
  res.status(201).json(bookWithTags);
});

// GET /api/books
router.get("/", async (req: Request, res: Response) => {
  const sort = (req.query.sort as string) || "recent";
  const tagId = req.query.tag_id as string | undefined;

  let query = supabase
    .from("books")
    .select("*, book_tags(tag_id, tags(*))", { count: "exact" })
    .eq("user_id", req.userId);

  if (tagId) {
    query = query.filter("book_tags.tag_id", "eq", tagId);
  }

  switch (sort) {
    case "added":
      query = query.order("created_at", { ascending: false });
      break;
    case "title":
      query = query.order("title", { ascending: true });
      break;
    case "author":
      query = query.order("author", { ascending: true, nullsFirst: false });
      break;
    case "recent":
    default:
      query = query.order("last_opened_at", {
        ascending: false,
        nullsFirst: false,
      });
      break;
  }

  const { data: books, error, count } = await query;

  if (error) {
    console.error("List books error:", error);
    res.status(500).json({ error: { code: "internal", message: "Failed to list books" } });
    return;
  }

  const booksWithUrls = await Promise.all(
    (books || []).map(async (book) => {
      const bookAny = book as Record<string, unknown>;
      const bookTags = (bookAny.book_tags as Record<string, unknown>[] | undefined) || [];
      const tags: Tag[] = bookTags.map((bt) => bt.tags as Tag);
      let cover_url: string | null = null;
      if (book.cover_path) {
        try {
          cover_url = await createSignedDownloadUrl(book.cover_path);
        } catch { /* cover not yet generated */ }
      }
      const { book_tags: _, ...rest } = bookAny;
      return { ...rest, tags, cover_url } as Book;
    })
  );

  // Filter out books that don't actually have the tag (Supabase join filter quirk)
  const filtered = tagId
    ? booksWithUrls.filter((b) => b.tags.some((t) => t.id === tagId))
    : booksWithUrls;

  res.json({ books: filtered, total: tagId ? filtered.length : (count || 0) });
});

// GET /api/books/:id
router.get("/:id", async (req: Request, res: Response) => {
  const { data: book, error } = await supabase
    .from("books")
    .select("*, book_tags(tag_id, tags(*))")
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .single();

  if (error || !book) {
    res.status(404).json({ error: { code: "not_found", message: "Book not found" } });
    return;
  }

  const bookAny = book as Record<string, unknown>;
  const bookTags = (bookAny.book_tags as Record<string, unknown>[] | undefined) || [];
  const tags: Tag[] = bookTags.map((bt) => bt.tags as Tag);

  let cover_url: string | null = null;
  if (book.cover_path) {
    try {
      cover_url = await createSignedDownloadUrl(book.cover_path);
    } catch { /* cover not yet generated */ }
  }

  let file_url: string | null = null;
  try {
    file_url = await createSignedDownloadUrl(book.file_path);
  } catch { /* file access issue */ }

  const { count: bookmark_count } = await supabase
    .from("bookmarks")
    .select("*", { count: "exact", head: true })
    .eq("book_id", book.id);

  const { count: note_count } = await supabase
    .from("notes")
    .select("*", { count: "exact", head: true })
    .eq("book_id", book.id);

  const { count: outline_count } = await supabase
    .from("book_outline_entries")
    .select("*", { count: "exact", head: true })
    .eq("book_id", book.id);

  const { book_tags: _, ...rest } = bookAny;
  res.json({
    ...rest,
    tags,
    cover_url,
    file_url,
    bookmark_count: bookmark_count || 0,
    note_count: note_count || 0,
    outline_entry_count: outline_count || 0,
  });
});

// PATCH /api/books/:id
router.patch("/:id", async (req: Request, res: Response) => {
  const parsed = updateBookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  const { data: book, error } = await supabase
    .from("books")
    .update(parsed.data)
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .select()
    .single();

  if (error || !book) {
    res.status(404).json({ error: { code: "not_found", message: "Book not found" } });
    return;
  }

  const bookWithTags = await getBookWithTags(book.id);
  res.json(bookWithTags);
});

// DELETE /api/books/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const { data: book } = await supabase
    .from("books")
    .select("file_path, cover_path")
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .single();

  if (!book) {
    res.status(404).json({ error: { code: "not_found", message: "Book not found" } });
    return;
  }

  // Delete storage files
  try { await deleteFile(book.file_path); } catch { /* may not exist */ }
  if (book.cover_path) {
    try { await deleteFile(book.cover_path); } catch { /* may not exist */ }
  }

  await supabase
    .from("books")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.userId);

  res.status(204).end();
});

// POST /api/books/:id/cover
router.post("/:id/cover", upload.single("image"), async (req: Request, res: Response) => {
  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .single();

  if (!book) {
    res.status(404).json({ error: { code: "not_found", message: "Book not found" } });
    return;
  }

  if (req.file) {
    // Upload mode
    const sharp = (await import("sharp")).default;
    const webpBuffer = await sharp(req.file.buffer)
      .resize(600, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const coverPath = `${req.userId}/covers/${book.id}-custom.webp`;
    await uploadBuffer(coverPath, webpBuffer, "image/webp");

    const { data: updated } = await supabase
      .from("books")
      .update({ cover_source: "upload", cover_path: coverPath, cover_page: null })
      .eq("id", book.id)
      .select()
      .single();

    const cover_url = await createSignedDownloadUrl(coverPath);
    res.json({
      cover_url,
      cover_source: updated?.cover_source,
      cover_page: updated?.cover_page,
      cover_path: updated?.cover_path,
    });
  } else if (req.body.source === "page" && req.body.page) {
    // Page mode — re-trigger cover render for a specific page
    const page = parseInt(req.body.page, 10);
    if (isNaN(page) || page < 1) {
      res.status(400).json({ error: { code: "validation", message: "Invalid page number" } });
      return;
    }

    await supabase
      .from("books")
      .update({ cover_page: page, cover_source: "page" })
      .eq("id", book.id);

    // Trigger re-extraction of cover
    triggerCoverRender(book.id, page).catch((err) =>
      console.error("Cover render failed:", err)
    );

    res.json({
      cover_url: null,
      cover_source: "page",
      cover_page: page,
      cover_path: null,
    });
  } else {
    res.status(400).json({ error: { code: "validation", message: "Provide an image file or { source: 'page', page: number }" } });
  }
});

// POST /api/books/:id/resume
router.post("/:id/resume", async (req: Request, res: Response) => {
  const page = req.body.page;
  if (typeof page !== "number" || page < 1) {
    res.status(400).json({ error: { code: "validation", message: "Invalid page number" } });
    return;
  }

  const { error } = await supabase
    .from("books")
    .update({ last_opened_page: page, last_opened_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .eq("user_id", req.userId);

  if (error) {
    res.status(500).json({ error: { code: "internal", message: "Failed to update position" } });
    return;
  }

  res.status(204).end();
});

// POST /api/books/:id/tags
router.post("/:id/tags", async (req: Request, res: Response) => {
  const tagId = req.body.tag_id;
  if (!tagId) {
    res.status(400).json({ error: { code: "validation", message: "tag_id is required" } });
    return;
  }

  // Verify book ownership
  const { data: book } = await supabase
    .from("books")
    .select("id")
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .single();

  if (!book) {
    res.status(404).json({ error: { code: "not_found", message: "Book not found" } });
    return;
  }

  const bookId = req.params.id as string;
  await supabase
    .from("book_tags")
    .upsert({ book_id: bookId, tag_id: tagId });

  const tags = await getBookTags(bookId);
  res.json({ tags });
});

// DELETE /api/books/:id/tags/:tagId
router.delete("/:id/tags/:tagId", async (req: Request, res: Response) => {
  const bookId = req.params.id as string;
  const tagIdParam = req.params.tagId as string;
  const { data: book } = await supabase
    .from("books")
    .select("id")
    .eq("id", bookId)
    .eq("user_id", req.userId)
    .single();

  if (!book) {
    res.status(404).json({ error: { code: "not_found", message: "Book not found" } });
    return;
  }

  await supabase
    .from("book_tags")
    .delete()
    .eq("book_id", bookId)
    .eq("tag_id", tagIdParam);

  const tags = await getBookTags(bookId);
  res.json({ tags });
});

// Helpers

async function getBookTags(bookId: string): Promise<Tag[]> {
  const { data } = await supabase
    .from("book_tags")
    .select("tags(*)")
    .eq("book_id", bookId);

  return (data || []).map((bt: Record<string, unknown>) => bt.tags as Tag);
}

async function getBookWithTags(bookId: string): Promise<Book> {
  const { data: book } = await supabase
    .from("books")
    .select("*, book_tags(tag_id, tags(*))")
    .eq("id", bookId)
    .single();

  const bookAny = book as Record<string, unknown>;
  const bookTags = (bookAny?.book_tags as Record<string, unknown>[] | undefined) || [];
  const tags: Tag[] = bookTags.map((bt) => bt.tags as Tag);

  let cover_url: string | null = null;
  if (book?.cover_path) {
    try {
      cover_url = await createSignedDownloadUrl(book.cover_path);
    } catch { /* cover not yet generated */ }
  }

  const { book_tags: _, ...rest } = bookAny;
  return { ...rest, tags, cover_url } as Book;
}

async function triggerExtraction(bookId: string) {
  const workerSecret = process.env.WORKER_SECRET;
  const port = process.env.PORT || 3001;
  await fetch(`http://localhost:${port}/internal/extraction/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Worker-Secret": workerSecret!,
    },
    body: JSON.stringify({ book_id: bookId }),
  });
}

async function triggerCoverRender(bookId: string, page: number) {
  const workerSecret = process.env.WORKER_SECRET;
  const port = process.env.PORT || 3001;
  await fetch(`http://localhost:${port}/internal/extraction/cover`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Worker-Secret": workerSecret!,
    },
    body: JSON.stringify({ book_id: bookId, page }),
  });
}

export default router;
