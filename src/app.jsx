// Main app — state, routing, mutations

function App() {
  const [route, setRoute] = useState({ name: "library" });
  const [routeStack, setRouteStack] = useState([{ name: "library" }]);
  const [books, setBooks] = useState(BOOKS);
  const [tags, setTags] = useState(TAGS);

  const [prefs, setPrefsState] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("bookshelf:prefs") || "null");
      if (stored) return stored;
    } catch {}
    const sys = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    return { theme: sys, defaultPageMode: "horizontal" };
  });

  const [library, setLibrary] = useState({ view: "grid", sort: "recent", q: "", tagFilter: null });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [longPressBookId, setLongPressBookId] = useState(null);
  const [toast, setToast] = useState({ open: false, text: "" });

  const showToast = (text) => {
    setToast({ open: true, text });
    setTimeout(() => setToast(t => ({ ...t, open: false })), 1800);
  };

  // Theme — wire to <html data-theme>
  useEffect(() => {
    const resolved = prefs.theme === "system"
      ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : prefs.theme;
    document.documentElement.setAttribute("data-theme", resolved);
    try { localStorage.setItem("bookshelf:prefs", JSON.stringify(prefs)); } catch {}
  }, [prefs]);

  // Routing helpers
  const push = (r) => { setRoute(r); setRouteStack(s => [...s, r]); };
  const goBack = () => setRouteStack(s => {
    if (s.length <= 1) return s;
    const ns = s.slice(0, -1);
    setRoute(ns[ns.length - 1]);
    return ns;
  });
  const goHome = () => { setRoute({ name: "library" }); setRouteStack([{ name: "library" }]); };

  const openBook = (bookId) => push({ name: "detail", bookId });
  const openReader = (bookId, startPage) => push({ name: "reader", bookId, startPage });
  const openUpload = () => setUploadOpen(true);
  const openSettings = () => push({ name: "settings" });
  const openLongPress = (bookId) => setLongPressBookId(bookId);

  const setPrefs = (patch) => setPrefsState(p => ({ ...p, ...patch }));

  const setResume = (bookId, page) => {
    setBooks(bs => bs.map(b => b.id === bookId
      ? { ...b, lastOpenedPage: page, lastOpenedAt: new Date().toISOString() }
      : b));
  };

  const toggleBookmark = (bookId, page) => {
    let wasBookmarked = false;
    setBooks(bs => bs.map(b => {
      if (b.id !== bookId) return b;
      const has = b.bookmarks.some(bm => bm.page === page);
      wasBookmarked = has;
      return has
        ? { ...b, bookmarks: b.bookmarks.filter(bm => bm.page !== page) }
        : { ...b, bookmarks: [...b.bookmarks, { id: `bm-${Date.now()}`, page, label: null, createdAt: dateStr() }] };
    }));
    showToast(wasBookmarked ? "Bookmark removed" : "Bookmark added");
  };

  const deleteBookmark = (bookId, bmId) => {
    setBooks(bs => bs.map(b => b.id === bookId
      ? { ...b, bookmarks: b.bookmarks.filter(bm => bm.id !== bmId) }
      : b));
  };
  const editBookmark = (bookId, bmId, label) => {
    setBooks(bs => bs.map(b => b.id === bookId
      ? { ...b, bookmarks: b.bookmarks.map(bm => bm.id === bmId ? { ...bm, label } : bm) }
      : b));
  };

  const addNote = (bookId, page, body) => {
    setBooks(bs => bs.map(b => b.id === bookId
      ? { ...b, notes: [...b.notes, { id: `n-${Date.now()}`, page, body, createdAt: dateStr(), updatedAt: dateStr() }] }
      : b));
    showToast("Note saved");
  };
  const editNote = (bookId, nId, body) => {
    setBooks(bs => bs.map(b => b.id === bookId
      ? { ...b, notes: b.notes.map(n => n.id === nId ? { ...n, body, updatedAt: dateStr() } : n) }
      : b));
  };
  const deleteNote = (bookId, nId) => {
    setBooks(bs => bs.map(b => b.id === bookId
      ? { ...b, notes: b.notes.filter(n => n.id !== nId) }
      : b));
    showToast("Note deleted");
  };

  const deleteBook = (bookId) => {
    setBooks(bs => bs.filter(b => b.id !== bookId));
    setLongPressBookId(null);
    if (route.name === "detail" && route.bookId === bookId) goHome();
    showToast("Book removed");
  };

  const addTag = (tag) => setTags(ts => [...ts, tag]);

  const confirmUpload = (draft) => {
    const id = `b-${Date.now()}`;
    const newBook = {
      id,
      title: draft.title || "Untitled",
      author: draft.author || null,
      coverKey: "selfreliance",
      pageCount: draft.pageCount,
      lastOpenedPage: null,
      lastOpenedAt: null,
      addedAt: new Date().toISOString(),
      tagIds: draft.tagIds,
      fileSize: "—",
      extractionStatus: "processing",
      hasOutline: false,
      pageSrc: "walden",
      outline: [],
      bookmarks: [],
      notes: [],
    };
    setBooks(bs => [newBook, ...bs]);
    showToast("Book added — preparing…");
    setTimeout(() => {
      setBooks(bs => bs.map(b => b.id === id
        ? { ...b, extractionStatus: "completed", hasOutline: true }
        : b));
    }, 2400);
  };

  const ctx = {
    books, tags, prefs, library,
    setBooks, setTags, setPrefs, setLibrary,
    push, goBack, goHome,
    openBook, openReader, openUpload, openSettings, openLongPress,
    setResume, toggleBookmark, deleteBookmark, editBookmark,
    addNote, editNote, deleteNote, addTag, confirmUpload, deleteBook,
    showToast,
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
        <ScreenSwitcher route={route} />
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

function dateStr() {
  return new Date().toISOString().slice(0, 10);
}

ReactDOM.createRoot(document.getElementById("app-root")).render(<App />);
