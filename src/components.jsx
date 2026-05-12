// Shared UI primitives

const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } = React;

// ───────────────────────────── App context ─────────────────────────────

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// ───────────────────────────── Buttons ─────────────────────────────

function IconButton({ icon: Ic, label, onClick, size = 22, padding = 10, active, style, badge }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        position: "relative",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        padding,
        borderRadius: 999,
        color: active ? "var(--accent)" : "var(--ink-2)",
        transition: "background 150ms ease, color 150ms ease, transform 100ms ease",
        ...style,
      }}
      onMouseDown={e => e.currentTarget.style.transform = "scale(0.94)"}
      onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <Ic size={size} />
      {badge ? (
        <span style={{
          position: "absolute", top: 4, right: 4,
          minWidth: 16, height: 16, borderRadius: 999,
          background: "var(--accent)", color: "var(--bg-elev)",
          fontSize: 9, fontWeight: 700,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          padding: "0 4px", border: "2px solid var(--bg)",
        }}>{badge}</span>
      ) : null}
    </button>
  );
}

function PrimaryBtn({ children, onClick, leadIcon: L, style, fullWidth, variant = "primary" }) {
  const base = {
    primary: { bg: "var(--accent)", fg: "white", border: "transparent" },
    soft:    { bg: "var(--accent-soft)", fg: "var(--accent-ink)", border: "transparent" },
    ghost:   { bg: "transparent", fg: "var(--ink)", border: "var(--line)" },
    danger:  { bg: "transparent", fg: "#B85050", border: "var(--line)" },
  }[variant];
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      padding: "12px 18px",
      borderRadius: 999,
      background: base.bg, color: base.fg, border: `1px solid ${base.border}`,
      fontFamily: "var(--sans)", fontSize: 14, fontWeight: 500,
      letterSpacing: "-0.005em",
      transition: "transform 100ms ease, background 150ms ease",
      cursor: "pointer", width: fullWidth ? "100%" : "auto",
      ...style,
    }}
      onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
      onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >
      {L ? <L size={16} /> : null}
      {children}
    </button>
  );
}

// ───────────────────────────── Pills ─────────────────────────────

function TagPill({ tag, size = "md", onClick, active, removable, onRemove }) {
  const sz = size === "sm" ? { fs: 10, pad: "3px 8px", dot: 5 } : { fs: 11, pad: "4px 10px", dot: 6 };
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: sz.pad,
      borderRadius: 999,
      background: active ? "var(--ink)" : "var(--bg-elev)",
      color: active ? "var(--bg)" : "var(--ink-2)",
      border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
      fontFamily: "var(--sans)", fontSize: sz.fs, fontWeight: 500,
      letterSpacing: "0.01em",
      cursor: onClick ? "pointer" : "default",
      transition: "background 150ms ease, color 150ms ease, border-color 150ms ease",
    }}>
      <span style={{ width: sz.dot, height: sz.dot, borderRadius: 999, background: tag.color, display: "inline-block", flexShrink: 0 }} />
      {tag.name}
      {removable && (
        <span onClick={e => { e.stopPropagation(); onRemove?.(); }} style={{ marginLeft: 2, opacity: 0.6, display: "inline-flex" }}>
          <Icons.X size={10} />
        </span>
      )}
    </button>
  );
}

// ───────────────────────────── Sheets ─────────────────────────────

function BottomSheet({ open, onClose, children, title, side, height = "auto", maxHeight = "85%", padded = true }) {
  // side = 'left'|'right'|'bottom'
  const isSide = side === "left" || side === "right";
  return (
    <div style={{
      position: "absolute", inset: 0,
      pointerEvents: open ? "auto" : "none",
      zIndex: 100,
    }}>
      {/* scrim */}
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(20,18,15,0.4)",
        opacity: open ? 1 : 0,
        transition: "opacity 240ms ease",
        backdropFilter: "blur(2px)",
      }} />
      {/* sheet */}
      <div style={{
        position: "absolute",
        ...(isSide ? {
          top: 0, bottom: 0, [side]: 0, width: "min(420px, 88%)",
          transform: open ? "translateX(0)" : `translateX(${side === "left" ? "-" : ""}100%)`,
        } : {
          left: 0, right: 0, bottom: 0,
          height: height === "auto" ? "auto" : height,
          maxHeight,
          transform: open ? "translateY(0)" : "translateY(100%)",
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
        }),
        background: "var(--bg-elev)",
        boxShadow: "var(--shadow-lg)",
        transition: "transform 320ms cubic-bezier(0.32,0.72,0.0,1)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {!isSide && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
            <div style={{ width: 36, height: 4, borderRadius: 999, background: "var(--line)" }} />
          </div>
        )}
        {title && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: padded ? "14px 20px 10px" : "14px 12px 10px",
            borderBottom: "1px solid var(--line-2)",
          }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>{title}</div>
            <IconButton icon={Icons.X} label="close" onClick={onClose} padding={6} size={18} />
          </div>
        )}
        <div style={{ flex: 1, overflow: "auto", padding: padded ? "16px 20px 28px" : 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── Toolbar / segmented ─────────────────────────────

function Segmented({ options, value, onChange, style }) {
  return (
    <div style={{
      display: "inline-flex",
      background: "var(--bg-sunk)",
      border: "1px solid var(--line)",
      borderRadius: 999,
      padding: 3,
      gap: 2,
      ...style,
    }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
            padding: "6px 11px",
            borderRadius: 999,
            background: active ? "var(--bg-elev)" : "transparent",
            color: active ? "var(--ink)" : "var(--ink-3)",
            fontFamily: "var(--sans)", fontSize: 12, fontWeight: 500,
            boxShadow: active ? "var(--shadow-sm)" : "none",
            transition: "background 150ms, color 150ms",
            cursor: "pointer",
          }}>
            {o.icon ? <o.icon size={14} /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────────── Sort/menu popover ─────────────────────────────

function Menu({ open, onClose, anchor = "right", children, style }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
      <div style={{
        position: "absolute", top: "calc(100% + 6px)", [anchor]: 0,
        minWidth: 180,
        background: "var(--bg-elev)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        boxShadow: "var(--shadow-md)",
        padding: 5,
        zIndex: 60,
        ...style,
      }}>
        {children}
      </div>
    </>
  );
}

function MenuItem({ icon: I, label, onClick, danger, hint, active }) {
  return (
    <button onClick={onClick} style={{
      width: "100%",
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 11px",
      borderRadius: 9,
      color: danger ? "#B85050" : "var(--ink)",
      fontFamily: "var(--sans)", fontSize: 13, fontWeight: 450,
      transition: "background 120ms",
      textAlign: "left",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-sunk)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {I ? <I size={15} style={{ color: danger ? "#B85050" : "var(--ink-3)" }} /> : <span style={{ width: 15 }} />}
      <span style={{ flex: 1 }}>{label}</span>
      {active ? <Icons.Check size={14} style={{ color: "var(--accent)" }} /> : null}
      {hint ? <span style={{ fontSize: 11, color: "var(--ink-4)" }}>{hint}</span> : null}
    </button>
  );
}

// ───────────────────────────── FAB ─────────────────────────────

function FAB({ icon: I = Icons.Plus, label, onClick, style }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      position: "absolute",
      bottom: 22, right: 22,
      width: 56, height: 56,
      borderRadius: 999,
      background: "var(--accent)",
      color: "white",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 10px 28px rgba(60,80,55,0.4), 0 2px 6px rgba(30,40,30,0.25)",
      transition: "transform 100ms ease",
      zIndex: 20,
      ...style,
    }}
      onMouseDown={e => e.currentTarget.style.transform = "scale(0.93)"}
      onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <I size={22} />
    </button>
  );
}

// ───────────────────────────── Search ─────────────────────────────

function SearchField({ value, onChange, placeholder = "Search your library" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "11px 14px",
      borderRadius: 12,
      background: "var(--bg-sunk)",
      border: "1px solid var(--line)",
      color: "var(--ink-3)",
      flex: 1,
    }}>
      <Icons.Search size={16} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, background: "transparent", border: 0, outline: 0,
          color: "var(--ink)",
          fontFamily: "var(--sans)", fontSize: 14, fontWeight: 450,
        }}
      />
      {value && (
        <button onClick={() => onChange("")} style={{ color: "var(--ink-3)", display: "inline-flex" }}>
          <Icons.X size={14} />
        </button>
      )}
    </div>
  );
}

// ───────────────────────────── Section header ─────────────────────────────

function SectionHead({ title, hint, action, style }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "0 0 12px", ...style }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <h2 style={{
          margin: 0, fontFamily: "var(--serif)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.012em",
          color: "var(--ink)",
        }}>{title}</h2>
        {hint && <span style={{ fontSize: 12, color: "var(--ink-4)", fontFamily: "var(--mono)" }}>{hint}</span>}
      </div>
      {action}
    </div>
  );
}

// ───────────────────────────── Toast ─────────────────────────────

function Toast({ open, text }) {
  return (
    <div style={{
      position: "absolute", left: "50%", bottom: 88,
      transform: `translateX(-50%) translateY(${open ? 0 : 30}px)`,
      opacity: open ? 1 : 0,
      pointerEvents: "none",
      background: "var(--ink)",
      color: "var(--bg)",
      padding: "10px 16px", borderRadius: 999,
      fontSize: 13, fontFamily: "var(--sans)", fontWeight: 500,
      boxShadow: "var(--shadow-md)",
      transition: "opacity 220ms, transform 220ms",
      zIndex: 200,
      whiteSpace: "nowrap",
    }}>{text}</div>
  );
}

Object.assign(window, {
  AppCtx, useApp,
  IconButton, PrimaryBtn, TagPill,
  BottomSheet, Segmented, Menu, MenuItem,
  FAB, SearchField, SectionHead, Toast,
});
