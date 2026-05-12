import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFDocumentProxy } from "pdfjs-dist";
import sharp from "sharp";
import { supabase } from "../supabase.js";
import { uploadBuffer, downloadFile } from "./storage.js";

GlobalWorkerOptions.workerSrc = "";

type OutlineItem = {
  title: string;
  dest: string | unknown[] | null;
  items: OutlineItem[];
};

export async function processBook(bookId: string): Promise<void> {
  const { data: book, error: fetchErr } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .single();

  if (fetchErr || !book) {
    throw new Error(`Book not found: ${bookId}`);
  }

  await supabase
    .from("books")
    .update({ extraction_status: "processing" })
    .eq("id", bookId);

  try {
    const pdfBuffer = await downloadFile(book.file_path);
    const pdfData = new Uint8Array(pdfBuffer);
    const pdfDoc = await getDocument({ data: pdfData }).promise;
    const pageCount = pdfDoc.numPages;

    await supabase
      .from("books")
      .update({ page_count: pageCount })
      .eq("id", bookId);

    const pageRows: { book_id: string; page_number: number; text_content: string }[] = [];
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item) => ("str" in item ? (item as { str: string }).str : ""))
        .join(" ");
      pageRows.push({ book_id: bookId, page_number: i, text_content: text });
    }

    if (pageRows.length > 0) {
      const { error: insertErr } = await supabase
        .from("book_pages")
        .upsert(pageRows);
      if (insertErr) console.error("Failed to insert pages:", insertErr);
    }

    const outline = await pdfDoc.getOutline() as OutlineItem[] | null;
    if (outline && outline.length > 0) {
      await insertOutline(bookId, outline, pdfDoc as unknown as PdfDocForOutline, null);
      await supabase
        .from("books")
        .update({ has_outline: true })
        .eq("id", bookId);
    }

    const coverPage = book.cover_page || 1;
    await renderAndUploadCover(bookId, book.user_id, pdfDoc, coverPage);

    await supabase
      .from("books")
      .update({ extraction_status: "completed" })
      .eq("id", bookId);

    pdfDoc.destroy();
  } catch (err) {
    console.error(`Extraction failed for book ${bookId}:`, err);
    await supabase
      .from("books")
      .update({ extraction_status: "failed" })
      .eq("id", bookId);
    throw err;
  }
}

type PdfDocForOutline = {
  getPageIndex: (ref: unknown) => Promise<number>;
  getDestination: (name: string) => Promise<unknown[]>;
};

async function insertOutline(
  bookId: string,
  items: OutlineItem[],
  pdfDoc: PdfDocForOutline,
  parentId: string | null
) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    let pageNumber: number | null = null;
    if (item.dest) {
      try {
        const dest = typeof item.dest === "string"
          ? await pdfDoc.getDestination(item.dest)
          : item.dest;
        if (Array.isArray(dest) && dest[0]) {
          const pageIndex = await pdfDoc.getPageIndex(dest[0]);
          pageNumber = pageIndex + 1;
        }
      } catch {
        // dest resolution can fail for some PDFs
      }
    }

    const { data: entry } = await supabase
      .from("book_outline_entries")
      .insert({
        book_id: bookId,
        parent_id: parentId,
        title: item.title,
        page_number: pageNumber,
        order_index: i,
      })
      .select("id")
      .single();

    if (entry && item.items?.length > 0) {
      await insertOutline(bookId, item.items, pdfDoc, entry.id);
    }
  }
}

export async function renderAndUploadCover(
  bookId: string,
  userId: string,
  pdfDoc: PDFDocumentProxy,
  pageNumber: number
) {
  const page = await pdfDoc.getPage(pageNumber);
  const scale = 2.0;
  const viewport = page.getViewport({ scale });

  const { createCanvas } = await import("canvas");
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");

  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  const pngBuffer = canvas.toBuffer("image/png");
  const webpBuffer = await sharp(pngBuffer)
    .resize(600, 800, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  const coverPath = `${userId}/covers/${bookId}.webp`;
  await uploadBuffer(coverPath, webpBuffer, "image/webp");

  await supabase
    .from("books")
    .update({
      cover_path: coverPath,
      cover_page: pageNumber,
      cover_source: "page",
    })
    .eq("id", bookId);
}
