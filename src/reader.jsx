// Reader — full-bleed reading experience

function Reader({ bookId, startPage }) {
  const app = useApp();
  const book = app.books.find(b => b.id === bookId);
  const desktop = useMediaQuery("(min-width: 900px)");

  const [page, setPage] = useState(startPage || book?.lastOpenedPage || 1);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [pageMode, setPageMode] = useState(app.prefs.defaultPageMode);
  const [brightness, setBrightness] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState(null); // 'notes' | 'toc' | 'bookmarks' | 'jump' | 'brightness'
  const [drafts, setDrafts] = useState({});

  // Load the actual PDF. book.fileUrl arrives after hydrateBook resolves.
  // Cache by book.filePath (stable across signed-URL rotations) so flipping
  // away from the reader and back inside the same session is instant.
  const { doc: pdfDoc, loading: pdfLoading, error: pdfError } = usePdfDoc(
    book?.fileUrl || null,
    book?.filePath || null,
  );
  const totalPages = pdfDoc?.numPages || book?.pageCount || 1;

  // Auto-hide chrome
  const hideTimer = useRef(null);
  const armHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChromeVisible(false), 5000);
  }, []);
  const resetHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    setChromeVisible(true);
    armHide();
  }, [armHide]);
  useEffect(() => {
    armHide();
    return () => clearTimeout(hideTimer.current);
  }, [armHide]);

  // Reveal chrome whenever a side sheet opens or closes, so the user never lands on hidden chrome.
  useEffect(() => {
    resetHide();
  }, [sheet, resetHide]);

  // Persist last page
  useEffect(() => {
    if (book) app.setResume(book.id, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, book?.id]);

  // Keyboard nav
  useEffect(() => {
    if (!book) return;
    const onKey = (e) => {
      if (sheet) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault(); goPage(page + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault(); goPage(page - 1);
      } else if (e.key === "Escape") {
        app.goBack();
      } else if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        app.toggleBookmark(book.id, page);
        resetHide();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, book?.id, sheet]);

  if (!book) return null;

  const isBookmarked = book.bookmarks.some(bm => bm.page === page);
  const notesForPage = book.notes.filter(n => n.page === page);

  const goPage = (n) => {
    const p = Math.max(1, Math.min(totalPages, n));
    setPage(p);
    resetHide();
  };

  return (
    <div className="reader">
      {/* Top chrome */}
      <div className={`reader-chrome-top ${chromeVisible ? "" : "reader-chrome-hidden"}`}>
        <IconButton icon={Icons.ArrowLeft} label="back to library" onClick={app.goBack} />
        <div className="reader-title">{book.title}</div>
        <div style={{ position: "relative" }}>
          <IconButton icon={Icons.More} label="reader menu" onClick={() => { setMenuOpen(o => !o); resetHide(); }} />
          <Menu open={menuOpen} onClose={() => setMenuOpen(false)} anchor="right">
            <MenuItem
              icon={app.prefs.theme === "dark" ? Icons.Sun : Icons.Moon}
              label={app.prefs.theme === "dark" ? "Light theme" : "Dark theme"}
              hint={app.prefs.theme}
              onClick={() => { app.setPrefs({ theme: app.prefs.theme === "dark" ? "light" : "dark" }); setMenuOpen(false); }}
            />
            <MenuItem
              icon={Icons.Brightness}
              label="Brightness"
              hint={`${Math.round(brightness * 100)}%`}
              onClick={() => { setSheet("brightness"); setMenuOpen(false); }}
            />
            <MenuItem
              icon={pageMode === "horizontal" ? Icons.PageMode : Icons.Scroll}
              label={`Page mode: ${pageMode === "horizontal" ? "swipe" : "scroll"}`}
              onClick={() => { setPageMode(m => m === "horizontal" ? "vertical" : "horizontal"); setMenuOpen(false); }}
            />
            <MenuItem icon={Icons.ArrowUpRight} label="Jump to page…" onClick={() => { setSheet("jump"); setMenuOpen(false); }} />
            <div className="menu-divider" />
            <MenuItem
              icon={Icons.Layers}
              label="Table of contents"
              hint={book.hasOutline ? null : "none"}
              onClick={() => { if (book.hasOutline) { setSheet("toc"); setMenuOpen(false); } }}
            />
            <MenuItem icon={Icons.Bookmark} label="Bookmarks" hint={String(book.bookmarks.length)} onClick={() => { setSheet("bookmarks"); setMenuOpen(false); }} />
          </Menu>
        </div>
      </div>

      {/* Page surface */}
      <div className="reader-stage" onClick={(e) => {
        if (e.target.dataset?.pagetap === "1") {
          setChromeVisible(v => !v);
          if (!chromeVisible) resetHide();
        }
      }}>
        {pdfError ? (
          <ReaderError message="Couldn't open this PDF." />
        ) : !pdfDoc ? (
          <ReaderLoading message={pdfLoading ? "Loading book…" : "Preparing…"} />
        ) : pageMode === "horizontal"
          ? <HorizontalPages doc={pdfDoc} pageCount={totalPages} page={page} setPage={goPage} desktop={desktop} />
          : <VerticalPages doc={pdfDoc} pageCount={totalPages} page={page} setPage={goPage} desktop={desktop} />
        }

        {/* Brightness overlay */}
        <div data-pagetap="1" style={{
          position: "absolute", inset: 0,
          background: brightness > 0 ? `rgba(0,0,0,${brightness})` : "transparent",
          transition: "background 200ms ease",
          pointerEvents: "none",
        }} />
      </div>

      {/* Bottom chrome */}
      <div className={`reader-chrome-bot ${chromeVisible ? "" : "reader-chrome-hidden"}`}>
        <PageScrubber pageCount={totalPages} page={page} onChange={goPage} bookmarks={book.bookmarks} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="page-pill">
            {page} <span style={{ color: "var(--ink-4)" }}>/ {totalPages}</span>
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            <IconButton
              icon={isBookmarked ? Icons.BookmarkFill : Icons.Bookmark}
              label={isBookmarked ? "remove bookmark" : "add bookmark"}
              active={isBookmarked}
              onClick={() => { app.toggleBookmark(book.id, page); resetHide(); }}
              title={isBookmarked ? "Remove bookmark (B)" : "Add bookmark (B)"}
            />
            <IconButton
              icon={Icons.Note}
              label="notes for this page"
              badge={notesForPage.length || null}
              onClick={() => { setSheet("notes"); resetHide(); }}
            />
            <IconButton
              icon={Icons.Layers}
              label="contents"
              onClick={() => { setSheet(book.hasOutline ? "toc" : "bookmarks"); resetHide(); }}
            />
            <IconButton
              icon={Icons.Eye}
              label="focus mode"
              onClick={() => { clearTimeout(hideTimer.current); setChromeVisible(false); }}
              title="Focus mode — hide chrome"
            />
          </div>
        </div>
      </div>

      {/* Sheets */}
      {sheet === "notes" && (
        <BottomSheet open={true} onClose={() => setSheet(null)} title={`Notes — page ${page}`}>
          <NotesSheet
            notesForPage={notesForPage}
            draft={drafts[page] || ""}
            setDraft={(v) => setDrafts(d => ({ ...d, [page]: v }))}
            onSave={(body) => {
              if (!body.trim()) return;
              app.addNote(book.id, page, body);
              setDrafts(d => ({ ...d, [page]: "" }));
            }}
            onDelete={(id) => app.deleteNote(book.id, id)}
            onEdit={(id, body) => app.editNote(book.id, id, body)}
          />
        </BottomSheet>
      )}
      {sheet === "toc" && (
        <BottomSheet open={true} onClose={() => setSheet(null)} title="Contents" side={desktop ? null : "right"}>
          <OutlineTree entries={book.outline} onJump={(p) => { goPage(p); setSheet(null); }} currentPage={page} />
        </BottomSheet>
      )}
      {sheet === "bookmarks" && (
        <BottomSheet open={true} onClose={() => setSheet(null)} title="Bookmarks" side={desktop ? null : "right"}>
          <BookmarksList
            bookmarks={book.bookmarks}
            current={page}
            onJump={(p) => { goPage(p); setSheet(null); }}
            onDelete={(id) => app.deleteBookmark(book.id, id)}
            onRelabel={(id, label) => app.editBookmark(book.id, id, label)}
          />
        </BottomSheet>
      )}
      {sheet === "jump" && (
        <BottomSheet open={true} onClose={() => setSheet(null)} title="Jump to page">
          <JumpToPage pageCount={totalPages} current={page} onJump={(p) => { goPage(p); setSheet(null); }} />
        </BottomSheet>
      )}
      {sheet === "brightness" && (
        <BottomSheet open={true} onClose={() => setSheet(null)} title="Brightness">
          <BrightnessControl
            value={brightness}
            onChange={setBrightness}
            theme={app.prefs.theme}
            setTheme={(t) => app.setPrefs({ theme: t })}
          />
        </BottomSheet>
      )}
    </div>
  );
}

// ─────────────── Horizontal page-turn ───────────────

function HorizontalPages({ doc, pageCount, page, setPage, desktop }) {
  const wrapRef = useRef(null);
  const [box, setBox] = useState({ w: 600, h: 800 });
  const [drag, setDrag] = useState(0);
  const startX = useRef(null);
  const widthRef = useRef(0);
  const animRef = useRef(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      widthRef.current = r.width;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // On desktop wide enough — render two-page spread
  const isSpread = desktop && box.w > 980;

  const padTop = 80;
  const padBottom = 110;
  const padX = desktop ? 60 : 18;
  const availW = Math.max(0, box.w - padX * 2);
  const availH = Math.max(0, box.h - padTop - padBottom);

  // Target aspect: 5:7 single, 10:7 (two pages side by side) when spread
  const targetAspect = isSpread ? 10 / 7 : 5 / 7;
  let stageW = Math.min(availW, availH * targetAspect);
  let stageH = stageW / targetAspect;
  if (stageH > availH) { stageH = availH; stageW = stageH * targetAspect; }

  const pageW = isSpread ? (stageW - 16) / 2 : stageW;
  const pageH = stageH;
  const left = (box.w - stageW) / 2;
  const top = padTop + (availH - stageH) / 2;

  const onDown = (e) => {
    cancelAnimationFrame(animRef.current);
    startX.current = e.touches?.[0]?.clientX ?? e.clientX;
  };
  const onMove = (e) => {
    if (startX.current == null) return;
    const x = e.touches?.[0]?.clientX ?? e.clientX;
    const dx = x - startX.current;
    const stepP = isSpread ? 2 : 1;
    if ((page <= 1 && dx > 0) || (page + stepP - 1 >= pageCount && dx < 0)) {
      setDrag(dx * 0.25);
    } else {
      setDrag(dx);
    }
  };
  const onUp = () => {
    if (startX.current == null) return;
    const W = widthRef.current || 1;
    const t = drag / W;
    const stepP = isSpread ? 2 : 1;
    let target = page;
    if (t < -0.18 && page + stepP - 1 < pageCount) target = page + stepP;
    else if (t > 0.18 && page > 1) target = Math.max(1, page - stepP);
    startX.current = null;
    const startDrag = drag;
    const endDrag = target === page ? 0 : (target > page ? -W : W);
    const t0 = performance.now();
    const dur = 240;
    const step = (now) => {
      const u = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - u, 3);
      setDrag(startDrag + (endDrag - startDrag) * e);
      if (u < 1) animRef.current = requestAnimationFrame(step);
      else {
        if (target !== page) setPage(target);
        setDrag(0);
      }
    };
    animRef.current = requestAnimationFrame(step);
  };

  // Render window of pages
  const visiblePages = isSpread
    ? [page - 2, page, page + 2]
    : [page - 1, page, page + 1];

  return (
    <div
      ref={wrapRef}
      data-pagetap="1"
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
      onMouseLeave={() => startX.current != null && onUp()}
      onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
      style={{ position: "absolute", inset: 0, overflow: "hidden", touchAction: "pan-y", cursor: drag !== 0 ? "grabbing" : "grab" }}
    >
      {visiblePages.map(p => {
        if (p < 1 || p > pageCount) return null;
        const offset = (p - page) * (stageW + 32);
        return (
          <div key={p} data-pagetap="1" style={{
            position: "absolute",
            top, left,
            width: stageW, height: stageH,
            transform: `translateX(calc(${offset}px + ${drag}px))`,
            willChange: "transform",
            display: "flex",
            gap: isSpread ? 16 : 0,
          }}>
            <div data-pagetap="1" style={{ width: pageW, height: pageH }}>
              <PdfPage doc={doc} pageNum={p} />
            </div>
            {isSpread && p + 1 <= pageCount && (
              <div data-pagetap="1" style={{ width: pageW, height: pageH }}>
                <PdfPage doc={doc} pageNum={p + 1} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────── Vertical scroll mode ───────────────

function VerticalPages({ doc, pageCount, page, setPage, desktop }) {
  const scrollRef = useRef(null);
  const pageRefs = useRef({});
  const [wrapW, setWrapW] = useState(600);

  useEffect(() => {
    if (!scrollRef.current) return;
    const ro = new ResizeObserver(entries => setWrapW(entries[0].contentRect.width));
    ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (scrollRef.current && pageRefs.current[page]) {
      scrollRef.current.scrollTop = pageRefs.current[page].offsetTop - 80;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = (e) => {
    const top = e.target.scrollTop;
    let nearest = page;
    for (const [p, el] of Object.entries(pageRefs.current)) {
      if (el && el.offsetTop - top - 80 < 0) nearest = Number(p);
    }
    if (nearest !== page) setPage(nearest);
  };

  // Render window
  const range = [];
  for (let p = Math.max(1, page - 3); p <= Math.min(pageCount, page + 3); p++) range.push(p);

  const padX = desktop ? 80 : 22;
  const pageW = Math.max(280, Math.min(720, wrapW - padX * 2));
  const pageH = pageW * 7 / 5;

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      data-pagetap="1"
      style={{
        position: "absolute", inset: 0,
        overflow: "auto",
        padding: desktop ? "90px 0 130px" : "70px 0 130px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 28,
      }}
    >
      {range.map(p => (
        <div
          key={p}
          ref={el => pageRefs.current[p] = el}
          data-pagetap="1"
          style={{ width: pageW, height: pageH, flexShrink: 0 }}
        >
          <PdfPage doc={doc} pageNum={p} />
        </div>
      ))}
    </div>
  );
}

// ─────────────── A rendered PDF page ───────────────

function PdfPage({ doc, pageNum }) {
  return (
    <div className="reader-page-card" data-pagetap="1" style={{
      width: "100%", height: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      <PdfPageThumb doc={doc} page={pageNum} ratio={null} eager />
    </div>
  );
}

function ReaderLoading({ message }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "var(--ink-4)", fontFamily: "var(--mono)", fontSize: 12,
      letterSpacing: "0.04em",
    }}>{message}</div>
  );
}

function ReaderError({ message }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "var(--ink-3)", fontFamily: "var(--serif)", fontStyle: "italic",
      fontSize: 15,
    }}>{message}</div>
  );
}

// ─────────────── Scrubber ───────────────

function PageScrubber({ pageCount, page, onChange, bookmarks }) {
  const ref = useRef(null);
  const dragging = useRef(false);

  const dragTo = useCallback((clientX) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    onChange(Math.max(1, Math.round(u * pageCount)));
  }, [pageCount, onChange]);

  const onDown = (e) => {
    dragging.current = true;
    dragTo(e.touches?.[0]?.clientX ?? e.clientX);
    const move = (ev) => dragging.current && dragTo(ev.touches?.[0]?.clientX ?? ev.clientX);
    const up = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move);
    window.addEventListener("touchend", up);
  };

  const pct = (page - 1) / Math.max(1, pageCount - 1);

  return (
    <div ref={ref} onMouseDown={onDown} onTouchStart={onDown} className="scrubber" role="slider" aria-valuemin={1} aria-valuemax={pageCount} aria-valuenow={page}>
      <div className="track" />
      <div className="fill" style={{ width: `${pct * 100}%` }} />
      {bookmarks.map(bm => (
        <div key={bm.id} className="bm" title={`bookmark p.${bm.page}`}
          style={{ left: `${((bm.page - 1) / Math.max(1, pageCount - 1)) * 100}%` }} />
      ))}
      <div className="thumb" style={{ left: `${pct * 100}%` }} />
    </div>
  );
}

// ─────────────── Notes sheet ───────────────

function NotesSheet({ notesForPage, draft, setDraft, onSave, onDelete, onEdit }) {
  const inputRef = useRef(null);
  return (
    <div>
      {notesForPage.length === 0 && (
        <div style={{ padding: "8px 0 16px", color: "var(--ink-4)", fontSize: 13, fontStyle: "italic", textAlign: "center" }}>
          No notes on this page yet.
        </div>
      )}
      {notesForPage.map(n => (
        <NoteRow key={n.id} note={n} onDelete={() => onDelete(n.id)} onEdit={(body) => onEdit(n.id, body)} />
      ))}
      <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--bg-sunk)", border: "1px solid var(--line)", borderRadius: 12 }}>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Add a note for this page…"
          rows={3}
          style={{
            width: "100%", background: "transparent", border: 0, outline: 0,
            resize: "none", color: "var(--ink)",
            fontFamily: "var(--serif)", fontSize: 15.5, lineHeight: 1.55,
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <span className="mono muted-2" style={{ fontSize: 11 }}>⌘+Enter to save</span>
          <PrimaryBtn variant="accent" onClick={() => { onSave(draft); inputRef.current?.blur(); }}>Save note</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

function NoteRow({ note, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  if (editing) return (
    <div style={{ padding: "14px 0", borderTop: "1px solid var(--line-2)" }}>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={4}
        className="input textarea"
        style={{ width: "100%" }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
        <PrimaryBtn variant="ghost" onClick={() => { setEditing(false); setBody(note.body); }}>Cancel</PrimaryBtn>
        <PrimaryBtn variant="primary" onClick={() => { onEdit(body); setEditing(false); }}>Save</PrimaryBtn>
      </div>
    </div>
  );
  return (
    <div style={{ padding: "14px 0", borderTop: "1px solid var(--line-2)" }}>
      <div style={{ fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.55, color: "var(--ink)", whiteSpace: "pre-wrap" }}>
        {note.body}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <div className="mono muted-2" style={{ fontSize: 11 }}>{note.updatedAt}</div>
        <div style={{ display: "flex", gap: 4 }}>
          <IconButton icon={Icons.Pencil} label="edit note" size={14} onClick={() => setEditing(true)} className="icon-btn-sm" />
          <IconButton icon={Icons.Trash} label="delete note" size={14} onClick={onDelete} className="icon-btn-sm" />
        </div>
      </div>
    </div>
  );
}

// ─────────────── Bookmarks list ───────────────

function BookmarksList({ bookmarks, current, onJump, onDelete }) {
  if (bookmarks.length === 0) {
    return <div style={{ padding: "20px 0", color: "var(--ink-4)", fontStyle: "italic", fontSize: 13 }}>No bookmarks yet.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {bookmarks.slice().sort((a, b) => a.page - b.page).map(bm => {
        const isCurrent = bm.page === current;
        return (
          <div
            key={bm.id}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px",
              background: isCurrent ? "var(--accent-soft)" : "transparent",
              borderRadius: 10,
            }}
          >
            <button
              onClick={() => onJump(bm.page)}
              style={{
                display: "flex", alignItems: "center", gap: 14, flex: 1, textAlign: "left",
              }}
            >
              <div className="page-tag" style={isCurrent ? { background: "var(--accent)", color: "white" } : undefined}>
                {bm.page}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "var(--display)", fontSize: 15,
                  color: "var(--ink)",
                  fontStyle: bm.label ? "normal" : "italic",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  fontVariationSettings: '"opsz" 24, "SOFT" 50',
                }}>
                  {bm.label || `Page ${bm.page}`}
                </div>
                <div className="mono muted-2" style={{ fontSize: 10.5, marginTop: 2 }}>{bm.createdAt}</div>
              </div>
            </button>
            <IconButton icon={Icons.Trash} label="delete bookmark" size={14} onClick={() => onDelete(bm.id)} className="icon-btn-sm" />
          </div>
        );
      })}
    </div>
  );
}

// ─────────────── Jump to page ───────────────

function JumpToPage({ pageCount, current, onJump }) {
  const [val, setVal] = useState(String(current));
  const submit = () => {
    const n = Math.max(1, Math.min(pageCount, parseInt(val || "1", 10)));
    onJump(n);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value.replace(/[^0-9]/g, ""))}
        onKeyDown={e => e.key === "Enter" && submit()}
        type="text"
        inputMode="numeric"
        style={{
          padding: "18px 22px", borderRadius: 14,
          background: "var(--bg-sunk)", border: "1px solid var(--line)",
          fontFamily: "var(--display)", fontSize: 36, fontWeight: 400,
          color: "var(--ink)", outline: 0,
          textAlign: "center", letterSpacing: "-0.015em",
          fontVariationSettings: '"opsz" 96, "SOFT" 40',
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="mono muted-2" style={{ fontSize: 11 }}>of {pageCount}</div>
        <PrimaryBtn variant="accent" onClick={submit}>Go to page</PrimaryBtn>
      </div>
    </div>
  );
}

// ─────────────── Brightness ───────────────

function BrightnessControl({ value, onChange, theme, setTheme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div className="eyebrow">Overlay dimming</div>
          <div className="mono muted-2" style={{ fontSize: 12 }}>{Math.round(value * 100)}%</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icons.Sun size={16} style={{ color: "var(--ink-3)" }} />
          <input
            type="range" min="0" max="55"
            value={value * 100}
            onChange={e => onChange(Number(e.target.value) / 100)}
            style={{ flex: 1, accentColor: "var(--accent)" }}
          />
          <Icons.Moon size={16} style={{ color: "var(--ink-3)" }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-4)", fontStyle: "italic" }}>
          Overlays a soft dim layer on the page. Doesn't change your device brightness.
        </div>
      </div>
      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Theme</div>
        <Segmented
          value={theme}
          onChange={setTheme}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light", icon: Icons.Sun },
            { value: "dark",  label: "Dark",  icon: Icons.Moon },
          ]}
        />
      </div>
    </div>
  );
}

Object.assign(window, { Reader });
