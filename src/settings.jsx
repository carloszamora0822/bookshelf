// Settings screen — Account, Reading, About

function Settings() {
  const app = useApp();
  const isTablet = app.viewportClass === "tablet";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isTablet ? "16px 32px 8px" : "10px 18px 6px",
      }}>
        <IconButton icon={Icons.ArrowLeft} label="back" size={20} padding={9} onClick={app.goBack} />
        <div style={{ fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.28em", color: "var(--ink-3)" }}>SETTINGS</div>
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: isTablet ? "16px 32px 40px" : "12px 22px 40px" }}>
        <h1 style={{
          margin: 0, fontFamily: "var(--serif)", fontWeight: 500,
          fontSize: isTablet ? 36 : 28, letterSpacing: "-0.025em",
        }}>Settings</h1>

        <Section title="Account">
          <Row label="Email"><span style={{ color: "var(--ink-2)" }}>you@example.com</span></Row>
          <Row label="Display name"><span style={{ color: "var(--ink-2)" }}>—</span></Row>
          <Row label="" last>
            <PrimaryBtn variant="ghost" leadIcon={Icons.LogOut}>Sign out</PrimaryBtn>
          </Row>
        </Section>

        <Section title="Reading">
          <Row label="Theme">
            <Segmented value={app.prefs.theme} onChange={(t) => app.setPrefs({ theme: t })}
              options={[
                { value: "system", label: "System" },
                { value: "light",  label: "Light", icon: Icons.Sun },
                { value: "dark",   label: "Dark",  icon: Icons.Moon },
              ]} />
          </Row>
          <Row label="Default page mode" last>
            <Segmented value={app.prefs.defaultPageMode} onChange={(m) => app.setPrefs({ defaultPageMode: m })}
              options={[
                { value: "horizontal", label: "Swipe", icon: Icons.PageMode },
                { value: "vertical",   label: "Scroll", icon: Icons.Scroll },
              ]} />
          </Row>
        </Section>

        <Section title="Library">
          <Row label="Books">{app.books.length}</Row>
          <Row label="Tags">{app.tags.length}</Row>
          <Row label="Storage used" last><span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-2)" }}>7.7 MB / 5 GB</span></Row>
        </Section>

        <Section title="About">
          <Row label="Version"><span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>0.1.0</span></Row>
          <Row label="Support"><span style={{ color: "var(--accent-ink)" }}>support@mybooks.app</span></Row>
          <Row label="" last>
            <span style={{ fontSize: 12, color: "var(--ink-4)", fontStyle: "italic", textWrap: "pretty" }}>
              A calm place for the PDFs you actually intend to read.
            </span>
          </Row>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{
        margin: "0 0 10px",
        fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600,
        letterSpacing: "0.18em", color: "var(--ink-3)",
        textTransform: "uppercase",
      }}>{title}</h2>
      <div style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        overflow: "hidden",
      }}>{children}</div>
    </section>
  );
}

function Row({ label, children, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, padding: "13px 16px",
      borderBottom: last ? "none" : "1px solid var(--line-2)",
      minHeight: 50,
    }}>
      <div style={{ fontFamily: "var(--sans)", fontSize: 13.5, color: "var(--ink)", fontWeight: 450 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center" }}>{children}</div>
    </div>
  );
}

window.Settings = Settings;
