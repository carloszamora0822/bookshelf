import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

const router = Router();

const updatePrefsSchema = z.object({
  theme: z.enum(["system", "light", "dark"]).optional(),
  default_page_mode: z.enum(["horizontal", "vertical"]).optional(),
});

// GET /api/preferences
router.get("/", async (req: Request, res: Response) => {
  const { data: prefs, error } = await supabase
    .from("user_preferences")
    .select("theme, default_page_mode")
    .eq("user_id", req.userId)
    .single();

  if (error || !prefs) {
    // Return defaults if row doesn't exist yet
    res.json({ theme: "system", default_page_mode: "horizontal" });
    return;
  }

  res.json(prefs);
});

// PATCH /api/preferences
router.patch("/", async (req: Request, res: Response) => {
  const parsed = updatePrefsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  const { data: prefs, error } = await supabase
    .from("user_preferences")
    .update(parsed.data)
    .eq("user_id", req.userId)
    .select("theme, default_page_mode")
    .single();

  if (error || !prefs) {
    res.status(500).json({ error: { code: "internal", message: "Failed to update preferences" } });
    return;
  }

  res.json(prefs);
});

export default router;
