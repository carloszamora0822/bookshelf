// Editorial covers — SVG, typographic only. No skeuomorphism.

function CoverArt({ book, w = 200, h = 300, radius = 4, shadow = true }) {
  const c = COVERS[book.coverKey] || COVERS.walden;
  const aspect = h / w;
  const innerPad = w * 0.085;
  const titleFontSize = Math.max(13, w * 0.11);
  const authorFontSize = Math.max(8, w * 0.052);

  // Title word-wrap, simple
  const words = book.title.split(" ");
  const lines = [];
  let line = "";
  const maxChars = Math.max(8, Math.floor(w / titleFontSize * 1.4));
  for (const w0 of words) {
    if ((line + " " + w0).trim().length > maxChars && line) {
      lines.push(line.trim()); line = w0;
    } else line = (line + " " + w0).trim();
  }
  if (line) lines.push(line);

  const isLight = c.bg.match(/^#[ED-Ff]/i);
  const motif = c.motif;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block", borderRadius: radius, boxShadow: shadow ? "0 6px 20px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.1)" : "none" }}>
      <defs>
        <linearGradient id={`vig-${book.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(0,0,0,0.06)" />
          <stop offset="0.7" stopColor="rgba(0,0,0,0)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.16)" />
        </linearGradient>
        <linearGradient id={`shine-${book.id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="0.5" stopColor="rgba(255,255,255,0)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.06)" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={w} height={h} fill={c.bg} />

      {/* spine shadow */}
      <rect x="0" y="0" width={w * 0.04} height={h} fill="rgba(0,0,0,0.18)" />
      {/* paper grain — very subtle */}
      <rect x="0" y="0" width={w} height={h} fill={`url(#vig-${book.id})`} />

      {/* Motifs */}
      {motif === "lines" && (
        <g stroke={c.rule} strokeOpacity="0.6">
          <line x1={innerPad} y1={h * 0.12} x2={w - innerPad} y2={h * 0.12} strokeWidth="0.7" />
          <line x1={innerPad} y1={h * 0.135} x2={w - innerPad} y2={h * 0.135} strokeWidth="0.7" />
        </g>
      )}
      {motif === "frame" && (
        <rect x={innerPad * 0.7} y={innerPad * 0.7} width={w - innerPad * 1.4} height={h - innerPad * 1.4} fill="none" stroke={c.rule} strokeWidth="0.8" strokeOpacity="0.7" />
      )}
      {motif === "stitch" && (
        <g stroke={c.rule} strokeWidth="0.7" strokeDasharray="3 3" strokeOpacity="0.6">
          <line x1={innerPad} y1={h * 0.08} x2={w - innerPad} y2={h * 0.08} />
          <line x1={innerPad} y1={h * 0.92} x2={w - innerPad} y2={h * 0.92} />
        </g>
      )}
      {motif === "circle" && (
        <circle cx={w / 2} cy={h * 0.36} r={w * 0.22} fill="none" stroke={c.rule} strokeWidth="1" strokeOpacity="0.7" />
      )}
      {motif === "block" && (
        <rect x={w * 0.5 - w * 0.04} y={h * 0.5 - w * 0.04} width={w * 0.08} height={w * 0.08} fill={c.rule} opacity="0.85" />
      )}
      {motif === "rules" && (
        <g stroke={c.rule} strokeWidth="0.7" strokeOpacity="0.55">
          <line x1={innerPad} y1={h * 0.7} x2={w - innerPad} y2={h * 0.7} />
          <line x1={innerPad} y1={h * 0.72} x2={w - innerPad} y2={h * 0.72} />
          <line x1={innerPad} y1={h * 0.74} x2={w - innerPad} y2={h * 0.74} />
        </g>
      )}

      {/* Title block */}
      <g>
        {lines.map((line, i) => (
          <text key={i}
            x={w / 2}
            y={h * 0.5 + (i - (lines.length - 1) / 2) * titleFontSize * 1.05}
            fill={c.ink}
            fontFamily="Newsreader, Georgia, serif"
            fontSize={titleFontSize}
            fontWeight="500"
            fontStyle={book.coverKey === "pride" ? "italic" : "normal"}
            textAnchor="middle"
            style={{ letterSpacing: "-0.01em" }}
          >{line}</text>
        ))}
      </g>

      {/* Author block, bottom */}
      <text
        x={w / 2}
        y={h - innerPad}
        fill={c.ink}
        fillOpacity="0.78"
        fontFamily="Inter, sans-serif"
        fontSize={authorFontSize}
        fontWeight="500"
        letterSpacing="0.18em"
        textAnchor="middle"
      >{book.author.toUpperCase()}</text>

      {/* Top small mark */}
      <text
        x={w / 2}
        y={innerPad + authorFontSize}
        fill={c.ink}
        fillOpacity="0.55"
        fontFamily="Inter, sans-serif"
        fontSize={authorFontSize * 0.85}
        fontWeight="500"
        letterSpacing="0.22em"
        textAnchor="middle"
      >{book.coverKey === "meditations" ? "MARCUS" : book.coverKey === "selfreliance" ? "ESSAYS" : book.coverKey === "artofwar" ? "孫子" : "·"}</text>

      <rect x="0" y="0" width={w} height={h} fill={`url(#shine-${book.id})`} />
    </svg>
  );
}

// Cover with progress indicator below — used in Continue reading carousel
function CoverWithIndicator({ book, w, h, radius = 4 }) {
  const pct = book.lastOpenedPage && book.pageCount
    ? Math.max(0.02, Math.min(1, book.lastOpenedPage / book.pageCount))
    : 0;
  return (
    <div style={{ position: "relative" }}>
      <CoverArt book={book} w={w} h={h} radius={radius} />
      {pct > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 8, padding: "0 10px", pointerEvents: "none" }}>
          <div style={{ height: 3, background: "rgba(0,0,0,0.18)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${pct * 100}%`, height: "100%", background: "rgba(255,255,255,0.85)" }} />
          </div>
        </div>
      )}
    </div>
  );
}

// Placeholder while extraction pending — shimmer
function CoverShimmer({ w, h, label = "preparing…" }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 4,
      background: "linear-gradient(110deg, var(--bg-sunk) 0%, var(--line) 40%, var(--bg-sunk) 80%)",
      backgroundSize: "200% 100%",
      animation: "shim 1.6s ease-in-out infinite",
      display: "flex", alignItems: "flex-end", padding: 10,
      color: "var(--ink-4)", fontSize: 10, fontFamily: "var(--mono)",
      letterSpacing: "0.06em",
      border: "1px solid var(--line)",
    }}>
      {label}
    </div>
  );
}

// CSS keyframes injected once
if (typeof document !== "undefined" && !document.getElementById("cover-kf")) {
  const s = document.createElement("style");
  s.id = "cover-kf";
  s.textContent = `@keyframes shim { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }`;
  document.head.appendChild(s);
}

Object.assign(window, { CoverArt, CoverWithIndicator, CoverShimmer });
