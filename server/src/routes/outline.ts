import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase.js";
import type { OutlineEntry } from "../types/index.js";

const router = Router();

// GET /api/books/:bookId/outline
router.get("/books/:bookId/outline", async (req: Request, res: Response) => {
  const { data: book } = await supabase
    .from("books")
    .select("id, has_outline")
    .eq("id", req.params.bookId)
    .eq("user_id", req.userId)
    .single();

  if (!book) {
    res.status(404).json({ error: { code: "not_found", message: "Book not found" } });
    return;
  }

  if (!book.has_outline) {
    res.json({ entries: [] });
    return;
  }

  const { data: entries, error } = await supabase
    .from("book_outline_entries")
    .select("id, parent_id, title, page_number, order_index")
    .eq("book_id", req.params.bookId)
    .order("order_index", { ascending: true });

  if (error) {
    res.status(500).json({ error: { code: "internal", message: "Failed to load outline" } });
    return;
  }

  const tree = buildOutlineTree(entries || []);
  res.json({ entries: tree });
});

type FlatEntry = {
  id: string;
  parent_id: string | null;
  title: string;
  page_number: number | null;
  order_index: number;
};

function buildOutlineTree(flat: FlatEntry[]): OutlineEntry[] {
  const map = new Map<string, OutlineEntry & { _parentId: string | null }>();

  for (const entry of flat) {
    map.set(entry.id, {
      id: entry.id,
      title: entry.title,
      page_number: entry.page_number,
      children: [],
      _parentId: entry.parent_id,
    });
  }

  const roots: OutlineEntry[] = [];

  for (const entry of map.values()) {
    if (entry._parentId && map.has(entry._parentId)) {
      map.get(entry._parentId)!.children.push(entry);
    } else {
      roots.push(entry);
    }
  }

  // Strip internal _parentId field
  function clean(entries: (OutlineEntry & { _parentId?: string | null })[]): OutlineEntry[] {
    return entries.map(({ _parentId, children, ...rest }) => ({
      ...rest,
      children: clean(children as (OutlineEntry & { _parentId?: string | null })[]),
    }));
  }

  return clean(roots);
}

export default router;
