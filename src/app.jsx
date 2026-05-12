// Main app — state, "routing", mutations, Tweaks

function App() {
  // ────────────── Device + theme ──────────────
  const [deviceMode, setDeviceMode] = useState("phone");

  // Tweaks
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": "sage",
    "serif": "newsreader",
    "coverRadius": 4,
    "showProgress": true,
    "density": "regular"
  }/*EDITMODE-END*/;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // ────────────── State ──────────────
  const [route, setRoute] = useState({ name: "library" });
  const [routeStack, setRouteStack] = useState([{ name: "library" }]);
  const [books, setBooks] = useState(BOOKS);
  const [tags, setTags] = useState(TAGS);

  const [prefs, setPrefsState] = useState({ theme: "light", defaultPageMode: "horizontal" });
  const [library, setLibrary] = useState({ view: "grid", sort: "recent", q: "", tagFilter: null });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [longPressBookId, setLongPressBookId] = useState(null);
  const [toast, setToast] = useState({ open: false, text: "" });

  const showToast = (text) => {
    setToast({ open: true, text });
    setTimeout(() => setToast(t => ({ ...t, open: false })), 1800);
  };

  // Theme — wire to <html> data-theme
  useEffect(() => {
    const resolved = prefs.theme === "system" ? "light" : prefs.theme;
    document.documentElement.setAttribute("data-theme", resolved);
  }, [prefs.theme]);

  // Accent CSS swap
  useEffect(() => {
    const map = {
      sage:      { light: "oklch(0.52 0.06 145)", lightSoft: "oklch(0.92 0.03 145)", lightInk: "oklch(0.38 0.06 145)",
                   dark:  "oklch(0.74 0.07 145)", darkSoft:  "oklch(0.32 0.04 145)", darkInk:  "oklch(0.82 0.08 145)" },
      terracotta:{ light: "oklch(0.58 0.10 40)",  lightSoft: "oklch(0.94 0.04 40)", lightInk: "oklch(0.42 0.10 40)",
                   dark:  "oklch(0.74 0.10 40)",  darkSoft:  "oklch(0.34 0.06 40)", darkInk:  "oklch(0.84 0.10 40)" },
      ink:       { light: "oklch(0.48 0.08 250)", lightSoft: "oklch(0.93 0.03 250)",lightInk: "oklch(0.36 0.08 250)",
                   dark:  "oklch(0.70 0.10 250)", darkSoft:  "oklch(0.30 0.05 250)",darkInk:  "oklch(0.80 0.10 250)" },
    }[t.accent || "sage"];
    if (!map) return;
    let style = document.getElementById("accent-vars");
    if (!style) { style = document.createElement("style"); style.id = "accent-vars"; document.head.appendChild(style); }
    style.textContent = `
      :root { --accent: ${map.light}; --accent-soft: ${map.lightSoft}; --accent-ink: ${map.lightInk}; }
      [data-theme="dark"] { --accent: ${map.dark}; --accent-soft: ${map.darkSoft}; --accent-ink: ${map.darkInk}; }
    `;
  }, [t.accent]);

  // Serif swap
  useEffect(() => {
    const stack = {
      newsreader: '"Newsreader", Charter, Georgia, serif',
      sourceserif: '"Source Serif 4", "Source Serif Pro", Charter, Georgia, serif',
      charter: 'Charter, "Iowan Old Style", Georgia, serif',
    }[t.serif || "newsreader"];
    let style = document.getElementById("serif-vars");
    if (!style) { style = document.createElement("style"); style.id = "serif-vars"; document.head.appendChild(style); }
    style.textContent = `:root { --serif: ${stack}; }`;
    // Lazy-load Source Serif 4 if needed
    if (t.serif === "sourceserif" && !document.getElementById("ss4-font")) {
      const l = document.createElement("link");
      l.id = "ss4-font"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,300..700&display=swap";
      document.head.appendChild(l);
    }
  }, [t.serif]);

  // ────────────── Routing helpers ──────────────
  const push = (r) => { setRoute(r); setRouteStack(s => [...s, r]); };
  const goBack = () => setRouteStack(s => {
    if (s.length <= 1) return s;
    const ns = s.slice(0, -1); setRoute(ns[ns.length - 1]); return ns;
  });
  const goHome = () => { setRoute({ name: "library" }); setRouteStack([{ name: "library" }]); };

  const openBook = (bookId) => push({ name: "detail", bookId });
  const openReader = (bookId, startPage) => push({ name: "reader", bookId, startPage });
  const openUpload = () => setUploadOpen(true);
  const openSettings = () => push({ name: "settings" });
  const openLongPress = (bookId) => setLongPressBookId(bookId);

  // ────────────── Mutations ──────────────
  const setPrefs = (patch) => setPrefsState(p => ({ ...p, ...patch }));

  const setResume = (bookId, page) => {
    setBooks(bs => bs.map(b => b.id === bookId ? { ...b, lastOpenedPage: page, lastOpenedAt: new Date().toISOString() } : b));
  };

  const toggleBookmark = (bookId, page) => {
    setBooks(bs => bs.map(b => {
      if (b.id !== bookId) return b;
      const has = b.bookmarks.some(bm => bm.page === page);
      const updated = has
        ? { ...b, bookmarks: b.bookmarks.filter(bm => bm.page !== page) }
        : { ...b, bookmarks: [...b.bookmarks, { id: `bm-${Date.now()}`, page, label: null, createdAt: dateStr() }] };
      return updated;
    }));
    showToast(books.find(b => b.id === bookId)?.bookmarks.some(bm => bm.page === page) ? "Bookmark removed" : "Bookmark added");
  };

  const deleteBookmark = (bookId, bmId) => {
    setBooks(bs => bs.map(b => b.id === bookId ? { ...b, bookmarks: b.bookmarks.filter(bm => bm.id !== bmId) } : b));
  };
  const editBookmark = (bookId, bmId, label) => {
    setBooks(bs => bs.map(b => b.id === bookId ? { ...b, bookmarks: b.bookmarks.map(bm => bm.id === bmId ? { ...bm, label } : bm) } : b));
  };

  const addNote = (bookId, page, body) => {
    setBooks(bs => bs.map(b => b.id === bookId
      ? { ...b, notes: [...b.notes, { id: `n-${Date.now()}`, page, body, createdAt: dateStr(), updatedAt: dateStr() }] }
      : b));
    showToast("Note saved");
  };
  const editNote = (bookId, nId, body) => {
    setBooks(bs => bs.map(b => b.id === bookId ? { ...b, notes: b.notes.map(n => n.id === nId ? { ...n, body, updatedAt: dateStr() } : n) } : b));
  };
  const deleteNote = (bookId, nId) => {
    setBooks(bs => bs.map(b => b.id === bookId ? { ...b, notes: b.notes.filter(n => n.id !== nId) } : b));
    showToast("Note deleted");
  };

  const addTag = (tag) => setTags(ts => [...ts, tag]);

  const confirmUpload = (draft) => {
    const id = `b-${Date.now()}`;
    const newBook = {
      id, title: draft.title || "Untitled", author: draft.author || null,
      coverKey: "selfreliance", // fallback cover
      pageCount: draft.pageCount,
      lastOpenedPage: null, lastOpenedAt: null,
      addedAt: new Date().toISOString(),
      tagIds: draft.tagIds,
      fileSize: "—",
      extractionStatus: "processing",
      hasOutline: false,
      pageSrc: "walden",
      outline: [],
      bookmarks: [], notes: [],
    };
    setBooks(bs => [newBook, ...bs]);
    showToast("Book added — preparing…");
    // simulate extraction finishing
    setTimeout(() => {
      setBooks(bs => bs.map(b => b.id === id ? { ...b, extractionStatus: "completed", hasOutline: true } : b));
    }, 2400);
  };

  // ────────────── Render ──────────────
  const ctx = {
    books, tags, prefs, library, viewportClass: deviceMode,
    setBooks, setTags, setPrefs, setLibrary,
    push, goBack, goHome,
    openBook, openReader, openUpload, openSettings, openLongPress,
    setResume, toggleBookmark, deleteBookmark, editBookmark,
    addNote, editNote, deleteNote, addTag, confirmUpload,
    tweaks: t, setTweak,
  };

  return (
    <AppCtx.Provider value={ctx}>
      <Stage deviceMode={deviceMode} setDeviceMode={setDeviceMode}
        theme={prefs.theme === "system" ? "light" : prefs.theme}
        setTheme={(th) => setPrefs({ theme: th })}>
        <ScreenSwitcher route={route} />
        <UploadSheet open={uploadOpen} onClose={() => setUploadOpen(false)} />
        <LongPressMenu bookId={longPressBookId} onClose={() => setLongPressBookId(null)} />
        <Toast open={toast.open} text={toast.text} />
      </Stage>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Color" />
        <TweakRadio label="Accent" value={t.accent}
          options={[
            { value: "sage",       label: "Sage" },
            { value: "terracotta", label: "Terracotta" },
            { value: "ink",        label: "Ink" },
          ]}
          onChange={(v) => setTweak("accent", v)} />

        <TweakSection label="Typography" />
        <TweakRadio label="Reading serif" value={t.serif}
          options={[
            { value: "newsreader",  label: "Newsreader" },
            { value: "sourceserif", label: "Source Serif" },
            { value: "charter",     label: "Charter" },
          ]}
          onChange={(v) => setTweak("serif", v)} />

        <TweakSection label="Library" />
        <TweakRadio label="Density" value={t.density}
          options={["compact", "regular"]}
          onChange={(v) => setTweak("density", v)} />
        <TweakToggle label="Position bars" value={t.showProgress}
          onChange={(v) => setTweak("showProgress", v)} />
        <TweakSlider label="Cover radius" value={t.coverRadius}
          min={0} max={14} step={1} unit="px"
          onChange={(v) => setTweak("coverRadius", v)} />
      </TweaksPanel>
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
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// Boot
ReactDOM.createRoot(document.getElementById("app-root")).render(<App />);
