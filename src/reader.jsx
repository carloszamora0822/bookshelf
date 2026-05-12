// Reader screen — the main event

function Reader({ bookId, startPage }) {
  const app = useApp();
  const book = app.books.find(b => b.id === bookId);
  const isTablet = app.viewportClass === "tablet";

  const [page, setPage] = useState(startPage || book?.lastOpenedPage || 1);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [pageMode, setPageMode] = useState(app.prefs.defaultPageMode);
  const [brightness, setBrightness] = useState(0); // 0..0.55 overlay
  const [menuOpen, setMenuOpen] = useState(false);

  // Sheets
  const [sheet, setSheet] = useState(null); // 'notes' | 'toc' | 'bookmarks' | 'jump' | 'brightness'

  const [drafts, setDrafts] = useState({}); // pageNum -> string for "new note" drafts

  // Auto-hide chrome after 6s of inactivity (per PRD). Tap toggles.
  const hideTimer = useRef(null);
  const armHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChromeVisible(false), 6000);
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

  // Persist last opened page
  useEffect(() => {
    if (book) app.setResume(book.id, page);
  }, [page, book?.id]);

  if (!book) return null;

  const isBookmarked = book.bookmarks.some(bm => bm.page === page);
  const notesForPage = book.notes.filter(n => n.page === page);

  const goPage = (n) => {
    const p = Math.max(1, Math.min(book.pageCount, n));
    setPage(p); resetHide();
  };

  // Brightness overlay
  const dim = brightness > 0 ? `rgba(0,0,0,${brightness})` : "transparent";

  return (
    <div style={{
      height: "100%",
      background: "var(--bg)",
      position: "relative", overflow: "hidden",
      userSelect: "none",
    }}
      onClick={(e) => {
        // tap on page toggles chrome
        if (e.target.dataset?.pagetap === "1") {
          setChromeVisible(v => !v);
          if (!chromeVisible) resetHide();
        }
      }}
    >
      {/* Page surface */}
      {pageMode === "horizontal" ? (
        <HorizontalPages book={book} page={page} setPage={goPage} isTablet={isTablet} />
      ) : (
        <VerticalPages book={book} page={page} setPage={goPage} isTablet={isTablet} />
      )}

      {/* Brightness overlay */}
      <div data-pagetap="1" style={{
        position: "absolute", inset: 0, background: dim,
        transition: "background 200ms ease", pointerEvents: "none",
      }} />

      {/* Top chrome */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: isTablet ? "12px 24px" : "10px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--bg)",
        borderBottom: chromeVisible ? "1px solid var(--line-2)" : "1px solid transparent",
        transform: `translateY(${chromeVisible ? 0 : -100}%)`,
        transition: "transform 240ms ease",
        zIndex: 10,
      }}>
        <IconButton icon={Icons.ArrowLeft} label="back" size={20} padding={9} onClick={app.goBack} />
        <div style={{
          flex: 1, textAlign: "center", margin: "0 8px",
          fontFamily: "var(--serif)", fontSize: 15, fontWeight: 500,
          color: "var(--ink)", letterSpacing: "-0.005em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{book.title}</div>
        <div style={{ position: "relative" }}>
          <IconButton icon={Icons.More} label="menu" size={18} padding={9} onClick={() => { setMenuOpen(o => !o); resetHide(); }} />
          <Menu open={menuOpen} onClose={() => setMenuOpen(false)} anchor="right">
            <MenuItem icon={app.prefs.theme === "dark" ? Icons.Sun : Icons.Moon}
              label={app.prefs.theme === "dark" ? "Light theme" : "Dark theme"}
              hint={app.prefs.theme}
              onClick={() => { app.setPrefs({ theme: app.prefs.theme === "dark" ? "light" : "dark" }); setMenuOpen(false); }}
            />
            <MenuItem icon={Icons.Brightness} label="Brightness" hint={`${Math.round(brightness * 100)}%`}
              onClick={() => { setSheet("brightness"); setMenuOpen(false); }} />
            <MenuItem icon={pageMode === "horizontal" ? Icons.PageMode : Icons.Scroll}
              label={`Page mode: ${pageMode === "horizontal" ? "swipe" : "scroll"}`}
              onClick={() => { setPageMode(m => m === "horizontal" ? "vertical" : "horizontal"); setMenuOpen(false); }}
            />
            <MenuItem icon={Icons.ArrowUpRight} label="Jump to page…"
              onClick={() => { setSheet("jump"); setMenuOpen(false); }} />
            <div style={{ height: 1, background: "var(--line-2)", margin: "5px 6px" }} />
            <MenuItem icon={Icons.Layers} label="Table of contents" hint={book.hasOutline ? null : "none"}
              onClick={() => { if (book.hasOutline) { setSheet("toc"); setMenuOpen(false); } }} />
            <MenuItem icon={Icons.Bookmark} label="Bookmarks" hint={String(book.bookmarks.length)}
              onClick={() => { setSheet("bookmarks"); setMenuOpen(false); }} />
          </Menu>
        </div>
      </div>

      {/* Bottom chrome */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: isTablet ? "14px 24px 24px" : "10px 16px 24px",
        background: "var(--bg)",
        borderTop: chromeVisible ? "1px solid var(--line-2)" : "1px solid transparent",
        transform: `translateY(${chromeVisible ? 0 : 100}%)`,
        transition: "transform 240ms ease",
        zIndex: 10,
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        {/* scrubber */}
        <PageScrubber pageCount={book.pageCount} page={page} onChange={goPage} bookmarks={book.bookmarks} />

        {/* actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)",
            letterSpacing: "0.04em",
            padding: "5px 9px", borderRadius: 999,
            background: "var(--bg-sunk)", border: "1px solid var(--line)",
          }}>
            {page} <span style={{ color: "var(--ink-4)" }}>/ {book.pageCount}</span>
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            <IconButton
              icon={isBookmarked ? Icons.BookmarkFill : Icons.Bookmark}
              label={isBookmarked ? "remove bookmark" : "add bookmark"}
              size={20} padding={10}
              active={isBookmarked}
              onClick={() => { app.toggleBookmark(book.id, page); resetHide(); }}
            />
            <IconButton
              icon={Icons.Note}
              label="notes"
              size={20} padding={10}
              badge={notesForPage.length || null}
              onClick={() => { setSheet("notes"); resetHide(); }}
            />
            <IconButton icon={Icons.Layers} label="contents" size={20} padding={10}
              onClick={() => { if (book.hasOutline) setSheet("toc"); else setSheet("bookmarks"); resetHide(); }} />
            <IconButton icon={Icons.Eye} label="focus mode" size={20} padding={10}
              onClick={() => { clearTimeout(hideTimer.current); setChromeVisible(false); }} />
          </div>
        </div>
      </div>

      {/* Notes sheet */}
      {sheet === "notes" && (
      <BottomSheet open={true} onClose={() => setSheet(null)} title={`Notes on page ${page}`} maxHeight="78%">
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

      {/* TOC sheet */}
      {sheet === "toc" && (
      <BottomSheet open={true} onClose={() => setSheet(null)} title="Contents" side="right">
        <OutlineTree entries={book.outline} onJump={(p) => { goPage(p); setSheet(null); }} />
      </BottomSheet>
      )}

      {/* Bookmarks sheet */}
      {sheet === "bookmarks" && (
      <BottomSheet open={true} onClose={() => setSheet(null)} title="Bookmarks" side="right">
        <BookmarksList bookmarks={book.bookmarks} current={page}
          onJump={(p) => { goPage(p); setSheet(null); }}
          onDelete={(id) => app.deleteBookmark(book.id, id)}
          onRelabel={(id, label) => app.editBookmark(book.id, id, label)}
        />
      </BottomSheet>
      )}

      {/* Jump to page sheet */}
      {sheet === "jump" && (
      <BottomSheet open={true} onClose={() => setSheet(null)} title="Jump to page" maxHeight="40%">
        <JumpToPage pageCount={book.pageCount} current={page}
          onJump={(p) => { goPage(p); setSheet(null); }} />
      </BottomSheet>
      )}

      {/* Brightness sheet */}
      {sheet === "brightness" && (
      <BottomSheet open={true} onClose={() => setSheet(null)} title="Brightness" maxHeight="46%">
        <BrightnessControl value={brightness} onChange={setBrightness} theme={app.prefs.theme} setTheme={(t) => app.setPrefs({ theme: t })} />
      </BottomSheet>
      )}
    </div>
  );
}

// ─────────────── Horizontal page-turn ───────────────

function HorizontalPages({ book, page, setPage, isTablet }) {
  // We render 3 pages: prev, current, next. The "drag" displacement is rendered live.
  const [drag, setDrag] = useState(0);
  const wrapRef = useRef(null);
  const [box, setBox] = useState({ w: 300, h: 500 });
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

  // Compute the page dimensions that fit within the wrapper while keeping 5/7 aspect
  const padH = isTablet ? 70 : 58;
  const padB = isTablet ? 80 : 76;
  const padX = isTablet ? 60 : 18;
  const availW = Math.max(0, box.w - padX * 2);
  const availH = Math.max(0, box.h - padH - padB);
  let pageW = Math.min(availW, availH * 5 / 7);
  let pageH = pageW * 7 / 5;
  if (pageH > availH) { pageH = availH; pageW = pageH * 5 / 7; }
  // Center
  const left = (box.w - pageW) / 2;
  const top = padH + (availH - pageH) / 2;

  const onDown = (e) => {
    cancelAnimationFrame(animRef.current);
    startX.current = (e.touches?.[0]?.clientX) ?? e.clientX;
  };
  const onMove = (e) => {
    if (startX.current == null) return;
    const x = (e.touches?.[0]?.clientX) ?? e.clientX;
    const dx = x - startX.current;
    // resistance at extremes
    if ((page === 1 && dx > 0) || (page === book.pageCount && dx < 0)) {
      setDrag(dx * 0.25);
    } else {
      setDrag(dx);
    }
  };
  const onUp = () => {
    if (startX.current == null) return;
    const W = widthRef.current || 1;
    const t = drag / W;
    let target = page;
    if (t < -0.18 && page < book.pageCount) target = page + 1;
    else if (t > 0.18 && page > 1) target = page - 1;
    startX.current = null;
    // animate drag to settle
    const startDrag = drag;
    const endDrag = target === page ? 0 : (target > page ? -W : W);
    const t0 = performance.now();
    const dur = 220;
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

  return (
    <div ref={wrapRef}
      data-pagetap="1"
      onMouseDown={onDown} onMouseMove={onDown ? onMove : null} onMouseUp={onUp} onMouseLeave={() => startX.current != null && onUp()}
      onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
      style={{
        position: "absolute", inset: 0,
        overflow: "hidden",
        touchAction: "pan-y",
      }}
    >
      {[page - 1, page, page + 1].map((p) => (
        (p >= 1 && p <= book.pageCount) && (
          <div key={p} data-pagetap="1" style={{
            position: "absolute",
            top, left,
            width: pageW, height: pageH,
            transform: `translateX(calc(${(p - page) * (pageW + 24)}px + ${drag}px))`,
            willChange: "transform",
          }}>
            <PdfPage book={book} pageNum={p} width={pageW} height={pageH} />
          </div>
        )
      ))}
    </div>
  );
}

// ─────────────── Vertical scroll mode ───────────────

function VerticalPages({ book, page, setPage, isTablet }) {
  const scrollRef = useRef(null);
  const pageRefs = useRef({});
  const [wrapW, setWrapW] = useState(300);

  useEffect(() => {
    if (!scrollRef.current) return;
    const ro = new ResizeObserver(entries => setWrapW(entries[0].contentRect.width));
    ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // Scroll to current page on mount only
    if (scrollRef.current && pageRefs.current[page]) {
      scrollRef.current.scrollTop = pageRefs.current[page].offsetTop - 48;
    }
  }, []); // eslint-disable-line

  const onScroll = (e) => {
    const top = e.target.scrollTop;
    let nearest = page;
    for (const [p, el] of Object.entries(pageRefs.current)) {
      if (el && el.offsetTop - top - 80 < 0) nearest = Number(p);
    }
    if (nearest !== page) setPage(nearest);
  };

  // Render a window — current ± 3
  const range = [];
  for (let p = Math.max(1, page - 3); p <= Math.min(book.pageCount, page + 3); p++) range.push(p);

  const padX = isTablet ? 80 : 22;
  const pageW = Math.max(100, Math.min(560, wrapW - padX * 2));
  const pageH = pageW * 7 / 5;

  return (
    <div ref={scrollRef} onScroll={onScroll} data-pagetap="1"
      style={{
        position: "absolute", inset: 0, overflow: "auto",
        padding: isTablet ? "70px 0 100px" : "58px 0 100px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 22,
      }}
    >
      {range.map((p) => (
        <div key={p} ref={el => pageRefs.current[p] = el} data-pagetap="1"
          style={{ width: pageW, height: pageH, flexShrink: 0 }}>
          <PdfPage book={book} pageNum={p} width={pageW} height={pageH} />
        </div>
      ))}
    </div>
  );
}

// ─────────────── A typeset "PDF" page ───────────────

function PdfPage({ book, pageNum, width, height, isTablet }) {
  const src = (window.PAGES?.[book.pageSrc]) || [];
  const content = src.length ? src[(pageNum - 1) % src.length] : { kind: "page", body: "…" };
  const isFirst = pageNum === 1 || content.kind === "chap";
  const extra = [];
  if (src.length > 1) {
    for (let k = 1; k <= 2; k++) {
      const idx = (pageNum - 1 + k) % src.length;
      if (src[idx]?.kind === "page") extra.push(src[idx].body);
    }
  }

  // Sizing — derive everything from explicit width/height if provided
  const W = width || 0;
  const H = height || 0;
  const has = W > 0 && H > 0;

  // Scale type and padding proportionally to page height
  const fs = (frac) => has ? Math.max(8, H * frac) : 14;
  const px = (frac) => has ? H * frac : 16;

  const padTop = has ? H * 0.055 : 32;
  const padX = has ? W * 0.085 : 28;
  const padBottom = has ? H * 0.045 : 24;

  return (
    <div style={{
      width: has ? W : "100%",
      height: has ? H : "auto",
      maxWidth: has ? undefined : "100%",
      aspectRatio: has ? undefined : "5 / 7",
      background: "var(--bg-elev)",
      border: "1px solid var(--line)",
      borderRadius: 3,
      boxShadow: "0 10px 36px rgba(20,18,15,0.10), 0 1px 2px rgba(20,18,15,0.04)",
      padding: `${padTop}px ${padX}px ${padBottom}px`,
      display: "flex", flexDirection: "column",
      color: "var(--ink-2)",
      position: "relative",
      overflow: "hidden",
    }} data-pagetap="1">
      {/* Running head */}
      <div data-pagetap="1" style={{
        display: "flex", justifyContent: "space-between",
        fontFamily: "var(--serif)", fontStyle: "italic",
        fontSize: fs(0.022), color: "var(--ink-4)",
        letterSpacing: "0.02em",
        marginBottom: px(0.04),
      }}>
        <span>{book.title}</span>
        <span>{book.author}</span>
      </div>

      {isFirst && content.head && (
        <div data-pagetap="1" style={{
          fontFamily: "var(--sans)", fontSize: fs(0.024), fontWeight: 500,
          color: "var(--ink-3)", letterSpacing: "0.2em", textTransform: "uppercase",
          marginBottom: 6,
        }}>{content.head}</div>
      )}
      {isFirst && content.title && (
        <h2 data-pagetap="1" style={{
          margin: 0, fontFamily: "var(--serif)",
          fontSize: fs(0.05), fontWeight: 500,
          letterSpacing: "-0.02em", color: "var(--ink)",
          marginBottom: px(0.018),
        }}>{content.title}</h2>
      )}

      <div data-pagetap="1" style={{
        display: "flex", flexDirection: "column", gap: px(0.018),
        flex: 1, minHeight: 0, overflow: "hidden",
      }}>
        <p data-pagetap="1" style={{
          fontFamily: "var(--serif)",
          fontSize: fs(0.028),
          lineHeight: 1.58,
          color: "var(--ink)",
          margin: 0,
          textAlign: "justify",
          textWrap: "pretty",
          hyphens: "auto",
          WebkitHyphens: "auto",
          fontFeatureSettings: '"liga", "kern", "onum"',
        }}>
          {isFirst && <span style={{
            float: "left",
            fontFamily: "var(--serif)",
            fontSize: fs(0.10),
            lineHeight: 0.92,
            fontWeight: 500,
            marginRight: 6, marginTop: 4,
            color: "var(--ink)",
          }}>{content.body.charAt(0)}</span>}
          {isFirst ? content.body.slice(1) : content.body}
        </p>
        {extra.map((para, i) => (
          <p key={i} data-pagetap="1" style={{
            fontFamily: "var(--serif)",
            fontSize: fs(0.028),
            lineHeight: 1.58,
            color: "var(--ink)",
            margin: 0,
            textAlign: "justify",
            textWrap: "pretty",
            hyphens: "auto",
            WebkitHyphens: "auto",
            textIndent: "1.4em",
          }}>{para}</p>
        ))}
      </div>

      <div data-pagetap="1" style={{
        textAlign: "center", fontFamily: "var(--serif)", fontStyle: "italic",
        fontSize: fs(0.022), color: "var(--ink-4)",
        marginTop: px(0.018),
      }}>{pageNum}</div>
    </div>
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
    dragTo((e.touches?.[0]?.clientX) ?? e.clientX);
    const move = (ev) => dragging.current && dragTo((ev.touches?.[0]?.clientX) ?? ev.clientX);
    const up = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move); window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move); window.addEventListener("touchend", up);
  };

  const pct = (page - 1) / Math.max(1, pageCount - 1);

  return (
    <div ref={ref} onMouseDown={onDown} onTouchStart={onDown} style={{
      position: "relative", height: 22, cursor: "pointer",
      display: "flex", alignItems: "center",
    }}>
      <div style={{
        position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)",
        height: 2, borderRadius: 999, background: "var(--line)",
      }} />
      <div style={{
        position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
        width: `${pct * 100}%`, height: 2, borderRadius: 999, background: "var(--ink-2)",
      }} />
      {bookmarks.map(bm => {
        const u = (bm.page - 1) / Math.max(1, pageCount - 1);
        return (
          <div key={bm.id} title={`bookmark p.${bm.page}`} style={{
            position: "absolute", left: `${u * 100}%`, top: "50%",
            width: 3, height: 8, transform: "translate(-50%, -50%)",
            background: "var(--accent)", borderRadius: 1,
          }} />
        );
      })}
      <div style={{
        position: "absolute", left: `${pct * 100}%`, top: "50%",
        transform: "translate(-50%, -50%)",
        width: 14, height: 14, borderRadius: 999,
        background: "var(--ink)", border: "2px solid var(--bg)",
        boxShadow: "var(--shadow-sm)",
      }} />
    </div>
  );
}

// ─────────────── Notes sheet ───────────────

function NotesSheet({ notesForPage, draft, setDraft, onSave, onDelete, onEdit }) {
  const inputRef = useRef(null);
  return (
    <div>
      {notesForPage.length === 0 && (
        <div style={{
          padding: "20px 0 14px", textAlign: "center",
          color: "var(--ink-4)", fontSize: 13, fontStyle: "italic",
        }}>No notes on this page yet.</div>
      )}
      {notesForPage.map((n) => (
        <NoteRow key={n.id} note={n}
          onDelete={() => onDelete(n.id)}
          onEdit={(body) => onEdit(n.id, body)} />
      ))}
      <div style={{
        marginTop: 12,
        padding: "10px 12px",
        background: "var(--bg-sunk)",
        border: "1px solid var(--line)",
        borderRadius: 12,
      }}>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => draft.trim() && onSave(draft)}
          placeholder="Add a note for this page…"
          rows={3}
          style={{
            width: "100%", background: "transparent", border: 0, outline: 0,
            resize: "none", color: "var(--ink)",
            fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.55,
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--mono)" }}>
            saves on blur
          </span>
          <PrimaryBtn onClick={() => { onSave(draft); inputRef.current?.blur(); }}>Save</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

function NoteRow({ note, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  if (editing) return (
    <div style={{ padding: "12px 0", borderTop: "1px solid var(--line-2)" }}>
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
        style={{ width: "100%", background: "var(--bg-sunk)", border: "1px solid var(--line)", borderRadius: 10,
          padding: 10, color: "var(--ink)", fontFamily: "var(--serif)", fontSize: 14.5, lineHeight: 1.55, resize: "none", outline: 0 }} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 6 }}>
        <PrimaryBtn variant="ghost" onClick={() => { setEditing(false); setBody(note.body); }}>Cancel</PrimaryBtn>
        <PrimaryBtn onClick={() => { onEdit(body); setEditing(false); }}>Save</PrimaryBtn>
      </div>
    </div>
  );
  return (
    <div style={{
      padding: "12px 4px", borderTop: "1px solid var(--line-2)",
    }}>
      <div style={{
        fontFamily: "var(--serif)", fontSize: 14.5, lineHeight: 1.5, color: "var(--ink)",
        whiteSpace: "pre-wrap",
      }}>{note.body}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-4)" }}>{note.updatedAt}</div>
        <div style={{ display: "flex", gap: 4 }}>
          <IconButton icon={Icons.Pencil} label="edit" size={14} padding={6} onClick={() => setEditing(true)} />
          <IconButton icon={Icons.Trash} label="delete" size={14} padding={6} onClick={onDelete} />
        </div>
      </div>
    </div>
  );
}

// ─────────────── Bookmarks list ───────────────

function BookmarksList({ bookmarks, current, onJump, onDelete, onRelabel }) {
  if (bookmarks.length === 0) {
    return <div style={{ padding: "20px 0", color: "var(--ink-4)", fontStyle: "italic", fontSize: 13 }}>No bookmarks for this book.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {bookmarks.sort((a, b) => a.page - b.page).map((bm, i) => {
        const isCurrent = bm.page === current;
        return (
          <div key={bm.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--line-2)",
            background: isCurrent ? "var(--accent-soft)" : "transparent",
            marginInline: isCurrent ? -8 : 0, paddingInline: isCurrent ? 8 : 0,
            borderRadius: isCurrent ? 8 : 0,
          }}>
            <button onClick={() => onJump(bm.page)} style={{
              display: "flex", alignItems: "center", gap: 12, flex: 1, textAlign: "left", cursor: "pointer",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: isCurrent ? "var(--accent)" : "var(--accent-soft)",
                color: isCurrent ? "white" : "var(--accent-ink)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--serif)", fontSize: 13, fontWeight: 500,
              }}>{bm.page}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "var(--serif)", fontSize: 14.5, color: "var(--ink)",
                  fontStyle: bm.label ? "normal" : "italic",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{bm.label || `Page ${bm.page}`}</div>
                <div style={{ color: "var(--ink-4)", fontSize: 10.5, marginTop: 1, fontFamily: "var(--mono)" }}>
                  {bm.createdAt}
                </div>
              </div>
            </button>
            <IconButton icon={Icons.Trash} label="delete" size={14} padding={7} onClick={() => onDelete(bm.id)} />
          </div>
        );
      })}
    </div>
  );
}

// ─────────────── Jump to page ───────────────

function JumpToPage({ pageCount, current, onJump }) {
  const [val, setVal] = useState(String(current));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value.replace(/[^0-9]/g, ""))}
        type="text" inputMode="numeric"
        style={{
          padding: "16px 18px", borderRadius: 12,
          background: "var(--bg-sunk)", border: "1px solid var(--line)",
          fontFamily: "var(--serif)", fontSize: 28, color: "var(--ink)",
          outline: 0, textAlign: "center", letterSpacing: "-0.01em",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>of {pageCount}</div>
        <PrimaryBtn onClick={() => { const n = Math.max(1, Math.min(pageCount, parseInt(val || "1", 10))); onJump(n); }}>
          Go to page
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ─────────────── Brightness ───────────────

function BrightnessControl({ value, onChange, theme, setTheme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.08em" }}>OVERLAY DIMMING</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>{Math.round(value * 100)}%</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icons.Sun size={16} style={{ color: "var(--ink-3)" }} />
          <input type="range" min="0" max="55" value={value * 100} onChange={e => onChange(Number(e.target.value) / 100)}
            style={{ flex: 1, accentColor: "var(--accent)" }} />
          <Icons.Moon size={16} style={{ color: "var(--ink-3)" }} />
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-4)", fontStyle: "italic" }}>
          Doesn't change your screen brightness — overlays a soft dim layer on the page.
        </div>
      </div>
      <div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.08em", marginBottom: 8 }}>THEME</div>
        <Segmented value={theme} onChange={setTheme}
          options={[
            { value: "system", label: "System" },
            { value: "light",  label: "Light", icon: Icons.Sun },
            { value: "dark",   label: "Dark",  icon: Icons.Moon },
          ]} />
      </div>
    </div>
  );
}

Object.assign(window, { Reader });
