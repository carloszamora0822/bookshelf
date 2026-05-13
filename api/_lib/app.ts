import express from "express";
import cors from "cors";
import { requireAuth } from "./middleware/auth.js";
import booksRouter from "./routes/books.js";
import bookmarksRouter from "./routes/bookmarks.js";
import notesRouter from "./routes/notes.js";
import tagsRouter from "./routes/tags.js";
import preferencesRouter from "./routes/preferences.js";
import outlineRouter from "./routes/outline.js";
import extractionRouter from "./routes/extraction.js";

const app = express();

app.use(cors({
  origin: (_origin, cb) => cb(null, true), // same-origin in prod via Vercel rewrites; reflective in dev
  credentials: true,
}));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    env: {
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      SUPABASE_STORAGE_BUCKET: Boolean(process.env.SUPABASE_STORAGE_BUCKET),
      WORKER_SECRET: Boolean(process.env.WORKER_SECRET),
    },
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    env: {
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      SUPABASE_STORAGE_BUCKET: Boolean(process.env.SUPABASE_STORAGE_BUCKET),
      WORKER_SECRET: Boolean(process.env.WORKER_SECRET),
    },
  });
});

app.use("/internal/extraction", extractionRouter);

app.use("/api/books", requireAuth, booksRouter);
app.use("/api", requireAuth, bookmarksRouter);
app.use("/api", requireAuth, notesRouter);
app.use("/api/tags", requireAuth, tagsRouter);
app.use("/api/preferences", requireAuth, preferencesRouter);
app.use("/api", requireAuth, outlineRouter);

// Fallback JSON 404 so we don't accidentally return HTML from Vercel for unmatched API paths
app.use((req, res) => {
  res.status(404).json({
    error: { code: "not_found", message: `No handler for ${req.method} ${req.path}` },
  });
});

export default app;
