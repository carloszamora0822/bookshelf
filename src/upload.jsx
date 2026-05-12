// Upload flow — bottom sheet with file → metadata → cover steps

function UploadSheet({ open, onClose }) {
  const app = useApp();
  const [step, setStep] = useState("file"); // file | meta | cover-page
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [draft, setDraft] = useState({
    filename: "",
    title: "",
    author: "",
    tagIds: [],
    coverMode: "page", // page | upload
    coverPage: 1,
    pageCount: 0,
  });

  useEffect(() => {
    if (open) {
      setStep("file"); setUploading(false); setProgress(0);
      setDraft({ filename: "", title: "", author: "", tagIds: [], coverMode: "page", coverPage: 1, pageCount: 0 });
    }
  }, [open]);

  // Simulated upload
  const simulateUpload = (filename) => {
    setUploading(true); setProgress(0);
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
    <BottomSheet open={open} onClose={onClose} title="Add a book" maxHeight="92%">
      {step === "file" && !uploading && (
        <FileStep onPick={simulateUpload} onClose={onClose} />
      )}
      {uploading && (
        <UploadingStep filename={draft.filename} progress={progress} />
      )}
      {step === "meta" && (
        <MetaStep
          draft={draft}
          setDraft={setDraft}
          tags={app.tags}
          onCreateTag={(name) => { const id = `t-${Date.now()}`; app.addTag({ id, name, color: "#A0826D" }); return id; }}
          onPickCoverPage={() => setStep("cover-page")}
          onUploadCover={() => setDraft(d => ({ ...d, coverMode: "upload" }))}
          onSave={() => { app.confirmUpload(draft); onClose(); }}
          onCancel={onClose}
        />
      )}
      {step === "cover-page" && (
        <CoverPageStep draft={draft} setDraft={setDraft} onBack={() => setStep("meta")} />
      )}
    </BottomSheet>
  );
}

function FileStep({ onPick, onClose }) {
  const fileInput = useRef(null);
  return (
    <div>
      <div
        onClick={() => fileInput.current?.click()}
        style={{
          border: "1.5px dashed var(--line)", borderRadius: 16,
          background: "var(--bg-sunk)",
          padding: "36px 22px",
          textAlign: "center",
          cursor: "pointer",
        }}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = "var(--accent-soft)"; }}
        onDragLeave={e => { e.currentTarget.style.background = "var(--bg-sunk)"; }}
        onDrop={e => {
          e.preventDefault();
          e.currentTarget.style.background = "var(--bg-sunk)";
          const file = e.dataTransfer.files?.[0];
          if (file) onPick(file.name);
          else onPick("Manuscript.pdf");
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: 999,
          background: "var(--bg-elev)", border: "1px solid var(--line)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink-2)",
        }}>
          <Icons.Upload size={20} />
        </div>
        <div style={{ marginTop: 14, fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)" }}>
          Drag a PDF here
        </div>
        <div style={{ marginTop: 4, fontSize: 12.5, color: "var(--ink-3)" }}>
          or tap to choose — up to 100 MB
        </div>
        <input ref={fileInput} type="file" accept="application/pdf" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f.name); }} />
      </div>

      <div style={{ marginTop: 14, color: "var(--ink-4)", fontSize: 12, lineHeight: 1.55 }}>
        Files are stored privately in your account. Only you can see them.
      </div>

      <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <PrimaryBtn variant="ghost" onClick={onClose}>Cancel</PrimaryBtn>
        <PrimaryBtn onClick={() => onPick("Walden.pdf")}>Use demo file</PrimaryBtn>
      </div>
    </div>
  );
}

function UploadingStep({ filename, progress }) {
  return (
    <div style={{ padding: "6px 0 8px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 16px", background: "var(--bg-sunk)",
        border: "1px solid var(--line)", borderRadius: 12,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 8,
          background: "var(--bg-elev)", border: "1px solid var(--line)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink-2)",
        }}><Icons.File size={18} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 500, color: "var(--ink)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{filename}</div>
          <div style={{
            marginTop: 6, height: 4, borderRadius: 999,
            background: "var(--line)", overflow: "hidden",
          }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent)", transition: "width 120ms linear" }} />
          </div>
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>{Math.round(progress)}%</div>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: "var(--ink-4)", fontFamily: "var(--mono)" }}>
        Uploading to private storage…
      </div>
    </div>
  );
}

function MetaStep({ draft, setDraft, tags, onCreateTag, onPickCoverPage, onUploadCover, onSave, onCancel }) {
  const [newTag, setNewTag] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Field label="Title">
        <input
          value={draft.title}
          onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
          autoFocus
          style={fieldInput()}
        />
      </Field>
      <Field label="Author" hint="Optional">
        <input
          value={draft.author}
          onChange={e => setDraft(d => ({ ...d, author: e.target.value }))}
          placeholder="—"
          style={fieldInput()}
        />
      </Field>

      <Field label="Tags" hint="tap to toggle">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {tags.map(t => (
            <TagPill key={t.id} tag={t}
              active={draft.tagIds.includes(t.id)}
              onClick={() => setDraft(d => ({
                ...d,
                tagIds: d.tagIds.includes(t.id) ? d.tagIds.filter(x => x !== t.id) : [...d.tagIds, t.id],
              }))}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            placeholder="New tag…"
            style={{ ...fieldInput(), flex: 1, fontSize: 13 }}
          />
          <button onClick={() => {
            if (!newTag.trim()) return;
            const id = onCreateTag(newTag.trim());
            setDraft(d => ({ ...d, tagIds: [...d.tagIds, id] }));
            setNewTag("");
          }} style={{
            padding: "0 14px", borderRadius: 10, background: "var(--bg-sunk)", border: "1px solid var(--line)",
            color: "var(--ink-2)", fontSize: 12.5, fontFamily: "var(--sans)", fontWeight: 500,
          }}>Add</button>
        </div>
      </Field>

      <Field label="Cover">
        <div style={{ display: "flex", gap: 12, marginTop: 6, alignItems: "stretch" }}>
          <div style={{
            width: 64, height: 96, borderRadius: 3,
            background: "var(--bg-sunk)", border: "1px solid var(--line)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--ink-4)", fontFamily: "var(--mono)", fontSize: 9, textAlign: "center", letterSpacing: "0.04em",
          }}>page {draft.coverPage}</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <CoverOption active={draft.coverMode === "page"} label="First page" hint={`Use page ${draft.coverPage}`}
              onClick={() => setDraft(d => ({ ...d, coverMode: "page" }))} />
            <CoverOption label="Choose a different page" hint="Pick from a thumbnail strip"
              icon={Icons.ArrowRight}
              onClick={onPickCoverPage} />
            <CoverOption active={draft.coverMode === "upload"} label="Upload an image" hint="JPG or PNG"
              onClick={onUploadCover} />
          </div>
        </div>
      </Field>

      {/* Save row */}
      <div style={{
        marginTop: 6,
        display: "flex", gap: 8, justifyContent: "flex-end",
      }}>
        <PrimaryBtn variant="ghost" onClick={onCancel}>Cancel</PrimaryBtn>
        <PrimaryBtn onClick={onSave}>Add to library</PrimaryBtn>
      </div>
    </div>
  );
}

function CoverOption({ active, label, hint, icon: I, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, textAlign: "left",
      padding: "10px 12px",
      borderRadius: 10,
      background: active ? "var(--accent-soft)" : "var(--bg-sunk)",
      border: `1px solid ${active ? "transparent" : "var(--line)"}`,
      color: active ? "var(--accent-ink)" : "var(--ink-2)",
      cursor: "pointer",
    }}>
      <div style={{
        width: 14, height: 14, borderRadius: 999,
        border: `1.5px solid ${active ? "var(--accent)" : "var(--ink-4)"}`,
        background: active ? "var(--accent)" : "transparent",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {active && <span style={{ width: 5, height: 5, borderRadius: 999, background: "white" }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: active ? "var(--accent-ink)" : "var(--ink-4)", opacity: 0.9, marginTop: 1 }}>{hint}</div>
      </div>
      {I ? <I size={14} /> : null}
    </button>
  );
}

function CoverPageStep({ draft, setDraft, onBack }) {
  const pages = genThumbStrip(null, 12);
  return (
    <div>
      <button onClick={onBack} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 0", color: "var(--ink-3)", fontSize: 12.5, fontFamily: "var(--sans)",
      }}>
        <Icons.ArrowLeft size={14} /> Back
      </button>
      <div style={{ fontFamily: "var(--serif)", fontSize: 18, marginTop: 8, color: "var(--ink)" }}>
        Pick a cover page
      </div>
      <div style={{ color: "var(--ink-3)", fontSize: 12.5, marginTop: 4 }}>
        Tap any page to use it as the cover.
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
        gap: 12, marginTop: 18,
      }}>
        {pages.map(p => {
          const active = draft.coverPage === p.page;
          return (
            <button key={p.page} onClick={() => setDraft(d => ({ ...d, coverPage: p.page, coverMode: "page" }))} style={{
              cursor: "pointer", textAlign: "center",
            }}>
              <div style={{
                aspectRatio: "2/3",
                background: "var(--bg-sunk)",
                border: `1.5px solid ${active ? "var(--accent)" : "var(--line)"}`,
                borderRadius: 3,
                position: "relative",
                overflow: "hidden",
              }}>
                <FakePageThumb num={p.page} />
                {active && (
                  <div style={{
                    position: "absolute", top: 6, right: 6,
                    width: 18, height: 18, borderRadius: 999,
                    background: "var(--accent)", color: "white",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}><Icons.Check size={12} /></div>
                )}
              </div>
              <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>
                p. {p.page}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
        <PrimaryBtn onClick={onBack}>Done</PrimaryBtn>
      </div>
    </div>
  );
}

function FakePageThumb({ num }) {
  // tiny serif page mockup
  return (
    <div style={{
      width: "100%", height: "100%", padding: "10% 12%",
      display: "flex", flexDirection: "column", gap: 1.6,
    }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{
          height: 1.2, borderRadius: 1,
          background: "var(--ink-3)",
          opacity: i === 0 ? 0.55 : 0.22,
          width: i === 0 ? "50%" : (i === 9 ? "70%" : `${78 + ((i * 13) % 22)}%`),
        }} />
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ fontFamily: "var(--mono)", fontSize: 6, color: "var(--ink-4)", textAlign: "center" }}>{num}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "var(--ink-4)" }}>{hint}</div>}
      </div>
      <div style={{ marginTop: 4 }}>{children}</div>
    </div>
  );
}

function fieldInput() {
  return {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 10,
    background: "var(--bg-sunk)",
    border: "1px solid var(--line)",
    color: "var(--ink)",
    fontFamily: "var(--sans)", fontSize: 14, fontWeight: 450,
    outline: "none",
  };
}

Object.assign(window, { UploadSheet });
