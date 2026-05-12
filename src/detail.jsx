// Book detail — hero, three actions, collapsible TOC / Bookmarks / Notes sections

function BookDetail({ bookId }) {
  const app = useApp();
  const book = app.books.find(b => b.id === bookId);
  const isTablet = app.viewportClass === "tablet";
  const [moreOpen, setMoreOpen] = useState(false);
  const [open, setOpen] = useState({ toc: true, bookmarks: true, notes: true });

  if (!book) return null;
  const tagsOf = book.tagIds.map(id => app.tags.find(t => t.id === id)).filter(Boolean);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isTablet ? "16px 32px 8px" : "10px 18px 6px",
      }}>
        <IconButton icon={Icons.ArrowLeft} label="back" size={20} padding={9} onClick={app.goBack} />
        <div style={{ position: "relative" }}>
          <IconButton icon={Icons.More} label="more" size={18} padding={9} onClick={() => setMoreOpen(o => !o)} />
          <Menu open={moreOpen} onClose={() => setMoreOpen(false)} anchor="right">
            <MenuItem icon={Icons.Pencil} label="Edit details" onClick={() => setMoreOpen(false)} />
            <MenuItem icon={Icons.Image} label="Change cover" onClick={() => setMoreOpen(false)} />
            <MenuItem icon={Icons.Tag} label="Manage tags" onClick={() => setMoreOpen(false)} />
            <div style={{ height: 1, background: "var(--line-2)", margin: "5px 6px" }} />
            <MenuItem icon={Icons.Trash} label="Delete book" danger onClick={() => setMoreOpen(false)} />
          </Menu>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", paddingBottom: 36 }}>
        {/* Hero */}
        <div style={{
          padding: isTablet ? "20px 32px 24px" : "12px 22px 18px",
          display: "flex",
          flexDirection: isTablet ? "row" : "column",
          alignItems: isTablet ? "flex-end" : "center",
          gap: isTablet ? 32 : 18,
          textAlign: isTablet ? "left" : "center",
        }}>
          <div style={{ flexShrink: 0 }}>
            <CoverArt book={book} w={isTablet ? 200 : 168} h={isTablet ? 300 : 252} radius={4} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-4)",
              letterSpacing: "0.16em",
            }}>
              {book.fileSize.toUpperCase()} · {book.pageCount} PAGES
            </div>
            <h1 style={{
              margin: "8px 0 4px",
              fontFamily: "var(--serif)",
              fontSize: isTablet ? 36 : 28,
              fontWeight: 500, letterSpacing: "-0.02em",
              color: "var(--ink)", lineHeight: 1.1,
              textWrap: "balance",
            }}>{book.title}</h1>
            {book.subtitle && (
              <div style={{
                fontFamily: "var(--serif)", fontStyle: "italic",
                fontSize: isTablet ? 17 : 15, color: "var(--ink-2)",
              }}>{book.subtitle}</div>
            )}
            <div style={{ marginTop: 8, color: "var(--ink-2)", fontSize: 14 }}>
              by <span style={{ fontFamily: "var(--serif)", fontStyle: "italic" }}>{book.author}</span>
            </div>
            {tagsOf.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14, justifyContent: isTablet ? "flex-start" : "center" }}>
                {tagsOf.map(t => <TagPill key={t.id} tag={t} />)}
              </div>
            )}

            {/* Position indicator */}
            {book.lastOpenedPage && (
              <div style={{ marginTop: 18, maxWidth: 280, marginInline: isTablet ? 0 : "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-4)", marginBottom: 5 }}>
                  <span>page {book.lastOpenedPage}</span>
                  <span>{book.pageCount}</span>
                </div>
                <div style={{ height: 2, borderRadius: 999, background: "var(--line)" }}>
                  <div style={{ width: `${(book.lastOpenedPage / book.pageCount) * 100}%`, height: "100%", background: "var(--ink-2)", borderRadius: 999 }} />
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{
              marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap",
              justifyContent: isTablet ? "flex-start" : "center",
            }}>
              <PrimaryBtn leadIcon={Icons.BookOpen} onClick={() => app.openReader(book.id)}>
                {book.lastOpenedPage ? `Continue · p.${book.lastOpenedPage}` : "Start reading"}
              </PrimaryBtn>
              <PrimaryBtn variant="ghost" leadIcon={Icons.Play} onClick={() => app.openReader(book.id, 1)}>
                From beginning
              </PrimaryBtn>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{
          margin: isTablet ? "0 32px" : "0 22px",
          padding: "14px 0",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        }}>
          <Stat label="TOC entries" value={book.hasOutline ? outlineCount(book.outline) : "—"} />
          <Stat label="Bookmarks"  value={book.bookmarks.length} />
          <Stat label="Notes"      value={book.notes.length} />
        </div>

        {/* Collapsible sections */}
        <div style={{ padding: isTablet ? "20px 32px" : "16px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
          {book.hasOutline ? (
            <Collapsible
              title="Table of contents"
              count={outlineCount(book.outline)}
              open={open.toc}
              onToggle={() => setOpen(o => ({ ...o, toc: !o.toc }))}
            >
              <OutlineTree entries={book.outline} onJump={(p) => app.openReader(book.id, p)} />
            </Collapsible>
          ) : (
            <div style={{
              padding: "14px 16px", border: "1px dashed var(--line)", borderRadius: 12,
              color: "var(--ink-4)", fontSize: 12.5, fontStyle: "italic",
            }}>This PDF has no embedded outline.</div>
          )}

          <Collapsible
            title="Bookmarks"
            count={book.bookmarks.length}
            open={open.bookmarks}
            onToggle={() => setOpen(o => ({ ...o, bookmarks: !o.bookmarks }))}
          >
            {book.bookmarks.length === 0 ? (
              <EmptyMicro text="No bookmarks yet" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {book.bookmarks.sort((a, b) => a.page - b.page).map((bm, i, arr) => (
                  <button key={bm.id} onClick={() => app.openReader(book.id, bm.page)} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "12px 4px", textAlign: "left",
                    borderTop: i === 0 ? "none" : "1px solid var(--line-2)",
                    cursor: "pointer",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: "var(--accent-soft)", color: "var(--accent-ink)",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--serif)", fontSize: 13, fontWeight: 500,
                    }}>{bm.page}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "var(--serif)", fontSize: 14.5, color: "var(--ink)",
                        fontStyle: bm.label ? "normal" : "italic",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>{bm.label || `Page ${bm.page}`}</div>
                      <div style={{ color: "var(--ink-4)", fontSize: 11, marginTop: 2, fontFamily: "var(--mono)" }}>
                        {bm.createdAt}
                      </div>
                    </div>
                    <Icons.ChevRight size={14} style={{ color: "var(--ink-4)" }} />
                  </button>
                ))}
              </div>
            )}
          </Collapsible>

          <Collapsible
            title="Notes"
            count={book.notes.length}
            open={open.notes}
            onToggle={() => setOpen(o => ({ ...o, notes: !o.notes }))}
          >
            {book.notes.length === 0 ? (
              <EmptyMicro text="No notes yet" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {book.notes.sort((a, b) => a.page - b.page).map((n, i) => (
                  <button key={n.id} onClick={() => app.openReader(book.id, n.page)} style={{
                    display: "flex", flexDirection: "column", gap: 6,
                    padding: "12px 4px", textAlign: "left",
                    borderTop: i === 0 ? "none" : "1px solid var(--line-2)",
                    cursor: "pointer",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--accent-ink)", letterSpacing: "0.06em" }}>
                        PAGE {n.page}
                      </div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-4)" }}>{n.updatedAt}</div>
                    </div>
                    <div style={{
                      fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.45,
                      overflow: "hidden", display: "-webkit-box",
                      WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    }}>{n.body}</div>
                  </button>
                ))}
              </div>
            )}
          </Collapsible>
        </div>
      </div>
    </div>
  );
}

function outlineCount(entries) {
  return (entries || []).reduce((n, e) => n + 1 + outlineCount(e.children || []), 0);
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.01em" }}>{value}</div>
      <div style={{ fontSize: 10.5, color: "var(--ink-4)", letterSpacing: "0.1em", marginTop: 2, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function Collapsible({ title, count, open, onToggle, children }) {
  return (
    <section>
      <button onClick={onToggle} style={{
        width: "100%",
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        padding: "6px 0", cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h3 style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 18, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.012em", whiteSpace: "nowrap" }}>
            {title}
          </h3>
          {count != null && (
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>
              {count}
            </span>
          )}
        </div>
        <span style={{ color: "var(--ink-3)", transform: `rotate(${open ? 180 : 0}deg)`, transition: "transform 200ms ease" }}>
          <Icons.ChevDown size={16} />
        </span>
      </button>
      <div style={{
        overflow: "hidden",
        maxHeight: open ? 2000 : 0,
        opacity: open ? 1 : 0,
        transition: "max-height 320ms ease, opacity 200ms ease",
        marginTop: open ? 6 : 0,
      }}>
        {children}
      </div>
    </section>
  );
}

function OutlineTree({ entries, onJump, depth = 0 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {entries.map((e, i) => (
        <React.Fragment key={e.id}>
          <button onClick={() => e.page && onJump(e.page)} style={{
            display: "flex", alignItems: "baseline", gap: 12,
            padding: "9px 0 9px",
            paddingLeft: depth * 18,
            textAlign: "left", cursor: "pointer",
            borderTop: i === 0 && depth === 0 ? "none" : "1px solid var(--line-2)",
          }}>
            <div style={{
              flex: 1, minWidth: 0,
              fontFamily: depth === 0 ? "var(--serif)" : "var(--sans)",
              fontSize: depth === 0 ? 14.5 : 13,
              fontWeight: depth === 0 ? 500 : 450,
              color: depth === 0 ? "var(--ink)" : "var(--ink-2)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              letterSpacing: depth === 0 ? "-0.005em" : "0",
            }}>{e.title}</div>
            <div style={{
              flexShrink: 0,
              fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)",
              minWidth: 30, textAlign: "right",
            }}>{e.page}</div>
          </button>
          {e.children?.length > 0 && <OutlineTree entries={e.children} onJump={onJump} depth={depth + 1} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function EmptyMicro({ text }) {
  return (
    <div style={{ padding: "14px 0", color: "var(--ink-4)", fontSize: 12.5, fontStyle: "italic" }}>{text}</div>
  );
}

Object.assign(window, { BookDetail, outlineCount, OutlineTree });
