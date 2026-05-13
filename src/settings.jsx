// Settings — Account, Reading, Library, About

function Settings() {
  const app = useApp();

  return (
    <div className="page-container">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={app.goBack}>
          <Icons.ArrowLeft size={14} />
          <span>Back</span>
        </button>
      </div>

      <div className="fade-up">
        <div className="eyebrow">Settings</div>
        <h1 className="display-1" style={{ marginTop: 6 }}>
          Make it <em style={{ fontStyle: "italic", color: "var(--accent)" }}>yours</em>.
        </h1>
        <div className="muted" style={{ marginTop: 8, fontSize: 14 }}>
          The small preferences that make this a calm place to read.
        </div>
      </div>

      <SettingsSection title="Account" delay={1}>
        <SettingsRow label="Email">
          <span className="muted">{app.session?.user?.email || "—"}</span>
        </SettingsRow>
        <SettingsRow label="Display name">
          <span className="muted">—</span>
        </SettingsRow>
        <SettingsRow label="">
          <PrimaryBtn variant="ghost" leadIcon={Icons.LogOut} onClick={() => app.signOut?.()}>Sign out</PrimaryBtn>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Reading" delay={2}>
        <SettingsRow label="Theme">
          <Segmented
            value={app.prefs.theme}
            onChange={(t) => app.setPrefs({ theme: t })}
            options={[
              { value: "system", label: "System" },
              { value: "light",  label: "Light", icon: Icons.Sun },
              { value: "dark",   label: "Dark",  icon: Icons.Moon },
            ]}
          />
        </SettingsRow>
        <SettingsRow label="Default page mode">
          <Segmented
            value={app.prefs.defaultPageMode}
            onChange={(m) => app.setPrefs({ defaultPageMode: m })}
            options={[
              { value: "horizontal", label: "Swipe",  icon: Icons.PageMode },
              { value: "vertical",   label: "Scroll", icon: Icons.Scroll },
            ]}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Library" delay={3}>
        <SettingsRow label="Books">
          <span className="mono">{app.books.length}</span>
        </SettingsRow>
        <SettingsRow label="Tags">
          <span className="mono">{app.tags.length}</span>
        </SettingsRow>
        <SettingsRow label="Storage used">
          <span className="mono muted">7.7 MB / 5 GB</span>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="About" delay={4}>
        <SettingsRow label="Version">
          <span className="mono">0.1.0</span>
        </SettingsRow>
        <SettingsRow label="Support">
          <a href="mailto:support@bookshelf.app" style={{ color: "var(--accent-ink)", textDecoration: "none" }}>
            support@bookshelf.app
          </a>
        </SettingsRow>
        <SettingsRow label="">
          <span style={{ fontStyle: "italic", color: "var(--ink-4)", fontFamily: "var(--serif)", fontSize: 14, textWrap: "pretty" }}>
            A calm place for the PDFs you actually intend to read.
          </span>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({ title, delay = 0, children }) {
  return (
    <section className={`settings-section fade-up delay-${delay}`}>
      <div className="label">{title}</div>
      <div className="settings-card">{children}</div>
    </section>
  );
}

function SettingsRow({ label, children }) {
  return (
    <div className="settings-row">
      <div className="row-label">{label}</div>
      <div style={{ display: "flex", alignItems: "center" }}>{children}</div>
    </div>
  );
}

window.Settings = Settings;
