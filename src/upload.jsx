// Upload flow — file → metadata → cover
import { books } from "./api.js";

function UploadSheet({ open, onClose }) {
  const app = useApp();
  const [step, setStep] = useState("file");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState(blankDraft());

  useEffect(() => {
    if (open) {
      setStep("file");
      setUploading(false);
      setProgress(0);
      setSubmitting(false);
      setDraft(blankDraft());
    }
  }, [open]);

  // Revoke object URLs we created for cover previews when component unmounts
  // or when the preview URL is replaced.
  useEffect(() => {
    return () => {
      if (draft.coverPreviewUrl) {
        try { URL.revokeObjectURL(draft.coverPreviewUrl); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePickedFile = (file) => {
    const filename = file.name || "Manuscript.pdf";
    const title = filename
      .replace(/\.pdf$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    setDraft(d => ({ ...d, file, filename, title }));
    setStep("meta");
  };

  const handleSave = async () => {
    if (submitting) return;
    if (!draft.file) {
      app.showToast?.("Upload failed — no file selected");
      return;
    }
    setSubmitting(true);
    setUploading(true);
    setProgress(0);
    try {
      // 1. Request signed URL
      const { upload_url, file_path } = await books.uploadUrl({
        filename: draft.file.name,
        size_bytes: draft.file.size,
      });

      // 2. Upload the file with progress callback.
      // Prefer API client; if it doesn't expose progress, the callback simply
      // never fires and we'll just see the indeterminate-ish UI complete on resolve.
      await books.uploadFile(upload_url, draft.file, (p) => {
        const pct = typeof p === "number"
          ? p
          : (p && p.loaded && p.total ? (p.loaded / p.total) * 100 : 0);
        if (Number.isFinite(pct)) setProgress(Math.max(0, Math.min(100, pct)));
      });
      setProgress(100);

      // 3. Create the book record AND render the cover blob in parallel.
      // The cover render doesn't need book.id (only the upload needs it),
      // so we can rasterize the page while the server is busy storing the
      // book row + extracting metadata.
      const coverFilePromise = (async () => {
        if (draft.coverMode === "upload" && draft.coverImageFile) {
          return draft.coverImageFile;
        }
        const doc = await window.loadPdfDoc(draft.file);
        const blob = await window.renderPdfPageToBlob(doc, draft.coverPage || 1);
        return new File([blob], `cover-page-${draft.coverPage || 1}.jpg`, { type: blob.type });
      })();

      const book = await books.create({
        title: draft.title,
        author: draft.author || null,
        file_path,
        file_size_bytes: draft.file.size,
        tag_ids: draft.tagIds,
      });

      // 4. Upload the rendered cover. Avoids node-canvas on Vercel — the
      // /cover file branch uses sharp for resize + WebP, which works fine.
      let coverResp = null;
      try {
        const coverFile = await coverFilePromise;
        coverResp = await books.cover(book.id, coverFile);
      } catch (err) {
        // Don't block the upload over a cover failure — the book is usable.
        console.error("Cover render failed:", err);
        app.showToast?.("Book added — cover render failed, edit it from the book page");
      }

      // 5. Hand back to app. /cover returns only cover-related fields, so
      // merge them into the full create-response book.
      const merged = coverResp ? { ...book, ...coverResp } : book;
      app.confirmUpload(merged);
      onClose();
    } catch (err) {
      const message = (err && (err.message || err.error)) || String(err) || "Unknown error";
      app.showToast?.(`Upload failed — ${message}`);
      setUploading(false);
      setProgress(0);
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Add a book">
      {step === "file" && !uploading && (
        <FileStep onPick={handlePickedFile} onClose={onClose} />
      )}
      {uploading && <UploadingStep filename={draft.filename} progress={progress} />}
      {step === "meta" && !uploading && (
        <MetaStep
          draft={draft}
          setDraft={setDraft}
          tags={app.tags}
          submitting={submitting}
          onCreateTag={(name) => {
            const id = `t-${Date.now()}`;
            app.addTag({ id, name, color: pickTagColor(app.tags.length) });
            return id;
          }}
          onPickCoverPage={() => setStep("cover-page")}
          onUploadCover={(file, previewUrl) => {
            setDraft(d => {
              if (d.coverPreviewUrl && d.coverPreviewUrl !== previewUrl) {
                try { URL.revokeObjectURL(d.coverPreviewUrl); } catch {}
              }
              return { ...d, coverMode: "upload", coverImageFile: file, coverPreviewUrl: previewUrl };
            });
          }}
          onSave={handleSave}
          onCancel={onClose}
        />
      )}
      {step === "cover-page" && (
        <CoverPageStep draft={draft} setDraft={setDraft} onBack={() => setStep("meta")} />
      )}
    </BottomSheet>
  );
}

function blankDraft() {
  return {
    file: null,
    filename: "",
    title: "",
    author: "",
    tagIds: [],
    coverMode: "page",
    coverPage: 1,
    coverImageFile: null,
    coverPreviewUrl: null,
  };
}

function pickTagColor(i) {
  const palette = ["#A0826D", "#7C8E73", "#9B7B89", "#7B8FA0", "#C09A6B", "#8B7B9B"];
  return palette[i % palette.length];
}

// ─────────────── File step ───────────────

function FileStep({ onPick, onClose }) {
  const fileInput = useRef(null);
  const [hover, setHover] = useState(false);
  return (
    <div>
      <div
        onClick={() => fileInput.current?.click()}
        style={{
          border: `1.5px dashed ${hover ? "var(--accent)" : "var(--line)"}`,
          borderRadius: 18,
          background: hover ? "var(--accent-soft)" : "var(--bg-sunk)",
          padding: "48px 24px",
          textAlign: "center",
          cursor: "pointer",
          transition: "background var(--tx-fast), border-color var(--tx-fast)",
        }}
        onDragOver={e => { e.preventDefault(); setHover(true); }}
        onDragLeave={() => setHover(false)}
        onDrop={e => {
          e.preventDefault();
          setHover(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onPick(file);
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 999,
          background: "var(--bg-elev)", border: "1px solid var(--line)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink-2)",
        }}>
          <Icons.Upload size={22} />
        </div>
        <div style={{
          marginTop: 16,
          fontFamily: "var(--display)", fontSize: 22, fontWeight: 400,
          letterSpacing: "-0.015em", color: "var(--ink)",
          fontVariationSettings: '"opsz" 36, "SOFT" 60',
        }}>
          Drop a PDF here
        </div>
        <div style={{ marginTop: 6, fontSize: 13.5, color: "var(--ink-3)" }}>
          or click to choose — up to 100 MB
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); }}
        />
      </div>

      <div style={{ marginTop: 16, color: "var(--ink-4)", fontSize: 12.5, lineHeight: 1.55 }}>
        Files are stored privately in your account. Only you can see them.
      </div>

      <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", gap: 8 }}>
        <PrimaryBtn variant="ghost" onClick={() => {
          const demo = new File(
            [new Blob(["%PDF-1.4\n"], { type: "application/pdf" })],
            "Walden.pdf",
            { type: "application/pdf" }
          );
          onPick(demo);
        }}>Use demo file</PrimaryBtn>
        <PrimaryBtn variant="ghost" onClick={onClose}>Cancel</PrimaryBtn>
      </div>
    </div>
  );
}

// ─────────────── Uploading step ───────────────

function UploadingStep({ filename, progress }) {
  return (
    <div style={{ padding: "6px 0 8px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "16px", background: "var(--bg-sunk)",
        border: "1px solid var(--line)", borderRadius: 14,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: "var(--bg-elev)", border: "1px solid var(--line)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink-2)",
        }}>
          <Icons.File size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--sans)", fontSize: 14, fontWeight: 500,
            color: "var(--ink)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{filename}</div>
          <div style={{ marginTop: 8, height: 4, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent)", transition: "width 120ms linear" }} />
          </div>
        </div>
        <div className="mono muted" style={{ fontSize: 12 }}>{Math.round(progress)}%</div>
      </div>
      <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--ink-4)", fontFamily: "var(--mono)", letterSpacing: "0.04em" }}>
        Uploading to private storage…
      </div>
    </div>
  );
}

// ─────────────── Meta step ───────────────

function MetaStep({ draft, setDraft, tags, submitting, onCreateTag, onPickCoverPage, onUploadCover, onSave, onCancel }) {
  const [newTag, setNewTag] = useState("");
  const coverFileInput = useRef(null);
  const { doc: previewDoc } = usePdfDoc(draft.coverMode === "page" ? draft.file : null);

  const triggerCoverPicker = () => {
    coverFileInput.current?.click();
  };

  const handleCoverFileChange = (e) => {
    const file = e.target.files?.[0];
    // Reset input so picking the same file twice still fires onChange
    e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    onUploadCover(file, url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <Field label="Title">
        <input
          autoFocus
          className="input"
          value={draft.title}
          onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
        />
      </Field>

      <Field label="Author" hint="Optional">
        <input
          className="input"
          value={draft.author}
          onChange={e => setDraft(d => ({ ...d, author: e.target.value }))}
          placeholder="—"
        />
      </Field>

      <Field label="Tags" hint="Tap to toggle">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {tags.map(t => (
            <TagPill
              key={t.id}
              tag={t}
              active={draft.tagIds.includes(t.id)}
              onClick={() => setDraft(d => ({
                ...d,
                tagIds: d.tagIds.includes(t.id) ? d.tagIds.filter(x => x !== t.id) : [...d.tagIds, t.id],
              }))}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            className="input"
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && newTag.trim()) {
                const id = onCreateTag(newTag.trim());
                setDraft(d => ({ ...d, tagIds: [...d.tagIds, id] }));
                setNewTag("");
              }
            }}
            placeholder="New tag…"
            style={{ flex: 1 }}
          />
          <PrimaryBtn variant="ghost" onClick={() => {
            if (!newTag.trim()) return;
            const id = onCreateTag(newTag.trim());
            setDraft(d => ({ ...d, tagIds: [...d.tagIds, id] }));
            setNewTag("");
          }}>Add</PrimaryBtn>
        </div>
      </Field>

      <Field label="Cover">
        <div style={{ display: "flex", gap: 14, marginTop: 6, alignItems: "stretch" }}>
          <div style={{
            width: 76, aspectRatio: "2/3",
            borderRadius: 4,
            background: "var(--bg-sunk)", border: "1px solid var(--line)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--ink-4)", fontFamily: "var(--mono)", fontSize: 10,
            textAlign: "center", letterSpacing: "0.04em",
            flexShrink: 0,
            overflow: "hidden",
          }}>
            {draft.coverMode === "upload" && draft.coverPreviewUrl ? (
              <img
                src={draft.coverPreviewUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : previewDoc ? (
              <PdfPageThumb doc={previewDoc} page={draft.coverPage} />
            ) : (
              <span>page {draft.coverPage}</span>
            )}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <CoverOption
              active={draft.coverMode === "page" && draft.coverPage === 1}
              label="First page"
              hint="Use page 1"
              onClick={() => setDraft(d => ({ ...d, coverMode: "page", coverPage: 1 }))}
            />
            <CoverOption
              active={draft.coverMode === "page" && draft.coverPage !== 1}
              label="Choose a different page"
              hint="Pick from a thumbnail strip"
              icon={Icons.ArrowRight}
              onClick={onPickCoverPage}
            />
            <CoverOption
              active={draft.coverMode === "upload"}
              label="Upload an image"
              hint={draft.coverImageFile ? draft.coverImageFile.name : "JPG or PNG"}
              onClick={triggerCoverPicker}
            />
            <input
              ref={coverFileInput}
              type="file"
              accept="image/jpeg,image/png"
              style={{ display: "none" }}
              onChange={handleCoverFileChange}
            />
          </div>
        </div>
      </Field>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
        <PrimaryBtn variant="ghost" onClick={onCancel} disabled={submitting}>Cancel</PrimaryBtn>
        <PrimaryBtn variant="accent" onClick={onSave} disabled={submitting}>
          {submitting ? "Adding…" : "Add to library"}
        </PrimaryBtn>
      </div>
    </div>
  );
}

function CoverOption({ active, label, hint, icon: I, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12, textAlign: "left",
      padding: "12px 14px",
      borderRadius: 12,
      background: active ? "var(--accent-soft)" : "var(--bg-sunk)",
      border: `1px solid ${active ? "transparent" : "var(--line)"}`,
      color: active ? "var(--accent-ink)" : "var(--ink-2)",
      transition: "background var(--tx-fast), border-color var(--tx-fast)",
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: 999,
        border: `1.5px solid ${active ? "var(--accent)" : "var(--ink-4)"}`,
        background: active ? "var(--accent)" : "transparent",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {active && <span style={{ width: 6, height: 6, borderRadius: 999, background: "white" }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: active ? "var(--accent-ink)" : "var(--ink-4)", opacity: 0.9, marginTop: 2 }}>{hint}</div>
      </div>
      {I ? <I size={14} /> : null}
    </button>
  );
}

// ─────────────── Cover page picker ───────────────

function CoverPageStep({ draft, setDraft, onBack }) {
  const { doc, loading, error } = usePdfDoc(draft.file);
  const numPages = doc?.numPages || 0;

  return (
    <div>
      <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ padding: "5px 10px" }}>
        <Icons.ArrowLeft size={14} /> Back
      </button>
      <div style={{ fontFamily: "var(--display)", fontSize: 22, marginTop: 12, color: "var(--ink)", letterSpacing: "-0.012em", fontVariationSettings: '"opsz" 36, "SOFT" 60' }}>
        Pick a cover page
      </div>
      <div style={{ color: "var(--ink-3)", fontSize: 13.5, marginTop: 4 }}>
        {loading && "Reading PDF…"}
        {error && "Couldn't read this PDF. Pick page 1 or upload an image instead."}
        {!loading && !error && numPages > 0 && `Tap any page to use it as the cover. ${numPages.toLocaleString()} pages.`}
      </div>
      {numPages > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(86px, 1fr))",
          gap: 14, marginTop: 22,
          maxHeight: "60vh", overflowY: "auto", paddingRight: 4,
        }}>
          {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => {
            const active = draft.coverPage === pageNum;
            return (
              <button
                key={pageNum}
                onClick={() => setDraft(d => ({ ...d, coverPage: pageNum, coverMode: "page" }))}
                style={{ textAlign: "center" }}
              >
                <div style={{
                  aspectRatio: "2/3",
                  background: "var(--bg-sunk)",
                  border: `1.5px solid ${active ? "var(--accent)" : "var(--line)"}`,
                  borderRadius: 4,
                  position: "relative",
                  overflow: "hidden",
                  transition: "border-color var(--tx-fast)",
                }}>
                  <PdfPageThumb doc={doc} page={pageNum} />
                  {active && (
                    <div style={{
                      position: "absolute", top: 6, right: 6,
                      width: 20, height: 20, borderRadius: 999,
                      background: "var(--accent)", color: "white",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}><Icons.Check size={12} /></div>
                  )}
                </div>
                <div className="mono muted-2" style={{ marginTop: 6, fontSize: 10.5 }}>p. {pageNum}</div>
              </button>
            );
          })}
        </div>
      )}
      <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end" }}>
        <PrimaryBtn variant="accent" onClick={onBack}>Done</PrimaryBtn>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <div className="label">{label}</div>
        {hint && <div className="muted-2" style={{ fontSize: 11.5 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

Object.assign(window, { UploadSheet });
