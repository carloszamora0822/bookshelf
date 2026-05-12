import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";

const router = Router();

const createNoteSchema = z.object({
  page_number: z.number().int().positive(),
  body: z.string().min(1).max(10000),
});

const updateNoteSchema = z.object({
  body: z.string().min(1).max(10000),
});

// GET /api/books/:bookId/notes
router.get("/books/:bookId/notes", async (req: Request, res: Response) => {
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

  let query = supabase
    .from("notes")
    .select("id, page_number, body, created_at, updated_at")
    .eq("book_id", req.params.bookId)
    .eq("user_id", req.userId)
    .order("page_number", { ascending: true })
    .order("created_at", { ascending: true });

  const page = req.query.page as string | undefined;
  if (page) {
    const pageNum = parseInt(page, 10);
    if (!isNaN(pageNum)) {
      query = query.eq("page_number", pageNum);
    }
  }

  const { data: notes, error } = await query;

  if (error) {
    res.status(500).json({ error: { code: "internal", message: "Failed to list notes" } });
    return;
  }

  res.json({ notes: notes || [] });
});

// POST /api/books/:bookId/notes
router.post("/books/:bookId/notes", async (req: Request, res: Response) => {
  const parsed = createNoteSchema.safeParse(req.body);
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

  const { data: note, error } = await supabase
    .from("notes")
    .insert({
      user_id: req.userId,
      book_id: req.params.bookId,
      page_number: parsed.data.page_number,
      body: parsed.data.body,
    })
    .select("id, page_number, body, created_at, updated_at")
    .single();

  if (error) {
    res.status(500).json({ error: { code: "internal", message: "Failed to create note" } });
    return;
  }

  res.status(201).json(note);
});

// PATCH /api/notes/:id
router.patch("/notes/:id", async (req: Request, res: Response) => {
  const parsed = updateNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  const { data: note, error } = await supabase
    .from("notes")
    .update({ body: parsed.data.body })
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .select("id, page_number, body, created_at, updated_at")
    .single();

  if (error || !note) {
    res.status(404).json({ error: { code: "not_found", message: "Note not found" } });
    return;
  }

  res.json(note);
});

// DELETE /api/notes/:id
router.delete("/notes/:id", async (req: Request, res: Response) => {
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.userId);

  if (error) {
    res.status(500).json({ error: { code: "internal", message: "Failed to delete note" } });
    return;
  }

  res.status(204).end();
});

export default router;
