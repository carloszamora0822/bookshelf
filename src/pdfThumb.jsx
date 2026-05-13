// PDF thumbnail rendering — used by upload + detail cover pickers.
//
// `usePdfDoc(source)` loads a PDF from a File/Blob or URL and returns a
// pdf.js document proxy. `<PdfPageThumb doc page />` lazy-renders a single
// page to a canvas when it scrolls into view.

import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// In-session caches. Keyed by either an opaque cacheKey (preferred: stable
// across signed-URL rotations) or by the source itself.
const fileDocCache = new WeakMap();   // File/Blob → Promise<doc>
const keyedDocCache = new Map();      // string cacheKey → Promise<doc>
const urlDocCache = new Map();        // raw URL → Promise<doc>

async function loadPdfDoc(source, cacheKey) {
  if (!source) return null;

  if (cacheKey) {
    const cached = keyedDocCache.get(cacheKey);
    if (cached) return cached;
  }

  if (typeof source === "string") {
    if (!cacheKey) {
      const cached = urlDocCache.get(source);
      if (cached) return cached;
    }
    const promise = pdfjsLib.getDocument({ url: source }).promise;
    if (cacheKey) keyedDocCache.set(cacheKey, promise);
    else urlDocCache.set(source, promise);
    try {
      return await promise;
    } catch (err) {
      if (cacheKey) keyedDocCache.delete(cacheKey);
      else urlDocCache.delete(source);
      throw err;
    }
  }

  if (!cacheKey && fileDocCache.has(source)) return fileDocCache.get(source);
  const buf = await source.arrayBuffer();
  const promise = pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  if (cacheKey) keyedDocCache.set(cacheKey, promise);
  else fileDocCache.set(source, promise);
  try {
    return await promise;
  } catch (err) {
    if (cacheKey) keyedDocCache.delete(cacheKey);
    else fileDocCache.delete(source);
    throw err;
  }
}

// usePdfDoc(source, cacheKey?)
// cacheKey lets you dedupe by something stable (e.g., book.filePath) so a
// fresh signed URL on every hydrate still hits the in-memory cache.
function usePdfDoc(source, cacheKey) {
  const [state, setState] = useState({ doc: null, error: null, loading: !!source });

  useEffect(() => {
    let cancelled = false;
    if (!source) {
      setState({ doc: null, error: null, loading: false });
      return;
    }
    // If we already have a doc for this cacheKey, the loadPdfDoc call
    // resolves synchronously next tick — no need to flash "loading".
    const cached = cacheKey ? keyedDocCache.get(cacheKey) : null;
    setState({ doc: null, error: null, loading: !cached });
    loadPdfDoc(source, cacheKey)
      .then(doc => {
        if (!cancelled) setState({ doc, error: null, loading: false });
      })
      .catch(err => {
        if (!cancelled) {
          console.error("[pdfThumb] failed to load PDF:", err);
          setState({ doc: null, error: err, loading: false });
        }
      });
    return () => { cancelled = true; };
  }, [source, cacheKey]);

  return state;
}

// Render a single PDF page to a Blob (defaults to JPEG, sized for a cover).
// Used by the upload + detail flows so cover generation can happen
// client-side, bypassing node-canvas on Vercel entirely.
async function renderPdfPageToBlob(doc, pageNum, opts = {}) {
  const { type = "image/jpeg", quality = 0.92, maxWidth = 1200 } = opts;
  const page = await doc.getPage(pageNum);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(maxWidth / base.width, 3);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;
  return await new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error("toBlob returned null"))), type, quality);
  });
}

// Renders a single page to a <canvas>. Defers actual rasterisation until
// the element is within ~200px of the viewport — important because the
// cover picker may show hundreds of pages.
//
// ratio: if numeric, the wrapper enforces that aspect ratio (good for grids).
//        if null, the wrapper takes full width AND full height of its parent
//        (good for the reader, which sets its own page dimensions).
// eager: skip IntersectionObserver and render immediately (reader pages).
const PdfPageThumb = React.memo(function PdfPageThumb({ doc, page, ratio = 2 / 3, eager = false }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(eager);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = wrapRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
          break;
        }
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!doc || !visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let task = null;
    let pageProxy = null;

    (async () => {
      try {
        pageProxy = await doc.getPage(page);
        if (cancelled) return;

        const cssWidth = canvas.parentElement?.clientWidth || 120;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const base = pageProxy.getViewport({ scale: 1 });
        const scale = (cssWidth * dpr) / base.width;
        const viewport = pageProxy.getViewport({ scale });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = "100%";
        canvas.style.height = "100%";

        const ctx = canvas.getContext("2d");
        task = pageProxy.render({ canvasContext: ctx, viewport });
        await task.promise;
        if (!cancelled) setRendered(true);
      } catch (err) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("[pdfThumb] render failed", err);
        }
      }
    })();

    return () => {
      cancelled = true;
      try { task?.cancel(); } catch {}
      try { pageProxy?.cleanup?.(); } catch {}
    };
  }, [doc, page, visible]);

  const wrapStyle = ratio
    ? { width: "100%", aspectRatio: String(ratio) }
    : { width: "100%", height: "100%" };

  return (
    <div
      ref={wrapRef}
      style={{
        ...wrapStyle,
        background: "var(--bg)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {!rendered && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink-4)", fontFamily: "var(--mono)", fontSize: 10,
          letterSpacing: "0.04em",
        }}>
          {visible ? "…" : ""}
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          display: "block", width: "100%", height: "100%",
          opacity: rendered ? 1 : 0,
          transition: "opacity 180ms ease-out",
        }}
      />
    </div>
  );
});

Object.assign(window, { usePdfDoc, PdfPageThumb, loadPdfDoc, renderPdfPageToBlob });
