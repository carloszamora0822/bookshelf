// Upload flow — file → metadata → cover

function UploadSheet({ open, onClose }) {
  const app = useApp();
  const [step, setStep] = useState("file");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [draft, setDraft] = useState(blankDraft());

  useEffect(() => {
    if (open) {
      setStep("file");
      setUploading(false);
      setProgress(0);
      setDraft(blankDraft());
    }
  }, [open]);

  const simulateUpload = (filename) => {
    setUploading(true);
    setProgress(0);
    const title = filename.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
    setDraft(d => ({ ...d, filename, title, pageCount: 142 + Math.floor(Math.random() * 200) }));
    const t = setInterval(() => {
      setProgress(p => {
        const next = p + 6 + Math.random() * 14;
        if (next >= 100) { clearInterval(t); setUploading(false); setStep("meta"); return 100; }
        return next;
      });
    }, 120);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Add a book">
      {step === "file" && !uploading && <FileStep onPick={simulateUpload} onClose={onClose} />}
      {uploading && <UploadingStep filename={draft.filename} progress={progress} />}
      {step === "meta" && (
        <MetaStep
          draft={draft}
          setDraft={setDraft}
          tags={app.tags}
          onCreateTag={(name) => {
            const id = `t-${Date.now()}`;
            app.addTag({ id, name, color: pickTagColor(app.tags.length) });
            return id;
          }}
          onPickCoverPage={() => setStep("cover-page")}
          onUploadCover={() => setDraft(d => ({ ...d, coverMode: "upload" }))}
          onSave={() => { app.confirmUpload(draft); onClose(); }}
          onCancel={onClose}
        />
      )}
      {step === "cover-page" && <CoverPageStep draft={draft} setDraft={setDraft} onBack={() => setStep("meta")} />}
    </BottomSheet>
  );
}

function blankDraft() {
  return {
    filename: "",
    title: "",
    author: "",
    tagIds: [],
    coverMode: "page",
    coverPage: 1,
    pageCount: 0,
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
          onPick(file ? file.name : "Manuscript.pdf");
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
          onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f.name); }}
        />
      </div>

      <div style={{ marginTop: 16, color: "var(--ink-4)", fontSize: 12.5, lineHeight: 1.55 }}>
        Files are stored privately in your account. Only you can see them.
      </div>

      <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", gap: 8 }}>
        <PrimaryBtn variant="ghost" onClick={() => onPick("Walden.pdf")}>Use demo file</PrimaryBtn>
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

function MetaStep({ draft, setDraft, tags, onCreateTag, onPickCoverPage, onUploadCover, onSave, onCancel }) {
  const [newTag, setNewTag] = useState("");
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
          }}>page {draft.coverPage}</div>
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
              hint="JPG or PNG"
              onClick={onUploadCover}
            />
          </div>
        </div>
      </Field>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
        <PrimaryBtn variant="ghost" onClick={onCancel}>Cancel</PrimaryBtn>
        <PrimaryBtn variant="accent" onClick={onSave}>Add to library</PrimaryBtn>
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
  const pages = genThumbStrip(null, 12);
  return (
    <div>
      <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ padding: "5px 10px" }}>
        <Icons.ArrowLeft size={14} /> Back
      </button>
      <div style={{ fontFamily: "var(--display)", fontSize: 22, marginTop: 12, color: "var(--ink)", letterSpacing: "-0.012em", fontVariationSettings: '"opsz" 36, "SOFT" 60' }}>
        Pick a cover page
      </div>
      <div style={{ color: "var(--ink-3)", fontSize: 13.5, marginTop: 4 }}>
        Tap any page to use it as the cover.
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(86px, 1fr))",
        gap: 14, marginTop: 22,
      }}>
        {pages.map(p => {
          const active = draft.coverPage === p.page;
          return (
            <button
              key={p.page}
              onClick={() => setDraft(d => ({ ...d, coverPage: p.page, coverMode: "page" }))}
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
                <FakePageThumb num={p.page} />
                {active && (
                  <div style={{
                    position: "absolute", top: 6, right: 6,
                    width: 20, height: 20, borderRadius: 999,
                    background: "var(--accent)", color: "white",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}><Icons.Check size={12} /></div>
                )}
              </div>
              <div className="mono muted-2" style={{ marginTop: 6, fontSize: 10.5 }}>p. {p.page}</div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end" }}>
        <PrimaryBtn variant="accent" onClick={onBack}>Done</PrimaryBtn>
      </div>
    </div>
  );
}

function FakePageThumb({ num }) {
  return (
    <div style={{
      width: "100%", height: "100%", padding: "10% 12%",
      display: "flex", flexDirection: "column", gap: 1.6,
    }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{
          height: 1.4, borderRadius: 1,
          background: "var(--ink-3)",
          opacity: i === 0 ? 0.55 : 0.22,
          width: i === 0 ? "50%" : (i === 9 ? "70%" : `${78 + ((i * 13) % 22)}%`),
        }} />
      ))}
      <div style={{ flex: 1 }} />
      <div className="mono" style={{ fontSize: 6, color: "var(--ink-4)", textAlign: "center" }}>{num}</div>
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
