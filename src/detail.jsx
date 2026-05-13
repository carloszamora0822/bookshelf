// Book detail — hero + collapsible sections

function BookDetail({ bookId }) {
  const app = useApp();
  const book = app.books.find(b => b.id === bookId);
  const [moreOpen, setMoreOpen] = useState(false);
  const [editMode, setEditMode] = useState(null); // null | "details" | "tags" | "cover"
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const coverFileInputRef = useRef(null);

  // Load the PDF only when the cover editor is open — avoids fetching the
  // file just to view a book's detail page. Cache by file_path so this
  // dovetails with the Reader's cache.
  const pdfSource = editMode === "cover" ? (book?.fileUrl || null) : null;
  const { doc: pdfDoc, loading: pdfLoading } = usePdfDoc(
    pdfSource,
    editMode === "cover" ? (book?.filePath || null) : null,
  );

  // updateBook helper — uses app.updateBook if present, else falls back to setBooks
  const updateBook = (id, patch) => {
    if (typeof app.updateBook === "function") return app.updateBook(id, patch);
    app.setBooks(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b));
  };

  if (!book) return null;
  const tagsOf = book.tagIds.map(id => app.tags.find(t => t.id === id)).filter(Boolean);

  const startEditDetails = () => {
    setEditTitle(book.title || "");
    setEditAuthor(book.author || "");
    setEditMode("details");
    setMoreOpen(false);
  };
  const saveDetails = () => {
    updateBook(book.id, { title: editTitle.trim() || book.title, author: editAuthor.trim() || null });
    setEditMode(null);
  };
  const cancelEdit = () => setEditMode(null);

  const toggleTag = (tagId) => {
    const has = book.tagIds.includes(tagId);
    updateBook(book.id, {
      tagIds: has ? book.tagIds.filter(x => x !== tagId) : [...book.tagIds, tagId],
    });
  };
  const createTagInline = () => {
    const name = newTagName.trim();
    if (!name) return;
    const id = `t-${Date.now()}`;
    const palette = ["#A0826D", "#7C8E73", "#9B7B89", "#7B8FA0", "#C09A6B", "#8B7B9B"];
    app.addTag({ id, name, color: palette[app.tags.length % palette.length] });
    updateBook(book.id, { tagIds: [...book.tagIds, id] });
    setNewTagName("");
  };

  const pickCoverPage = async (page) => {
    const prev = { coverPage: book.coverPage, coverMode: book.coverMode, coverUrl: book.coverUrl };
    updateBook(book.id, { coverPage: page, coverMode: "page" });
    try {
      // Render client-side from the PDF we already have loaded for the
      // picker, then POST as a file. Same code path as upload — avoids
      // the server-side node-canvas render entirely.
      if (!pdfDoc) throw new Error("PDF not loaded yet");
      const blob = await window.renderPdfPageToBlob(pdfDoc, page);
      const file = new File([blob], `cover-page-${page}.jpg`, { type: blob.type });
      const res = await window.api.books.cover(book.id, file);
      updateBook(book.id, {
        coverPage: page,
        coverMode: "page",
        coverPath: res.cover_path || null,
        coverUrl: res.cover_url || null,
      });
      app.showToast?.("Cover updated");
    } catch (err) {
      console.error("pickCoverPage:", err);
      updateBook(book.id, prev);
      app.showToast?.("Couldn't update cover");
    }
  };

  const uploadCoverImage = async (file) => {
    const prev = { coverMode: book.coverMode, coverUrl: book.coverUrl, coverPath: book.coverPath, coverPage: book.coverPage };
    try {
      const res = await window.api.books.cover(book.id, file);
      updateBook(book.id, {
        coverMode: res.cover_source || "upload",
        coverPage: res.cover_page ?? null,
        coverPath: res.cover_path || null,
        coverUrl: res.cover_url || null,
      });
      app.showToast?.("Cover updated");
    } catch (err) {
      console.error("uploadCoverImage:", err);
      updateBook(book.id, prev);
      app.showToast?.("Couldn't upload cover");
    }
  };

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
            <MenuItem icon={Icons.Pencil} label="Edit details" onClick={startEditDetails} />
            <MenuItem icon={Icons.Image} label="Change cover" onClick={() => { setEditMode("cover"); setMoreOpen(false); }} />
            <MenuItem icon={Icons.Tag} label="Manage tags" onClick={() => { setEditMode("tags"); setMoreOpen(false); }} />
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
          {editMode === "details" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "4px 0 10px" }}>
              <input
                autoFocus
                className="input"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveDetails(); if (e.key === "Escape") cancelEdit(); }}
                placeholder="Title"
              />
              <input
                className="input"
                value={editAuthor}
                onChange={e => setEditAuthor(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveDetails(); if (e.key === "Escape") cancelEdit(); }}
                placeholder="Author"
              />
              <div style={{ display: "flex", gap: 8 }}>
                <PrimaryBtn variant="accent" size="sm" onClick={saveDetails}>Save</PrimaryBtn>
                <PrimaryBtn variant="ghost" size="sm" onClick={cancelEdit}>Cancel</PrimaryBtn>
              </div>
            </div>
          ) : (
            <>
              <h1 className="detail-title">{book.title}</h1>
              {book.subtitle && <div className="detail-subtitle">{book.subtitle}</div>}
              <div className="detail-byline">by <em>{book.author}</em></div>
            </>
          )}

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

      {editMode === "tags" && (
        <div className="fade-up" style={{
          marginTop: 16, padding: "16px 18px",
          background: "var(--bg-sunk)", border: "1px solid var(--line)", borderRadius: 14,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div className="label">Manage tags</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(null)}>Done</button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {app.tags.map(t => (
              <TagPill
                key={t.id}
                tag={t}
                active={book.tagIds.includes(t.id)}
                onClick={() => toggleTag(t.id)}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input
              className="input"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createTagInline(); }}
              placeholder="New tag…"
              style={{ flex: 1 }}
            />
            <PrimaryBtn variant="ghost" size="sm" onClick={createTagInline}>Add</PrimaryBtn>
          </div>
        </div>
      )}

      {editMode === "cover" && (
        <div className="fade-up" style={{
          marginTop: 16, padding: "16px 18px",
          background: "var(--bg-sunk)", border: "1px solid var(--line)", borderRadius: 14,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <div className="label">Change cover</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(null)}>Done</button>
          </div>
          <div style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 12 }}>
            {pdfLoading && "Loading PDF…"}
            {!pdfLoading && !pdfDoc && "PDF isn't available yet — wait for extraction to finish, or upload an image."}
            {pdfDoc && `Tap any page to use it as the cover. ${pdfDoc.numPages.toLocaleString()} pages.`}
          </div>
          {pdfDoc && (
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(86px, 1fr))",
              gap: 14,
              maxHeight: "55vh", overflowY: "auto", paddingRight: 4,
            }}>
              {Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1).map(pageNum => {
                const active = book.coverMode === "page" && book.coverPage === pageNum;
                return (
                  <button key={pageNum} onClick={() => pickCoverPage(pageNum)} style={{ textAlign: "center" }}>
                    <div style={{
                      aspectRatio: "2/3",
                      background: "var(--bg)",
                      border: `1.5px solid ${active ? "var(--accent)" : "var(--line)"}`,
                      borderRadius: 4,
                      position: "relative",
                      overflow: "hidden",
                      transition: "border-color var(--tx-fast)",
                    }}>
                      <PdfPageThumb doc={pdfDoc} page={pageNum} />
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
          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <PrimaryBtn variant="ghost" size="sm" onClick={() => coverFileInputRef.current?.click()}>
              Upload an image
            </PrimaryBtn>
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) uploadCoverImage(f);
              }}
            />
          </div>
        </div>
      )}

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

function flattenOutline(entries) {
  const out = [];
  (entries || []).forEach(e => {
    out.push(e);
    if (e.children?.length) out.push(...flattenOutline(e.children));
  });
  return out;
}

function activeOutlineId(entries, currentPage) {
  if (currentPage == null) return null;
  const flat = flattenOutline(entries);
  let active = null;
  for (const e of flat) {
    const p = e.page ?? e.page_number;
    if (p != null && p <= currentPage) active = e;
  }
  return active ? active.id : null;
}

function OutlineTree({ entries, onJump, currentPage = null, depth = 0, activeId }) {
  // top-level computes activeId once; children inherit it
  const aid = depth === 0 ? activeOutlineId(entries, currentPage) : activeId;
  return (
    <div className="outline-tree">
      {entries.map(e => {
        const isCurrent = aid != null && e.id === aid;
        return (
          <Fragment key={e.id}>
            <button
              className={`outline-entry depth-${depth}${isCurrent ? " is-current" : ""}`}
              aria-current={isCurrent ? "page" : undefined}
              onClick={() => e.page && onJump(e.page)}
              style={isCurrent ? { color: "var(--accent)", fontWeight: 500 } : undefined}
            >
              <div className="title">{e.title}</div>
              {e.page != null && <div className="page-num">{e.page}</div>}
            </button>
            {e.children?.length > 0 && (
              <OutlineTree entries={e.children} onJump={onJump} depth={depth + 1} activeId={aid} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function EmptyMicro({ text }) {
  return <div style={{ padding: "16px 0", color: "var(--ink-4)", fontSize: 13, fontStyle: "italic" }}>{text}</div>;
}

Object.assign(window, { BookDetail, outlineCount, OutlineTree });
