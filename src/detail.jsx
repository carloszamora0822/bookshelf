// Book detail — hero + collapsible sections

function BookDetail({ bookId }) {
  const app = useApp();
  const book = app.books.find(b => b.id === bookId);
  const [moreOpen, setMoreOpen] = useState(false);

  if (!book) return null;
  const tagsOf = book.tagIds.map(id => app.tags.find(t => t.id === id)).filter(Boolean);

  return (
    <div className="page-container">
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={app.goBack}>
          <Icons.ArrowLeft size={14} />
          <span>Library</span>
        </button>
        <div style={{ position: "relative" }}>
          <IconButton icon={Icons.More} label="more" onClick={() => setMoreOpen(o => !o)} />
          <Menu open={moreOpen} onClose={() => setMoreOpen(false)} anchor="right">
            <MenuItem icon={Icons.Pencil} label="Edit details" onClick={() => setMoreOpen(false)} />
            <MenuItem icon={Icons.Image} label="Change cover" onClick={() => setMoreOpen(false)} />
            <MenuItem icon={Icons.Tag} label="Manage tags" onClick={() => setMoreOpen(false)} />
            <div className="menu-divider" />
            <MenuItem icon={Icons.Trash} label="Delete book" danger onClick={() => { app.deleteBook(book.id); setMoreOpen(false); }} />
          </Menu>
        </div>
      </div>

      {/* Hero */}
      <div className="detail-hero fade-up">
        <div className="cover-block">
          <div className="cover">
            <CoverArt book={book} />
          </div>
        </div>

        <div className="info">
          <div className="eyebrow">
            {book.fileSize && book.fileSize !== "—" ? `${book.fileSize.toUpperCase()} · ` : ""}{book.pageCount} pages
          </div>
          <h1 className="detail-title">{book.title}</h1>
          {book.subtitle && <div className="detail-subtitle">{book.subtitle}</div>}
          <div className="detail-byline">by <em>{book.author}</em></div>

          {tagsOf.length > 0 && (
            <div className="detail-tag-row">
              {tagsOf.map(t => <TagPill key={t.id} tag={t} />)}
            </div>
          )}

          {book.lastOpenedPage && (
            <div className="detail-progress">
              <div className="row">
                <span>page {book.lastOpenedPage}</span>
                <span>{Math.round((book.lastOpenedPage / book.pageCount) * 100)}%</span>
              </div>
              <div className="track">
                <span className="fill" style={{ width: `${(book.lastOpenedPage / book.pageCount) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="detail-actions">
            <PrimaryBtn variant="accent" leadIcon={Icons.BookOpen} onClick={() => app.openReader(book.id)}>
              {book.lastOpenedPage ? `Continue · p.${book.lastOpenedPage}` : "Start reading"}
            </PrimaryBtn>
            {book.lastOpenedPage && (
              <PrimaryBtn variant="ghost" leadIcon={Icons.Play} onClick={() => app.openReader(book.id, 1)}>
                From beginning
              </PrimaryBtn>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-strip fade-up delay-1">
        <div className="stat">
          <div className="value">{book.hasOutline ? outlineCount(book.outline) : "—"}</div>
          <div className="label">TOC entries</div>
        </div>
        <div className="stat">
          <div className="value">{book.bookmarks.length}</div>
          <div className="label">Bookmarks</div>
        </div>
        <div className="stat">
          <div className="value">{book.notes.length}</div>
          <div className="label">Notes</div>
        </div>
      </div>

      {/* Collapsible sections */}
      <div style={{ marginTop: 16 }}>
        {book.hasOutline ? (
          <details className="section-pane fade-up delay-2" open>
            <summary>
              <h3>Table of <em>contents</em></h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <span className="count">{outlineCount(book.outline)}</span>
                <span className="chev"><Icons.ChevDown size={16} /></span>
              </div>
            </summary>
            <div style={{ paddingTop: 10 }}>
              <OutlineTree entries={book.outline} onJump={(p) => app.openReader(book.id, p)} />
            </div>
          </details>
        ) : (
          <div style={{ marginTop: 24, padding: "14px 18px", border: "1px dashed var(--line)", borderRadius: 12, color: "var(--ink-4)", fontSize: 13, fontStyle: "italic" }}>
            This PDF has no embedded outline.
          </div>
        )}

        <details className="section-pane fade-up delay-3" open>
          <summary>
            <h3><em>Bookmarks</em></h3>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span className="count">{book.bookmarks.length}</span>
              <span className="chev"><Icons.ChevDown size={16} /></span>
            </div>
          </summary>
          <div style={{ paddingTop: 10 }}>
            {book.bookmarks.length === 0 ? (
              <EmptyMicro text="No bookmarks yet." />
            ) : (
              book.bookmarks.slice().sort((a, b) => a.page - b.page).map(bm => (
                <button key={bm.id} className="bookmark-row" onClick={() => app.openReader(book.id, bm.page)}>
                  <div className="page-tag">{bm.page}</div>
                  <div className="info">
                    <div className={`title ${!bm.label ? "is-empty" : ""}`}>{bm.label || `Page ${bm.page}`}</div>
                    <div className="date">{bm.createdAt}</div>
                  </div>
                  <Icons.ChevRight size={14} style={{ color: "var(--ink-4)", alignSelf: "center" }} />
                </button>
              ))
            )}
          </div>
        </details>

        <details className="section-pane fade-up delay-4" open>
          <summary>
            <h3><em>Notes</em></h3>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span className="count">{book.notes.length}</span>
              <span className="chev"><Icons.ChevDown size={16} /></span>
            </div>
          </summary>
          <div style={{ paddingTop: 10 }}>
            {book.notes.length === 0 ? (
              <EmptyMicro text="No notes yet." />
            ) : (
              book.notes.slice().sort((a, b) => a.page - b.page).map(n => (
                <button key={n.id} className="note-row" onClick={() => app.openReader(book.id, n.page)}>
                  <div className="page-tag">{n.page}</div>
                  <div className="info">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                      <div className="eyebrow" style={{ fontSize: 10, color: "var(--accent-ink)" }}>PAGE {n.page}</div>
                      <div className="date">{n.updatedAt}</div>
                    </div>
                    <div className="body">{n.body}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

function outlineCount(entries) {
  return (entries || []).reduce((n, e) => n + 1 + outlineCount(e.children || []), 0);
}

function OutlineTree({ entries, onJump, depth = 0 }) {
  return (
    <div className="outline-tree">
      {entries.map(e => (
        <Fragment key={e.id}>
          <button
            className={`outline-entry depth-${depth}`}
            onClick={() => e.page && onJump(e.page)}
          >
            <div className="title">{e.title}</div>
            {e.page != null && <div className="page-num">{e.page}</div>}
          </button>
          {e.children?.length > 0 && (
            <OutlineTree entries={e.children} onJump={onJump} depth={depth + 1} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

function EmptyMicro({ text }) {
  return <div style={{ padding: "16px 0", color: "var(--ink-4)", fontSize: 13, fontStyle: "italic" }}>{text}</div>;
}

Object.assign(window, { BookDetail, outlineCount, OutlineTree });
