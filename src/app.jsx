// Main app — API-driven state, routing, mutations.
// Books/tags/prefs come from the backend; mock data in data.jsx is no longer
// seeded into state. The auth gate handles sign-in before this renders.

function App() {
  const session = useSession();

  const [route, setRoute] = useState({ name: "library" });
  const [routeStack, setRouteStack] = useState([{ name: "library" }]);

  const [books, setBooks] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [prefs, setPrefsState] = useState({ theme: "system", defaultPageMode: "horizontal" });

  const [library, setLibrary] = useState({ view: "grid", sort: "recent", q: "", tagFilter: null });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [longPressBookId, setLongPressBookId] = useState(null);
  const [toast, setToast] = useState({ open: false, text: "" });

  const showToast = (text) => {
    setToast({ open: true, text });
    setTimeout(() => setToast(t => ({ ...t, open: false })), 1800);
  };

  // ─────── Initial load: books, tags, preferences ───────
  useEffect(() => {
    if (!session) return;
    let alive = true;
    setLoading(true);
    Promise.all([
      window.api.books.list(),
      window.api.tags.list(),
      window.api.prefs.get(),
    ])
      .then(([booksRes, tagsRes, prefsRes]) => {
        if (!alive) return;
        const normalized = (booksRes?.books || []).map(window.api.normalizeBook);
        setBooks(normalized);
        setTags((tagsRes?.tags || []).map(window.api.normalizeTag));
        setPrefsState({
          theme: prefsRes?.theme || "system",
          defaultPageMode: prefsRes?.default_page_mode || "horizontal",
        });
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        console.error("Failed to load library:", err);
        setLoadError(err.message || "Failed to load library");
        setLoading(false);
      });
    return () => { alive = false; };
  }, [session]);

  // ─────── Theme — applied to <html data-theme> ───────
  useEffect(() => {
    const resolved = prefs.theme === "system"
      ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : prefs.theme;
    document.documentElement.setAttribute("data-theme", resolved);
  }, [prefs.theme]);

  // ─────── Routing helpers ───────
  const push = (r) => { setRoute(r); setRouteStack(s => [...s, r]); };
  const goBack = () => setRouteStack(s => {
    if (s.length <= 1) return s;
    const ns = s.slice(0, -1);
    setRoute(ns[ns.length - 1]);
    return ns;
  });
  const goHome = () => { setRoute({ name: "library" }); setRouteStack([{ name: "library" }]); };

  // ─────── Lazy book hydration (outline / bookmarks / notes) ───────
  // Called on detail/reader open. Idempotent — guarded by _hydrated flag.
  const hydrateBook = useCallback(async (bookId) => {
    const existing = books.find(b => b.id === bookId);
    if (!existing || existing._hydrated) return existing;
    try {
      const [detail, bmRes, noteRes, outlineRes] = await Promise.all([
        window.api.books.get(bookId),
        window.api.bookmarks.list(bookId),
        window.api.notes.list(bookId),
        window.api.outline.get(bookId),
      ]);
      const merged = {
        ...window.api.normalizeBook(detail),
        bookmarks: (bmRes?.bookmarks || []).map(window.api.normalizeBookmark),
        notes: (noteRes?.notes || []).map(window.api.normalizeNote),
        outline: window.api.normalizeOutlineEntries(outlineRes?.entries || []),
        _hydrated: true,
      };
      setBooks(bs => bs.map(b => b.id === bookId ? merged : b));
      return merged;
    } catch (err) {
      console.error("hydrateBook:", err);
      return existing;
    }
  }, [books]);

  const openBook = (bookId) => {
    push({ name: "detail", bookId });
    hydrateBook(bookId);
  };
  const openReader = (bookId, startPage) => {
    push({ name: "reader", bookId, startPage });
    hydrateBook(bookId);
  };
  const openUpload = () => setUploadOpen(true);
  const openSettings = () => push({ name: "settings" });
  const openLongPress = (bookId) => setLongPressBookId(bookId);

  // ─────── Preferences ───────
  const setPrefs = (patch) => {
    setPrefsState(p => ({ ...p, ...patch }));
    // Map UI → API payload
    const payload = {};
    if (patch.theme !== undefined) payload.theme = patch.theme;
    if (patch.defaultPageMode !== undefined) payload.default_page_mode = patch.defaultPageMode;
    if (Object.keys(payload).length === 0) return;
    window.api.prefs.update(payload).catch((err) => {
      console.error("setPrefs:", err);
      showToast("Couldn't save preference");
    });
  };

  // ─────── Resume position (debounced per book) ───────
  const resumeTimers = useRef({});
  const setResume = (bookId, page) => {
    setBooks(bs => bs.map(b => b.id === bookId
      ? { ...b, lastOpenedPage: page, lastOpenedAt: new Date().toISOString() }
      : b));
    clearTimeout(resumeTimers.current[bookId]);
    resumeTimers.current[bookId] = setTimeout(() => {
      window.api.books.resume(bookId, page).catch((err) => {
        console.error("setResume:", err);
      });
    }, 600);
  };

  // ─────── Bookmarks ───────
  const toggleBookmark = async (bookId, page) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const existing = book.bookmarks.find(bm => bm.page === page);

    if (existing) {
      // optimistic remove
      setBooks(bs => bs.map(b => b.id === bookId
        ? { ...b, bookmarks: b.bookmarks.filter(bm => bm.id !== existing.id) }
        : b));
      try {
        await window.api.bookmarks.delete(existing.id);
        showToast("Bookmark removed");
      } catch (err) {
        console.error("toggleBookmark.delete:", err);
        // rollback
        setBooks(bs => bs.map(b => b.id === bookId
          ? { ...b, bookmarks: [...b.bookmarks, existing] }
          : b));
        showToast("Couldn't remove bookmark");
      }
    } else {
      try {
        const created = await window.api.bookmarks.create(bookId, { page_number: page });
        const norm = window.api.normalizeBookmark(created);
        setBooks(bs => bs.map(b => b.id === bookId
          ? { ...b, bookmarks: [...b.bookmarks, norm] }
          : b));
        showToast("Bookmark added");
      } catch (err) {
        console.error("toggleBookmark.create:", err);
        showToast("Couldn't add bookmark");
      }
    }
  };

  const deleteBookmark = async (bookId, bmId) => {
    const book = books.find(b => b.id === bookId);
    const existing = book?.bookmarks.find(bm => bm.id === bmId);
    if (!existing) return;
    setBooks(bs => bs.map(b => b.id === bookId
      ? { ...b, bookmarks: b.bookmarks.filter(bm => bm.id !== bmId) }
      : b));
    try {
      await window.api.bookmarks.delete(bmId);
    } catch (err) {
      console.error("deleteBookmark:", err);
      setBooks(bs => bs.map(b => b.id === bookId
        ? { ...b, bookmarks: [...b.bookmarks, existing] }
        : b));
      showToast("Couldn't delete bookmark");
    }
  };

  const editBookmark = async (bookId, bmId, label) => {
    setBooks(bs => bs.map(b => b.id === bookId
      ? { ...b, bookmarks: b.bookmarks.map(bm => bm.id === bmId ? { ...bm, label } : bm) }
      : b));
    try {
      await window.api.bookmarks.update(bmId, { label });
    } catch (err) {
      console.error("editBookmark:", err);
      showToast("Couldn't update bookmark");
    }
  };

  // ─────── Notes ───────
  const addNote = async (bookId, page, body) => {
    try {
      const created = await window.api.notes.create(bookId, { page_number: page, body });
      const norm = window.api.normalizeNote(created);
      setBooks(bs => bs.map(b => b.id === bookId
        ? { ...b, notes: [...b.notes, norm] }
        : b));
      showToast("Note saved");
    } catch (err) {
      console.error("addNote:", err);
      showToast("Couldn't save note");
    }
  };

  const editNote = async (bookId, nId, body) => {
    const prev = books.find(b => b.id === bookId)?.notes.find(n => n.id === nId);
    setBooks(bs => bs.map(b => b.id === bookId
      ? { ...b, notes: b.notes.map(n => n.id === nId ? { ...n, body, updatedAt: new Date().toISOString() } : n) }
      : b));
    try {
      await window.api.notes.update(nId, { body });
    } catch (err) {
      console.error("editNote:", err);
      if (prev) {
        setBooks(bs => bs.map(b => b.id === bookId
          ? { ...b, notes: b.notes.map(n => n.id === nId ? prev : n) }
          : b));
      }
      showToast("Couldn't update note");
    }
  };

  const deleteNote = async (bookId, nId) => {
    const prev = books.find(b => b.id === bookId)?.notes.find(n => n.id === nId);
    setBooks(bs => bs.map(b => b.id === bookId
      ? { ...b, notes: b.notes.filter(n => n.id !== nId) }
      : b));
    try {
      await window.api.notes.delete(nId);
      showToast("Note deleted");
    } catch (err) {
      console.error("deleteNote:", err);
      if (prev) {
        setBooks(bs => bs.map(b => b.id === bookId
          ? { ...b, notes: [...b.notes, prev] }
          : b));
      }
      showToast("Couldn't delete note");
    }
  };

  // ─────── Tags ───────
  // addTag may be called with an object {id, name, color} from upload.jsx —
  // but in API mode, only {name, color} is real. We create on the server and
  // return the new tag id via callback. To preserve the existing call shape,
  // we expose a thin sync wrapper that kicks off creation and updates state.
  const addTag = (tag) => {
    // Optimistic insert with provisional id
    const provisional = { id: tag.id || `t-tmp-${Date.now()}`, name: tag.name, color: tag.color || null, _pending: true };
    setTags(ts => [...ts, provisional]);

    window.api.tags
      .create({ name: tag.name, color: tag.color || undefined })
      .then((created) => {
        setTags(ts => ts.map(t => t.id === provisional.id ? window.api.normalizeTag(created) : t));
      })
      .catch((err) => {
        console.error("addTag:", err);
        setTags(ts => ts.filter(t => t.id !== provisional.id));
        showToast(err.message?.includes("conflict") ? "Tag already exists" : "Couldn't create tag");
      });
  };

  // ─────── Book deletion ───────
  const deleteBook = async (bookId) => {
    const snapshot = books;
    setBooks(bs => bs.filter(b => b.id !== bookId));
    setLongPressBookId(null);
    if (route.name === "detail" && route.bookId === bookId) goHome();
    try {
      await window.api.books.delete(bookId);
      showToast("Book removed");
    } catch (err) {
      console.error("deleteBook:", err);
      setBooks(snapshot);
      showToast("Couldn't remove book");
    }
  };

  // ─────── Upload result hand-off ───────
  // The upload.jsx agent is responsible for: storage PUT, create, cover.
  // It calls this with the API book object (response of POST /api/books or
  // a refetched book.get); we normalize + prepend.
  const confirmUpload = (bookFromApi) => {
    if (!bookFromApi || !bookFromApi.id) {
      console.warn("confirmUpload called without a valid API book", bookFromApi);
      return;
    }
    const norm = window.api.normalizeBook(bookFromApi);
    setBooks(bs => [norm, ...bs.filter(b => b.id !== norm.id)]);
    showToast("Book added — preparing…");
  };

  // ─────── Sign out ───────
  const signOut = async () => {
    try {
      // Reset in-memory state immediately so the brief flash before
      // AuthGate re-renders doesn't show stale data.
      setBooks([]);
      setTags([]);
      setRoute({ name: "library" });
      setRouteStack([{ name: "library" }]);
      await session?.signOut?.();
    } catch (err) {
      console.error("signOut:", err);
      showToast("Couldn't sign out");
    }
  };

  const ctx = {
    books, tags, prefs, library,
    loading, loadError, session,
    setBooks, setTags, setPrefs, setLibrary,
    push, goBack, goHome,
    openBook, openReader, openUpload, openSettings, openLongPress,
    setResume, toggleBookmark, deleteBookmark, editBookmark,
    addNote, editNote, deleteNote, addTag, confirmUpload, deleteBook,
    hydrateBook, showToast, signOut,
  };

  return (
    <AppCtx.Provider value={ctx}>
      <Stage
        route={route}
        push={push}
        goHome={goHome}
        openUpload={openUpload}
        openSettings={openSettings}
        theme={prefs.theme === "system" ? "light" : prefs.theme}
        setTheme={(th) => setPrefs({ theme: th })}
      >
        {loading
          ? <LibraryLoading />
          : loadError
            ? <LibraryError message={loadError} />
            : <ScreenSwitcher route={route} />}
      </Stage>

      <UploadSheet open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <LongPressMenu bookId={longPressBookId} onClose={() => setLongPressBookId(null)} />
      <Toast open={toast.open} text={toast.text} />
    </AppCtx.Provider>
  );
}

function ScreenSwitcher({ route }) {
  if (route.name === "library")  return <Library />;
  if (route.name === "detail")   return <BookDetail bookId={route.bookId} />;
  if (route.name === "reader")   return <Reader bookId={route.bookId} startPage={route.startPage} />;
  if (route.name === "settings") return <Settings />;
  return <Library />;
}

function LibraryLoading() {
  return (
    <div className="page-container" style={{ padding: "80px 24px", textAlign: "center" }}>
      <div
        style={{
          width: 22, height: 22, margin: "0 auto 14px",
          border: "2px solid var(--line)",
          borderTopColor: "var(--accent)",
          borderRadius: "50%",
          animation: "auth-spin 0.8s linear infinite",
        }}
      />
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        Loading your library
      </div>
    </div>
  );
}

function LibraryError({ message }) {
  return (
    <div className="page-container" style={{ padding: "80px 24px", textAlign: "center" }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Something went wrong</div>
      <h1 className="display-1" style={{ marginBottom: 12 }}>Couldn't load your library.</h1>
      <p className="muted" style={{ maxWidth: 480, margin: "0 auto", fontSize: 14 }}>
        {message}
      </p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("app-root")).render(
  <AuthGate>
    <App />
  </AuthGate>
);
