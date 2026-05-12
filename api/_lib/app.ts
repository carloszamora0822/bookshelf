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
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/internal/extraction", extractionRouter);

app.use("/api/books", requireAuth, booksRouter);
app.use("/api", requireAuth, bookmarksRouter);
app.use("/api", requireAuth, notesRouter);
app.use("/api/tags", requireAuth, tagsRouter);
app.use("/api/preferences", requireAuth, preferencesRouter);
app.use("/api", requireAuth, outlineRouter);

export default app;
