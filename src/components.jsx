// Shared UI primitives — class-driven, not inline styles

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// ───────────────────────────── Buttons ─────────────────────────────

function IconButton({ icon: Ic, label, onClick, size = 20, active, badge, className = "", title }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title || label}
      onClick={onClick}
      className={`icon-btn ${active ? "is-active" : ""} ${className}`.trim()}
    >
      <Ic size={size} />
      {badge ? <span className="badge">{badge}</span> : null}
    </button>
  );
}

function PrimaryBtn({ children, onClick, leadIcon: L, variant = "primary", fullWidth, type = "button", size }) {
  const cls = ["btn", `btn-${variant}`];
  if (fullWidth) cls.push("btn-block");
  if (size) cls.push(`btn-${size}`);
  return (
    <button type={type} onClick={onClick} className={cls.join(" ")}>
      {L ? <L size={16} /> : null}
      {children}
    </button>
  );
}

// ───────────────────────────── Tags / pills ─────────────────────────────

function TagPill({ tag, onClick, active, removable, onRemove, size }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pill ${active ? "is-active" : ""}`}
      style={size === "sm" ? { padding: "3px 9px", fontSize: 11 } : undefined}
    >
      <span className="dot" style={{ background: tag.color }} />
      {tag.name}
      {removable && (
        <span
          role="button"
          aria-label={`remove ${tag.name}`}
          onClick={e => { e.stopPropagation(); onRemove?.(); }}
          style={{ marginLeft: 2, opacity: 0.6, display: "inline-flex" }}
        >
          <Icons.X size={10} />
        </span>
      )}
    </button>
  );
}

// ───────────────────────────── Sheets ─────────────────────────────

function BottomSheet({ open, onClose, children, title, side, variant }) {
  // variant: "modal" | undefined (auto)
  // side: "left" | "right" | undefined (bottom)
  const desktop = useMediaQuery("(min-width: 720px)");
  const placement =
    side === "left"  ? "sheet-side-left" :
    side === "right" ? "sheet-side-right" :
    variant === "modal" || desktop ? "sheet-modal" : "sheet-bottom";

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className={`sheet-root ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="sheet-scrim" onClick={onClose} />
      <div className={`sheet ${placement}`} role="dialog" aria-modal="true">
        {placement === "sheet-bottom" && (
          <div className="sheet-grabber"><span /></div>
        )}
        {title && (
          <div className="sheet-head">
            <div className="sheet-title">{title}</div>
            <IconButton icon={Icons.X} label="close" onClick={onClose} size={18} />
          </div>
        )}
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

// ───────────────────────────── Segmented ─────────────────────────────

function Segmented({ options, value, onChange, style }) {
  return (
    <div className="segmented" style={style}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? "is-active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.icon ? <o.icon size={14} /> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ───────────────────────────── Menu ─────────────────────────────

function Menu({ open, onClose, anchor = "right", children, style }) {
  if (!open) return null;
  const placement = anchor === "left"
    ? { left: 0 }
    : { right: 0 };
  return (
    <>
      <div className="menu-scrim" onClick={onClose} />
      <div className="menu" style={{ top: "calc(100% + 6px)", ...placement, ...style }}>
        {children}
      </div>
    </>
  );
}

function MenuItem({ icon: I, label, onClick, danger, hint, active }) {
  return (
    <button type="button" onClick={onClick} className={`menu-item ${danger ? "is-danger" : ""}`}>
      {I ? <I size={15} className="icon" /> : <span className="icon" style={{ width: 15 }} />}
      <span style={{ flex: 1 }}>{label}</span>
      {active ? <Icons.Check size={14} style={{ color: "var(--accent)" }} /> : null}
      {hint ? <span className="hint">{hint}</span> : null}
    </button>
  );
}

// ───────────────────────────── FAB ─────────────────────────────

function FAB({ icon: I = Icons.Plus, label, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="fab">
      <I size={22} />
    </button>
  );
}

// ───────────────────────────── Search ─────────────────────────────

function SearchField({ value, onChange, placeholder = "Search your library" }) {
  return (
    <div className="search-field">
      <Icons.Search size={16} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="clear search" className="icon-btn icon-btn-sm">
          <Icons.X size={14} />
        </button>
      )}
    </div>
  );
}

// ───────────────────────────── Section head ─────────────────────────────

function SectionHead({ title, hint, action }) {
  return (
    <div className="section-head">
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <h2>{title}</h2>
        {hint && <span className="mono" style={{ fontSize: 12, color: "var(--ink-4)" }}>{hint}</span>}
      </div>
      {action}
    </div>
  );
}

// ───────────────────────────── Toast ─────────────────────────────

function Toast({ open, text }) {
  return <div className={`toast ${open ? "is-open" : ""}`}>{text}</div>;
}

Object.assign(window, {
  AppCtx, useApp,
  IconButton, PrimaryBtn, TagPill,
  BottomSheet, Segmented, Menu, MenuItem,
  FAB, SearchField, SectionHead, Toast,
});
