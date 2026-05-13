// Responsive app shell — nav rail (desktop) + bottom nav (mobile)

function useMediaQuery(query) {
  const get = () => typeof window !== "undefined" && window.matchMedia(query).matches;
  const [m, setM] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.addEventListener && mq.removeEventListener("change", on);
  }, [query]);
  return m;
}

function useViewport() {
  const desktop = useMediaQuery("(min-width: 900px)");
  const tablet  = useMediaQuery("(min-width: 600px) and (max-width: 899.98px)");
  if (desktop) return "desktop";
  if (tablet)  return "tablet";
  return "mobile";
}

function Stage({ children, route, push, goHome, openUpload, openSettings, theme, setTheme }) {
  const vp = useViewport();

  // Reader is full-bleed; hide nav rail + bottom nav when reading
  const isReader = route?.name === "reader";

  return (
    <div className={`app-shell viewport-${vp}`}>
      <div className="app-layout">
        {!isReader && <NavRail route={route} goHome={goHome} openUpload={openUpload} openSettings={openSettings} theme={theme} setTheme={setTheme} />}
        <main className="app-main">{children}</main>
        {!isReader && <BottomNav route={route} goHome={goHome} openUpload={openUpload} openSettings={openSettings} />}
      </div>
    </div>
  );
}

function NavRail({ route, goHome, openUpload, openSettings, theme, setTheme }) {
  const active = route?.name === "library" || route?.name === "detail" ? "library"
               : route?.name === "settings" ? "settings"
               : "library";

  return (
    <aside className="rail">
      <div className="rail-brand">
        <span className="mark">Book<em>shelf</em></span>
        <span className="ver">v0.1</span>
      </div>

      <button className={`rail-item ${active === "library" ? "is-active" : ""}`} onClick={goHome}>
        <Icons.Book size={17} />
        <span>Library</span>
      </button>

      <button className="rail-item" onClick={openUpload}>
        <Icons.Upload size={17} />
        <span>Add a book</span>
      </button>

      <div className="rail-section">Account</div>

      <button className={`rail-item ${active === "settings" ? "is-active" : ""}`} onClick={openSettings}>
        <Icons.Settings size={17} />
        <span>Settings</span>
      </button>

      <div className="rail-footer">
        <button className="rail-item" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Icons.Sun size={17} /> : <Icons.Moon size={17} />}
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
      </div>
    </aside>
  );
}

function BottomNav({ route, goHome, openUpload, openSettings }) {
  const isLib = route?.name === "library" || route?.name === "detail";
  const isSet = route?.name === "settings";
  return (
    <nav className="bottom-nav">
      <button className={isLib ? "is-active" : ""} onClick={goHome}>
        <Icons.Book size={20} />
        <span>Library</span>
      </button>
      <button onClick={openUpload}>
        <Icons.Upload size={20} />
        <span>Add</span>
      </button>
      <button className={isSet ? "is-active" : ""} onClick={openSettings}>
        <Icons.Settings size={20} />
        <span>Settings</span>
      </button>
    </nav>
  );
}

Object.assign(window, { Stage, useViewport, useMediaQuery });
