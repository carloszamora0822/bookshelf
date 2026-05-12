import { Router, Request, Response } from "express";
import { requireWorkerSecret } from "../middleware/auth.js";
import { processBook, renderAndUploadCover } from "../services/extraction.js";
import { supabase } from "../supabase.js";
import { downloadFile } from "../services/storage.js";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const router = Router();

// POST /internal/extraction/process
router.post("/process", requireWorkerSecret, async (req: Request, res: Response) => {
  const bookId = req.body.book_id;
  if (!bookId) {
    res.status(400).json({ error: { code: "validation", message: "book_id is required" } });
    return;
  }

  // Process asynchronously — respond immediately
  res.status(202).json({ status: "accepted", book_id: bookId });

  try {
    await processBook(bookId);
    console.log(`Extraction completed for book ${bookId}`);
  } catch (err) {
    console.error(`Extraction failed for book ${bookId}:`, err);
  }
});

// POST /internal/extraction/cover
router.post("/cover", requireWorkerSecret, async (req: Request, res: Response) => {
  const { book_id, page } = req.body;
  if (!book_id || !page) {
    res.status(400).json({ error: { code: "validation", message: "book_id and page are required" } });
    return;
  }

  res.status(202).json({ status: "accepted", book_id, page });

  try {
    const { data: book } = await supabase
      .from("books")
      .select("file_path, user_id")
      .eq("id", book_id)
      .single();

    if (!book) return;

    const pdfBuffer = await downloadFile(book.file_path);
    const pdfData = new Uint8Array(pdfBuffer);
    const pdfDoc = await getDocument({ data: pdfData }).promise;

    await renderAndUploadCover(book_id, book.user_id, pdfDoc, page);
    pdfDoc.destroy();

    console.log(`Cover re-rendered for book ${book_id} page ${page}`);
  } catch (err) {
    console.error(`Cover render failed for book ${book_id}:`, err);
  }
});

export default router;
