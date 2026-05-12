import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";

const router = Router();

const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(20).optional(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(20).nullable().optional(),
});

// GET /api/tags
router.get("/", async (req: Request, res: Response) => {
  const { data: tags, error } = await supabase
    .from("tags")
    .select("id, name, color")
    .eq("user_id", req.userId)
    .order("name", { ascending: true });

  if (error) {
    res.status(500).json({ error: { code: "internal", message: "Failed to list tags" } });
    return;
  }

  res.json({ tags: tags || [] });
});

// POST /api/tags
router.post("/", async (req: Request, res: Response) => {
  const parsed = createTagSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  const { data: tag, error } = await supabase
    .from("tags")
    .insert({
      user_id: req.userId,
      name: parsed.data.name,
      color: parsed.data.color || null,
    })
    .select("id, name, color")
    .single();

  if (error) {
    if (error.code === "23505") {
      res.status(409).json({ error: { code: "conflict", message: "Tag with this name already exists" } });
      return;
    }
    res.status(500).json({ error: { code: "internal", message: "Failed to create tag" } });
    return;
  }

  res.status(201).json(tag);
});

// PATCH /api/tags/:id
router.patch("/:id", async (req: Request, res: Response) => {
  const parsed = updateTagSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.color !== undefined) updateData.color = parsed.data.color;

  const { data: tag, error } = await supabase
    .from("tags")
    .update(updateData)
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .select("id, name, color")
    .single();

  if (error) {
    if (error.code === "23505") {
      res.status(409).json({ error: { code: "conflict", message: "Tag with this name already exists" } });
      return;
    }
    res.status(500).json({ error: { code: "internal", message: "Failed to update tag" } });
    return;
  }

  if (!tag) {
    res.status(404).json({ error: { code: "not_found", message: "Tag not found" } });
    return;
  }

  res.json(tag);
});

// DELETE /api/tags/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.userId);

  if (error) {
    res.status(500).json({ error: { code: "internal", message: "Failed to delete tag" } });
    return;
  }

  res.status(204).end();
});

export default router;
