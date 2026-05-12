import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

const router = Router();

const createBookmarkSchema = z.object({
  page_number: z.number().int().positive(),
  label: z.string().max(500).optional(),
});

const updateBookmarkSchema = z.object({
  label: z.string().max(500).nullable().optional(),
});

// GET /api/books/:bookId/bookmarks
router.get("/books/:bookId/bookmarks", async (req: Request, res: Response) => {
  const { data: book } = await supabase
    .from("books")
    .select("id")
    .eq("id", req.params.bookId)
    .eq("user_id", req.userId)
    .single();

  if (!book) {
    res.status(404).json({ error: { code: "not_found", message: "Book not found" } });
    return;
  }

  const { data: bookmarks, error } = await supabase
    .from("bookmarks")
    .select("id, page_number, label, created_at")
    .eq("book_id", req.params.bookId)
    .eq("user_id", req.userId)
    .order("page_number", { ascending: true });

  if (error) {
    res.status(500).json({ error: { code: "internal", message: "Failed to list bookmarks" } });
    return;
  }

  res.json({ bookmarks: bookmarks || [] });
});

// POST /api/books/:bookId/bookmarks
router.post("/books/:bookId/bookmarks", async (req: Request, res: Response) => {
  const parsed = createBookmarkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  const { data: book } = await supabase
    .from("books")
    .select("id")
    .eq("id", req.params.bookId)
    .eq("user_id", req.userId)
    .single();

  if (!book) {
    res.status(404).json({ error: { code: "not_found", message: "Book not found" } });
    return;
  }

  const { data: bookmark, error } = await supabase
    .from("bookmarks")
    .insert({
      user_id: req.userId,
      book_id: req.params.bookId,
      page_number: parsed.data.page_number,
      label: parsed.data.label || null,
    })
    .select("id, page_number, label, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      res.status(409).json({ error: { code: "conflict", message: "Bookmark already exists for this page" } });
      return;
    }
    res.status(500).json({ error: { code: "internal", message: "Failed to create bookmark" } });
    return;
  }

  res.status(201).json(bookmark);
});

// PATCH /api/bookmarks/:id
router.patch("/bookmarks/:id", async (req: Request, res: Response) => {
  const parsed = updateBookmarkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  const { data: bookmark, error } = await supabase
    .from("bookmarks")
    .update({ label: parsed.data.label ?? null })
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .select("id, page_number, label, created_at")
    .single();

  if (error || !bookmark) {
    res.status(404).json({ error: { code: "not_found", message: "Bookmark not found" } });
    return;
  }

  res.json(bookmark);
});

// DELETE /api/bookmarks/:id
router.delete("/bookmarks/:id", async (req: Request, res: Response) => {
  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.userId);

  if (error) {
    res.status(500).json({ error: { code: "internal", message: "Failed to delete bookmark" } });
    return;
  }

  res.status(204).end();
});

export default router;
