// Library screen — Continue reading carousel + grid/list of books

function Library() {
  const app = useApp();
  const { books, tags, library, setLibrary, openBook, openUpload, openSettings, openLongPress, viewportClass } = app;
  const isTablet = viewportClass === "tablet";

  const [menuOpen, setMenuOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = books;
    if (library.tagFilter) list = list.filter(b => b.tagIds.includes(library.tagFilter));
    if (library.q) {
      const q = library.q.toLowerCase();
      list = list.filter(b => b.title.toLowerCase().includes(q) || (b.author || "").toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (library.sort === "recent")  sorted.sort((a, b) => (b.lastOpenedAt || "") .localeCompare(a.lastOpenedAt || ""));
    if (library.sort === "added")   sorted.sort((a, b) => (b.addedAt).localeCompare(a.addedAt));
    if (library.sort === "title")   sorted.sort((a, b) => a.title.localeCompare(b.title));
    if (library.sort === "author")  sorted.sort((a, b) => (a.author||"").localeCompare(b.author||""));
    return sorted;
  }, [books, library]);

  const continueList = useMemo(
    () => books.filter(b => b.lastOpenedAt)
      .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))
      .slice(0, 5),
    [books]
  );

  const tagById = (id) => tags.find(t => t.id === id);

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: "var(--bg)",
    }}>
      {/* App header */}
      <div style={{
        padding: isTablet ? "20px 36px 0" : "12px 22px 0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{
          fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600,
          letterSpacing: "0.28em", color: "var(--ink-3)",
        }}>MYBOOKS</div>
        <div style={{ display: "flex", gap: 4 }}>
          <IconButton icon={Icons.Search} label="search" size={18} padding={8} onClick={() => {}} />
          <IconButton icon={Icons.Settings} label="settings" size={18} padding={8} onClick={openSettings} />
        </div>
      </div>

      {/* Scroll body */}
      <div style={{ flex: 1, overflow: "auto", paddingBottom: 24, position: "relative" }}>
        {/* Title */}
        <div style={{
          padding: isTablet ? "14px 36px 4px" : "8px 22px 2px",
        }}>
          <h1 style={{
            margin: 0, fontFamily: "var(--serif)", fontWeight: 500,
            fontSize: isTablet ? 40 : 30,
            letterSpacing: "-0.025em", color: "var(--ink)",
          }}>Your library</h1>
          <div style={{ marginTop: 4, color: "var(--ink-3)", fontSize: 13 }}>
            {books.length} books · {tags.length} tags
          </div>
        </div>

        {/* Search row */}
        <div style={{
          padding: isTablet ? "20px 36px 0" : "16px 22px 0",
          display: "flex", gap: 10, alignItems: "center",
        }}>
          <SearchField value={library.q} onChange={q => setLibrary(l => ({ ...l, q }))} />
        </div>

        {/* Continue reading */}
        {continueList.length > 0 && (
          <ContinueReading books={continueList} isTablet={isTablet} onOpen={openBook} />
        )}

        {/* Library section */}
        <div style={{ padding: isTablet ? "8px 36px 0" : "8px 22px 0" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            margin: "10px 0 14px",
          }}>
            <h2 style={{
              margin: 0, fontFamily: "var(--serif)", fontSize: isTablet ? 24 : 20,
              fontWeight: 500, letterSpacing: "-0.012em", color: "var(--ink)",
              whiteSpace: "nowrap",
            }}>All books</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", position: "relative" }}>
              <Segmented
                value={library.view}
                onChange={v => setLibrary(l => ({ ...l, view: v }))}
                options={[
                  { value: "grid", label: "Grid", icon: Icons.Grid },
                  { value: "list", label: "List", icon: Icons.List },
                ]}
              />
              <div style={{ position: "relative" }}>
                <IconButton icon={Icons.Sort} label="sort" size={16} padding={9} onClick={() => setMenuOpen(o => !o)} />
                <Menu open={menuOpen} onClose={() => setMenuOpen(false)} anchor="right">
                  {[
                    { v: "recent", label: "Recently opened" },
                    { v: "added",  label: "Recently added" },
                    { v: "title",  label: "Title" },
                    { v: "author", label: "Author" },
                  ].map(o => (
                    <MenuItem key={o.v} label={o.label} active={library.sort === o.v}
                      onClick={() => { setLibrary(l => ({ ...l, sort: o.v })); setMenuOpen(false); }} />
                  ))}
                </Menu>
              </div>
            </div>
          </div>

          {/* Tag filter chips */}
          <div style={{ display: "flex", gap: 7, marginBottom: 18, overflowX: "auto", paddingBottom: 2 }}>
            <FilterChip label="All" active={!library.tagFilter} onClick={() => setLibrary(l => ({ ...l, tagFilter: null }))} count={books.length} />
            {tags.map(t => {
              const n = books.filter(b => b.tagIds.includes(t.id)).length;
              if (!n) return null;
              return (
                <FilterChip
                  key={t.id}
                  label={t.name}
                  color={t.color}
                  active={library.tagFilter === t.id}
                  count={n}
                  onClick={() => setLibrary(l => ({ ...l, tagFilter: l.tagFilter === t.id ? null : t.id }))}
                />
              );
            })}
          </div>

          {/* Body — grid or list */}
          {library.view === "grid"
            ? <BookGrid books={filtered} isTablet={isTablet} onOpen={openBook} onLongPress={openLongPress} />
            : <BookList books={filtered} tagById={tagById} onOpen={openBook} onLongPress={openLongPress} />
          }

          {filtered.length === 0 && (
            <EmptyState onUpload={openUpload} />
          )}
        </div>
      </div>

      <FAB onClick={openUpload} label="upload book" />
    </div>
  );
}

// ───────────────────── Continue reading carousel ─────────────────────

function ContinueReading({ books, isTablet, onOpen }) {
  const cw = isTablet ? 168 : 138;
  const ch = Math.round(cw * 1.5);
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{
        padding: isTablet ? "0 36px" : "0 22px",
        display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12,
      }}>
        <h2 style={{
          margin: 0, fontFamily: "var(--serif)", fontSize: isTablet ? 24 : 20,
          fontWeight: 500, letterSpacing: "-0.012em", color: "var(--ink)",
          whiteSpace: "nowrap",
        }}>Continue reading</h2>
        <span style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--mono)", letterSpacing: "0.04em" }}>
          {books.length} active
        </span>
      </div>
      <div style={{
        display: "flex", gap: isTablet ? 22 : 16,
        overflowX: "auto",
        padding: isTablet ? "0 36px 6px" : "0 22px 6px",
        scrollSnapType: "x mandatory",
      }}>
        {books.map(b => (
          <button key={b.id} onClick={() => onOpen(b.id)} style={{
            flexShrink: 0, width: cw, textAlign: "left", scrollSnapAlign: "start",
            cursor: "pointer",
          }}>
            <CoverWithIndicator book={b} w={cw} h={ch} />
            <div style={{ marginTop: 10 }}>
              <div style={{
                fontFamily: "var(--serif)", fontSize: 14, fontWeight: 500,
                color: "var(--ink)", lineHeight: 1.25, letterSpacing: "-0.01em",
                overflow: "hidden", display: "-webkit-box",
                WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                textWrap: "pretty",
              }}>{b.title}</div>
              <div style={{ marginTop: 3, color: "var(--ink-3)", fontSize: 11, letterSpacing: "0.005em" }}>
                {b.author}
              </div>
              <div style={{ marginTop: 6, color: "var(--ink-4)", fontSize: 10.5, fontFamily: "var(--mono)" }}>
                page {b.lastOpenedPage} of {b.pageCount}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────────────────── Grid & List ─────────────────────

function BookGrid({ books, isTablet, onOpen, onLongPress }) {
  const minCol = isTablet ? 150 : 118;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(auto-fill, minmax(${minCol}px, 1fr))`,
      gap: isTablet ? "26px 22px" : "22px 14px",
    }}>
      {books.map(b => <GridCard key={b.id} book={b} onOpen={onOpen} onLongPress={onLongPress} />)}
    </div>
  );
}

function GridCard({ book, onOpen, onLongPress }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const onDown = () => { timer.current = setTimeout(() => onLongPress?.(book.id), 500); };
  const onUp = () => { clearTimeout(timer.current); };
  // measure container width to size cover
  const [w, setW] = useState(120);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      const cw = entries[0].contentRect.width;
      setW(cw);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const h = Math.round(w * 1.5);

  return (
    <button ref={ref}
      onClick={() => onOpen(book.id)}
      onMouseDown={onDown} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchStart={onDown} onTouchEnd={onUp}
      style={{ textAlign: "left", cursor: "pointer", width: "100%" }}
    >
      <CoverArt book={book} w={w} h={h} radius={3} />
      <div style={{ marginTop: 10 }}>
        <div style={{
          fontFamily: "var(--serif)", fontSize: 14, fontWeight: 500,
          color: "var(--ink)", lineHeight: 1.25, letterSpacing: "-0.005em",
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>{book.title}</div>
        <div style={{ marginTop: 3, color: "var(--ink-3)", fontSize: 11 }}>
          {book.author}
        </div>
      </div>
    </button>
  );
}

function BookList({ books, tagById, onOpen, onLongPress }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden", background: "var(--bg-elev)" }}>
      {books.map((b, i) => (
        <button key={b.id} onClick={() => onOpen(b.id)} style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 14px",
          textAlign: "left", cursor: "pointer",
          borderBottom: i === books.length - 1 ? "none" : "1px solid var(--line-2)",
        }}>
          <div style={{ flexShrink: 0 }}>
            <CoverArt book={b} w={46} h={68} radius={2} shadow={false} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--serif)", fontSize: 15.5, fontWeight: 500,
              color: "var(--ink)", lineHeight: 1.25, letterSpacing: "-0.01em",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{b.title}</div>
            <div style={{ marginTop: 2, color: "var(--ink-3)", fontSize: 12 }}>
              {b.author} · <span style={{ fontFamily: "var(--mono)", fontSize: 10.5 }}>{b.pageCount}pp</span>
            </div>
            <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
              {b.tagIds.slice(0, 3).map(id => {
                const t = tagById(id); if (!t) return null;
                return <TagPill key={id} tag={t} size="sm" />;
              })}
            </div>
          </div>
          <IconButton icon={Icons.More} label="more" size={16} padding={8} onClick={e => { e.stopPropagation(); onLongPress?.(b.id); }} />
        </button>
      ))}
    </div>
  );
}

function FilterChip({ label, count, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      flexShrink: 0,
      display: "inline-flex", alignItems: "center", gap: 7,
      padding: "7px 13px",
      borderRadius: 999,
      background: active ? "var(--ink)" : "var(--bg-elev)",
      color: active ? "var(--bg)" : "var(--ink-2)",
      border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
      fontFamily: "var(--sans)", fontSize: 12, fontWeight: 500,
      letterSpacing: "0.005em",
      transition: "background 150ms, color 150ms, border-color 150ms",
      cursor: "pointer",
    }}>
      {color && <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />}
      {label}
      <span style={{ opacity: 0.55, fontSize: 10.5, fontFamily: "var(--mono)" }}>{count}</span>
    </button>
  );
}

function EmptyState({ onUpload }) {
  return (
    <div style={{
      padding: 40, textAlign: "center",
      border: "1px dashed var(--line)", borderRadius: 16,
      marginTop: 16,
    }}>
      <div style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)" }}>No books here yet</div>
      <div style={{ color: "var(--ink-3)", fontSize: 13, margin: "6px 0 14px" }}>
        Bring your PDFs over and we'll set them up for reading.
      </div>
      <PrimaryBtn leadIcon={Icons.Upload} onClick={onUpload}>Upload your first book</PrimaryBtn>
    </div>
  );
}

// ───────────────────── Long-press menu ─────────────────────

function LongPressMenu({ bookId, onClose }) {
  const app = useApp();
  const book = app.books.find(b => b.id === bookId);
  if (!book) return null;
  return (
    <BottomSheet open={!!bookId} onClose={onClose} title={null} padded={false}>
      <div style={{ padding: "14px 16px 8px", display: "flex", gap: 14, alignItems: "center" }}>
        <CoverArt book={book} w={48} h={72} radius={3} shadow={false} />
        <div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.01em" }}>
            {book.title}
          </div>
          <div style={{ color: "var(--ink-3)", fontSize: 12, marginTop: 2 }}>{book.author}</div>
        </div>
      </div>
      <div style={{ padding: "6px 8px 18px" }}>
        <MenuItem icon={Icons.BookOpen} label={book.lastOpenedPage ? `Continue from page ${book.lastOpenedPage}` : "Start reading"} onClick={() => { onClose(); app.openReader(book.id); }} />
        <MenuItem icon={Icons.Play} label="Start from beginning" onClick={() => { onClose(); app.openReader(book.id, 1); }} />
        <MenuItem icon={Icons.Pencil} label="Edit details" onClick={() => { onClose(); app.openBook(book.id); }} />
        <MenuItem icon={Icons.Tag} label="Manage tags" onClick={() => { onClose(); app.openBook(book.id); }} />
        <MenuItem icon={Icons.Image} label="Change cover" onClick={() => { onClose(); app.openBook(book.id); }} />
        <MenuItem icon={Icons.Trash} label="Delete book" danger onClick={onClose} />
      </div>
    </BottomSheet>
  );
}

Object.assign(window, { Library, LongPressMenu });
