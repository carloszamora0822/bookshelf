// Editorial covers — SVG, typographic. Responsive via viewBox.

// All covers are drawn in a 200x300 viewBox; the SVG fills its container.
const VB_W = 200;
const VB_H = 300;

function CoverArt({ book }) {
  // If a real cover image was generated (uploaded or rendered from a PDF
  // page), prefer that over the generative SVG fallback.
  if (book.coverUrl) {
    return (
      <img
        src={book.coverUrl}
        alt=""
        loading="lazy"
        decoding="async"
        style={{
          width: "100%", height: "100%",
          objectFit: "cover", display: "block",
        }}
      />
    );
  }

  const c = COVERS[book.coverKey] || COVERS.walden;
  const innerPad = VB_W * 0.085;
  const titleFontSize = VB_W * 0.11;
  const authorFontSize = VB_W * 0.052;

  // Title word-wrap, simple
  const words = book.title.split(" ");
  const lines = [];
  let line = "";
  const maxChars = Math.max(8, Math.floor(VB_W / titleFontSize * 1.4));
  for (const w0 of words) {
    if ((line + " " + w0).trim().length > maxChars && line) {
      lines.push(line.trim()); line = w0;
    } else line = (line + " " + w0).trim();
  }
  if (line) lines.push(line);

  const motif = c.motif;
  const gradId = `vig-${book.id}`;
  const shineId = `shine-${book.id}`;

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(0,0,0,0.06)" />
          <stop offset="0.7" stopColor="rgba(0,0,0,0)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.18)" />
        </linearGradient>
        <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="0.5" stopColor="rgba(255,255,255,0)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.06)" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={VB_W} height={VB_H} fill={c.bg} />

      {/* spine shadow */}
      <rect x="0" y="0" width={VB_W * 0.04} height={VB_H} fill="rgba(0,0,0,0.18)" />
      {/* vignette */}
      <rect x="0" y="0" width={VB_W} height={VB_H} fill={`url(#${gradId})`} />

      {/* Motifs */}
      {motif === "lines" && (
        <g stroke={c.rule} strokeOpacity="0.6">
          <line x1={innerPad} y1={VB_H * 0.12}  x2={VB_W - innerPad} y2={VB_H * 0.12}  strokeWidth="0.7" />
          <line x1={innerPad} y1={VB_H * 0.135} x2={VB_W - innerPad} y2={VB_H * 0.135} strokeWidth="0.7" />
        </g>
      )}
      {motif === "frame" && (
        <rect x={innerPad * 0.7} y={innerPad * 0.7} width={VB_W - innerPad * 1.4} height={VB_H - innerPad * 1.4} fill="none" stroke={c.rule} strokeWidth="0.8" strokeOpacity="0.7" />
      )}
      {motif === "stitch" && (
        <g stroke={c.rule} strokeWidth="0.7" strokeDasharray="3 3" strokeOpacity="0.6">
          <line x1={innerPad} y1={VB_H * 0.08} x2={VB_W - innerPad} y2={VB_H * 0.08} />
          <line x1={innerPad} y1={VB_H * 0.92} x2={VB_W - innerPad} y2={VB_H * 0.92} />
        </g>
      )}
      {motif === "circle" && (
        <circle cx={VB_W / 2} cy={VB_H * 0.36} r={VB_W * 0.22} fill="none" stroke={c.rule} strokeWidth="1" strokeOpacity="0.7" />
      )}
      {motif === "block" && (
        <rect x={VB_W * 0.5 - VB_W * 0.04} y={VB_H * 0.5 - VB_W * 0.04} width={VB_W * 0.08} height={VB_W * 0.08} fill={c.rule} opacity="0.85" />
      )}
      {motif === "rules" && (
        <g stroke={c.rule} strokeWidth="0.7" strokeOpacity="0.55">
          <line x1={innerPad} y1={VB_H * 0.7}  x2={VB_W - innerPad} y2={VB_H * 0.7} />
          <line x1={innerPad} y1={VB_H * 0.72} x2={VB_W - innerPad} y2={VB_H * 0.72} />
          <line x1={innerPad} y1={VB_H * 0.74} x2={VB_W - innerPad} y2={VB_H * 0.74} />
        </g>
      )}

      {/* Title block */}
      <g>
        {lines.map((line, i) => (
          <text key={i}
            x={VB_W / 2}
            y={VB_H * 0.5 + (i - (lines.length - 1) / 2) * titleFontSize * 1.05}
            fill={c.ink}
            fontFamily="Fraunces, Newsreader, Georgia, serif"
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
        x={VB_W / 2}
        y={VB_H - innerPad}
        fill={c.ink}
        fillOpacity="0.78"
        fontFamily="Geist, Inter, sans-serif"
        fontSize={authorFontSize}
        fontWeight="500"
        letterSpacing="0.18em"
        textAnchor="middle"
      >{(book.author || "").toUpperCase()}</text>

      {/* Top mark */}
      <text
        x={VB_W / 2}
        y={innerPad + authorFontSize}
        fill={c.ink}
        fillOpacity="0.55"
        fontFamily="Geist, Inter, sans-serif"
        fontSize={authorFontSize * 0.85}
        fontWeight="500"
        letterSpacing="0.22em"
        textAnchor="middle"
      >{
        book.coverKey === "meditations" ? "MARCUS" :
        book.coverKey === "selfreliance" ? "ESSAYS" :
        book.coverKey === "artofwar" ? "孫子" : "·"
      }</text>

      <rect x="0" y="0" width={VB_W} height={VB_H} fill={`url(#${shineId})`} />
    </svg>
  );
}

// Cover with progress strip — used in continue-reading rail (kept for back-compat).
function CoverWithIndicator({ book }) {
  const pct = book.lastOpenedPage && book.pageCount
    ? Math.max(0.02, Math.min(1, book.lastOpenedPage / book.pageCount))
    : 0;
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "2 / 3" }}>
      <CoverArt book={book} />
      {pct > 0 && (
        <div style={{ position: "absolute", left: 8, right: 8, bottom: 8, height: 3, background: "rgba(0,0,0,0.28)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${pct * 100}%`, height: "100%", background: "rgba(255,255,255,0.92)" }} />
        </div>
      )}
    </div>
  );
}

function CoverShimmer({ label = "preparing…" }) {
  return (
    <div style={{
      width: "100%", aspectRatio: "2/3",
      borderRadius: 4,
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

Object.assign(window, { CoverArt, CoverWithIndicator, CoverShimmer });
