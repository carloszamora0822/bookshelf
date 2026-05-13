// PDF thumbnail rendering — used by upload + detail cover pickers.
//
// `usePdfDoc(source)` loads a PDF from a File/Blob or URL and returns a
// pdf.js document proxy. `<PdfPageThumb doc page />` lazy-renders a single
// page to a canvas when it scrolls into view.

import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// File/Blob → pdf doc cache (so re-mounts during a single upload session
// don't re-parse the whole PDF).
const fileDocCache = new WeakMap();
const urlDocCache = new Map();

async function loadPdfDoc(source) {
  if (!source) return null;
  if (typeof source === "string") {
    const cached = urlDocCache.get(source);
    if (cached) return cached;
    const promise = pdfjsLib.getDocument({ url: source }).promise;
    urlDocCache.set(source, promise);
    try {
      return await promise;
    } catch (err) {
      urlDocCache.delete(source);
      throw err;
    }
  }
  if (fileDocCache.has(source)) return fileDocCache.get(source);
  const buf = await source.arrayBuffer();
  const promise = pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  fileDocCache.set(source, promise);
  try {
    return await promise;
  } catch (err) {
    fileDocCache.delete(source);
    throw err;
  }
}

function usePdfDoc(source) {
  const [state, setState] = useState({ doc: null, error: null, loading: !!source });

  useEffect(() => {
    let cancelled = false;
    if (!source) {
      setState({ doc: null, error: null, loading: false });
      return;
    }
    setState({ doc: null, error: null, loading: true });
    loadPdfDoc(source)
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
  }, [source]);

  return state;
}

// Renders a single page to a <canvas>. Defers actual rasterisation until
// the element is within ~200px of the viewport — important because the
// cover picker may show hundreds of pages.
function PdfPageThumb({ doc, page, ratio = 2 / 3 }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(false);
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

  return (
    <div
      ref={wrapRef}
      style={{
        width: "100%",
        aspectRatio: String(ratio),
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
}

Object.assign(window, { usePdfDoc, PdfPageThumb, loadPdfDoc });
