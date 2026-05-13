// Library — search, filter, sort, continue-reading rail, grid/list

function Library() {
  const app = useApp();
  const { books, tags, library, setLibrary, openBook, openUpload, openSettings, openLongPress } = app;
  const desktop = useMediaQuery("(min-width: 900px)");

  const [menuOpen, setMenuOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = books;
    if (library.tagFilter) list = list.filter(b => b.tagIds.includes(library.tagFilter));
    if (library.q) {
      const q = library.q.toLowerCase();
      list = list.filter(b =>
        b.title.toLowerCase().includes(q) ||
        (b.author || "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    if (library.sort === "recent")  sorted.sort((a, b) => (b.lastOpenedAt || "").localeCompare(a.lastOpenedAt || ""));
    if (library.sort === "added")   sorted.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    if (library.sort === "title")   sorted.sort((a, b) => a.title.localeCompare(b.title));
    if (library.sort === "author")  sorted.sort((a, b) => (a.author || "").localeCompare(b.author || ""));
    return sorted;
  }, [books, library]);

  const continueList = useMemo(
    () => books.filter(b => b.lastOpenedAt)
      .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))
      .slice(0, 6),
    [books]
  );

  const tagById = (id) => tags.find(t => t.id === id);

  const sortLabel = {
    recent: "Recently opened",
    added:  "Recently added",
    title:  "Title",
    author: "Author",
  }[library.sort];

  return (
    <div className="page-container">
      {/* Mobile top bar — only on mobile (rail handles desktop) */}
      {!desktop && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span className="rail-brand" style={{ padding: 0 }}>
            <span className="mark" style={{ fontSize: 22 }}>Book<em>shelf</em></span>
          </span>
          <IconButton icon={Icons.Settings} label="settings" onClick={openSettings} />
        </div>
      )}

      {/* Hero header */}
      <header className="library-head fade-up">
        <div>
          <div className="eyebrow">Your library</div>
          <h1 className="display-1" style={{ marginTop: 6 }}>
            {greeting()},<br />
            <em style={{ fontStyle: "italic", color: "var(--accent)", fontVariationSettings: '"opsz" 96, "SOFT" 100' }}>
              keep reading.
            </em>
          </h1>
          <div className="muted" style={{ marginTop: 10, fontSize: 14 }}>
            {books.length} books · {tags.length} tags · {totalPages(books).toLocaleString()} pages collected
          </div>
        </div>
      </header>

      <div className="library-toolbar fade-up delay-1">
        <SearchField value={library.q} onChange={q => setLibrary(l => ({ ...l, q }))} />
        <Segmented
          value={library.view}
          onChange={v => setLibrary(l => ({ ...l, view: v }))}
          options={[
            { value: "grid", label: "Grid", icon: Icons.Grid },
            { value: "list", label: "List", icon: Icons.List },
          ]}
        />
        <div style={{ position: "relative" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(o => !o)}>
            <Icons.Sort size={14} />
            <span>{sortLabel}</span>
            <Icons.ChevDown size={12} />
          </button>
          <Menu open={menuOpen} onClose={() => setMenuOpen(false)} anchor="right">
            {[
              { v: "recent", label: "Recently opened" },
              { v: "added",  label: "Recently added" },
              { v: "title",  label: "Title" },
              { v: "author", label: "Author" },
            ].map(o => (
              <MenuItem
                key={o.v}
                label={o.label}
                active={library.sort === o.v}
                onClick={() => { setLibrary(l => ({ ...l, sort: o.v })); setMenuOpen(false); }}
              />
            ))}
          </Menu>
        </div>
      </div>

      {/* Tag filter strip */}
      <div className="tag-strip fade-up delay-2">
        <FilterChip label="All" active={!library.tagFilter} count={books.length}
          onClick={() => setLibrary(l => ({ ...l, tagFilter: null }))} />
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

      {/* Continue reading */}
      {continueList.length > 0 && (
        <section className="fade-up delay-3">
          <div className="section-head">
            <h2>Continue <em>reading</em></h2>
            <span className="mono muted-2" style={{ fontSize: 11, letterSpacing: "0.06em" }}>
              {continueList.length} active
            </span>
          </div>
          <div className="continue-rail">
            {continueList.map(b => <ContinueTile key={b.id} book={b} onOpen={openBook} />)}
          </div>
        </section>
      )}

      {/* All books */}
      <section className="fade-up delay-4">
        <div className="section-head">
          <h2>All <em>books</em></h2>
          <span className="mono muted-2" style={{ fontSize: 11, letterSpacing: "0.06em" }}>
            {filtered.length} of {books.length}
          </span>
        </div>

        {library.view === "grid"
          ? <BookGrid books={filtered} onOpen={openBook} onLongPress={openLongPress} />
          : <BookList books={filtered} tagById={tagById} onOpen={openBook} onLongPress={openLongPress} />
        }

        {filtered.length === 0 && <EmptyState onUpload={openUpload} q={library.q} />}
      </section>

      <FAB icon={Icons.Plus} label="upload book" onClick={openUpload} />
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function totalPages(books) {
  return books.reduce((n, b) => n + (b.pageCount || 0), 0);
}

// ───────────────────── Continue reading tile ─────────────────────

function ContinueTile({ book, onOpen }) {
  const pct = book.lastOpenedPage && book.pageCount
    ? Math.max(0.02, Math.min(1, book.lastOpenedPage / book.pageCount))
    : 0;
  return (
    <button className="card-tile book-tile" onClick={() => onOpen(book.id)}>
      <div className="cover">
        <CoverArt book={book} />
        {pct > 0 && (
          <div className="progress"><span style={{ width: `${pct * 100}%` }} /></div>
        )}
      </div>
      <div className="meta">
        <div className="title">{book.title}</div>
        <div className="author">{book.author}</div>
        <div className="page-line">p. {book.lastOpenedPage} / {book.pageCount}</div>
      </div>
    </button>
  );
}

// ───────────────────── Grid + list ─────────────────────

function BookGrid({ books, onOpen, onLongPress }) {
  return (
    <div className="book-grid">
      {books.map(b => <GridCard key={b.id} book={b} onOpen={onOpen} onLongPress={onLongPress} />)}
    </div>
  );
}

function GridCard({ book, onOpen, onLongPress }) {
  const timer = useRef(null);
  const onDown = () => { timer.current = setTimeout(() => onLongPress?.(book.id), 480); };
  const cancel = () => clearTimeout(timer.current);
  return (
    <button
      className="book-tile"
      onClick={() => onOpen(book.id)}
      onMouseDown={onDown} onMouseUp={cancel} onMouseLeave={cancel}
      onTouchStart={onDown} onTouchEnd={cancel}
      onContextMenu={(e) => { e.preventDefault(); onLongPress?.(book.id); }}
    >
      <div className="cover">
        <CoverArt book={book} />
      </div>
      <div className="meta">
        <div className="title">{book.title}</div>
        <div className="author">{book.author}</div>
      </div>
    </button>
  );
}

function BookList({ books, tagById, onOpen, onLongPress }) {
  return (
    <div className="book-list">
      {books.map(b => (
        <button key={b.id} className="book-row" onClick={() => onOpen(b.id)}>
          <div className="cover-thumb">
            <CoverArt book={b} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="title">{b.title}</div>
            <div className="author">
              {b.author} <span className="mono muted-2" style={{ fontSize: 11 }}>· {b.pageCount}pp</span>
            </div>
            <div className="tags">
              {b.tagIds.slice(0, 3).map(id => {
                const t = tagById(id);
                return t ? <TagPill key={id} tag={t} size="sm" /> : null;
              })}
            </div>
          </div>
          <IconButton
            icon={Icons.More}
            label="more"
            size={16}
            onClick={(e) => { e.stopPropagation(); onLongPress?.(b.id); }}
            className="icon-btn-sm"
          />
        </button>
      ))}
    </div>
  );
}

function FilterChip({ label, count, active, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pill ${active ? "is-active" : ""}`}
      style={{ flexShrink: 0 }}
    >
      {color && <span className="dot" style={{ background: color }} />}
      {label}
      <span className="count">{count}</span>
    </button>
  );
}

function EmptyState({ onUpload, q }) {
  return (
    <div className="empty">
      <div className="title">
        {q ? "Nothing matched" : "No books here yet"}
      </div>
      <div className="desc">
        {q
          ? <>No results for <em style={{ fontStyle: "italic" }}>"{q}"</em>. Try another search.</>
          : "Bring your PDFs over and we'll set them up for reading."}
      </div>
      {!q && <PrimaryBtn variant="accent" leadIcon={Icons.Upload} onClick={onUpload}>Upload your first book</PrimaryBtn>}
    </div>
  );
}

// ───────────────────── Long-press / context menu ─────────────────────

function LongPressMenu({ bookId, onClose }) {
  const app = useApp();
  const book = app.books.find(b => b.id === bookId);
  if (!book) return null;
  return (
    <BottomSheet open={!!bookId} onClose={onClose} title={book.title}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 18 }}>
        <div style={{ width: 64, aspectRatio: "2/3", flexShrink: 0, boxShadow: "var(--shadow-md)", borderRadius: 3, overflow: "hidden" }}>
          <CoverArt book={book} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.01em" }}>
            {book.title}
          </div>
          <div className="serif italic muted" style={{ marginTop: 2, fontSize: 13 }}>{book.author}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <MenuItem
          icon={Icons.BookOpen}
          label={book.lastOpenedPage ? `Continue from page ${book.lastOpenedPage}` : "Start reading"}
          onClick={() => { onClose(); app.openReader(book.id); }}
        />
        <MenuItem icon={Icons.Play} label="Start from beginning" onClick={() => { onClose(); app.openReader(book.id, 1); }} />
        <MenuItem icon={Icons.Pencil} label="Edit details" onClick={() => { onClose(); app.openBook(book.id); }} />
        <MenuItem icon={Icons.Tag} label="Manage tags" onClick={() => { onClose(); app.openBook(book.id); }} />
        <MenuItem icon={Icons.Image} label="Change cover" onClick={() => { onClose(); app.openBook(book.id); }} />
        <div className="menu-divider" />
        <MenuItem icon={Icons.Trash} label="Delete book" danger onClick={() => { app.deleteBook(book.id); }} />
      </div>
    </BottomSheet>
  );
}

Object.assign(window, { Library, LongPressMenu });
