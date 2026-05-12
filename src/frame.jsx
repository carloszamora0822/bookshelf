// Outer stage chrome + device sizer

function Stage({ deviceMode, setDeviceMode, theme, setTheme, children }) {
  const stageRef = useRef(null);
  const [stage, setStage] = useState({ w: 1200, h: 800 });

  useEffect(() => {
    if (!stageRef.current) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setStage({ w: r.width, h: r.height });
    });
    ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, []);

  // Device dimensions
  const isTablet = deviceMode === "tablet";
  const deviceTargetW = isTablet ? 820 : 390;
  const deviceTargetH = isTablet ? 1180 : 844;

  // Fit available stage space
  const pad = 28;
  const availW = stage.w - pad * 2;
  const availH = stage.h - pad * 2;
  const scale = Math.min(1, availW / deviceTargetW, availH / deviceTargetH);

  return (
    <div className="app-stage">
      <ChromeBar
        deviceMode={deviceMode} setDeviceMode={setDeviceMode}
        theme={theme} setTheme={setTheme}
      />
      <div className="stage-body" ref={stageRef}>
        <div
          className={`device ${isTablet ? "tablet" : "phone"}`}
          style={{
            width: deviceTargetW,
            height: deviceTargetH,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <div className="device-bezel">
            {!isTablet && <div className="notch" />}
            <StatusBar isTablet={isTablet} />
            <div className="app-area" data-screen-label={`MyBooks ${isTablet ? "tablet" : "phone"}`}>
              {children}
            </div>
            <div className="home-indicator" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChromeBar({ deviceMode, setDeviceMode, theme, setTheme }) {
  return (
    <div className="stage-chrome">
      <div className="brand">My<span>Books</span> <span style={{ marginLeft: 6, fontFamily: "var(--mono)", fontStyle: "normal", fontSize: 10, opacity: 0.55, letterSpacing: "0.08em" }}>v0.1</span></div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#7A7770", letterSpacing: "0.08em" }}>VIEWPORT</span>
        <div className="chrome-group">
          <button className={`chrome-btn ${deviceMode === "phone" ? "active" : ""}`} onClick={() => setDeviceMode("phone")}>
            <Icons.Phone size={13} />
            <span>Phone</span>
            <span className="px">390×844</span>
          </button>
          <button className={`chrome-btn ${deviceMode === "tablet" ? "active" : ""}`} onClick={() => setDeviceMode("tablet")}>
            <Icons.Tablet size={13} />
            <span>Tablet</span>
            <span className="px">820×1180</span>
          </button>
        </div>

        <div className="chrome-sep" />

        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#7A7770", letterSpacing: "0.08em" }}>THEME</span>
        <div className="chrome-group">
          <button className={`chrome-btn ${theme === "light" ? "active" : ""}`} onClick={() => setTheme("light")}>
            <Icons.Sun size={13} />
            <span>Light</span>
          </button>
          <button className={`chrome-btn ${theme === "dark" ? "active" : ""}`} onClick={() => setTheme("dark")}>
            <Icons.Moon size={13} />
            <span>Dark</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBar({ isTablet }) {
  // Show time + simulated indicators
  const [now] = useState(() => "9:41");
  return (
    <div className="statusbar">
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span>{now}</span>
      </div>
      <div className="right" style={{ color: "var(--ink)" }}>
        <Icons.Signal size={15} />
        <Icons.Wifi size={15} />
        <Icons.Battery size={26} />
      </div>
    </div>
  );
}

Object.assign(window, { Stage });
