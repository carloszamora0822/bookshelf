// Auth gate — Supabase magic link sign-in.
// <AuthGate>{children}</AuthGate> renders <AuthScreen /> when no session.
// useSession() returns { user, signOut } | null when wrapped by AuthGate.

const SessionCtx = createContext(null);

function useSession() {
  return useContext(SessionCtx);
}

function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    window.api.auth.getSession().then((s) => {
      if (!alive) return;
      setSession(s);
      setReady(true);
    }).catch(() => {
      if (!alive) return;
      setSession(null);
      setReady(true);
    });
    const unsub = window.api.auth.onAuthChange((s) => {
      setSession(s);
      setReady(true);
    });
    return () => { alive = false; unsub?.(); };
  }, []);

  if (!ready) {
    return <AuthLoading />;
  }
  if (!session) {
    return <AuthScreen />;
  }

  const value = {
    user: session.user,
    access_token: session.access_token,
    signOut: () => window.api.auth.signOut(),
  };

  return (
    <SessionCtx.Provider value={value}>
      {children}
    </SessionCtx.Provider>
  );
}

// ───────────────────────── styling ─────────────────────────
// Inline styles only — styles.css is off-limits in this round.

const SHELL_STYLE = {
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  background: "var(--bg)",
  color: "var(--ink)",
};

const CARD_STYLE = {
  width: "100%",
  maxWidth: 440,
  padding: "36px 32px 32px",
  background: "var(--bg-elev)",
  border: "1px solid var(--line)",
  borderRadius: 18,
  boxShadow: "0 24px 60px -28px rgba(0,0,0,0.18), 0 2px 4px -2px rgba(0,0,0,0.06)",
};

const BRAND_STYLE = {
  fontFamily: "var(--display)",
  fontSize: 22,
  letterSpacing: "-0.012em",
  color: "var(--ink)",
  marginBottom: 22,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const EYEBROW_STYLE = {
  fontFamily: "var(--mono)",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-4)",
  marginBottom: 10,
};

const DISPLAY_STYLE = {
  fontFamily: "var(--display)",
  fontSize: 30,
  fontWeight: 400,
  lineHeight: 1.12,
  letterSpacing: "-0.018em",
  color: "var(--ink)",
  margin: "0 0 14px",
  fontVariationSettings: '"opsz" 36, "SOFT" 60',
};

const BODY_STYLE = {
  fontFamily: "var(--serif, var(--sans))",
  fontSize: 15,
  lineHeight: 1.55,
  color: "var(--ink-3)",
  margin: "0 0 22px",
};

const LABEL_STYLE = {
  display: "block",
  fontFamily: "var(--mono)",
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-4)",
  marginBottom: 8,
};

const ERROR_STYLE = {
  marginTop: 12,
  padding: "10px 12px",
  background: "var(--danger-soft, #fdecec)",
  color: "var(--danger, #a8312a)",
  borderRadius: 10,
  fontSize: 13,
  lineHeight: 1.45,
};

const FINEPRINT_STYLE = {
  marginTop: 16,
  fontSize: 12,
  color: "var(--ink-4)",
  textAlign: "center",
  lineHeight: 1.5,
};

function AuthLoading() {
  return (
    <div style={SHELL_STYLE}>
      <div style={{ ...CARD_STYLE, textAlign: "center", padding: "48px 32px" }}>
        <div
          style={{
            width: 24, height: 24, margin: "0 auto 16px",
            border: "2px solid var(--line)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "auth-spin 0.8s linear infinite",
          }}
        />
        <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-4)", letterSpacing: "0.08em" }}>
          Loading…
        </div>
        <style>{`@keyframes auth-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

function AuthScreen() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errMsg, setErrMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const v = email.trim();
    if (!v) return;
    setStatus("sending");
    setErrMsg("");
    try {
      await window.api.auth.signIn(v);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrMsg(err.message || "Could not send magic link.");
    }
  };

  return (
    <div style={SHELL_STYLE}>
      <div style={CARD_STYLE}>
        <div style={BRAND_STYLE}>
          <span>Book<em style={{ fontStyle: "italic", color: "var(--accent)" }}>shelf</em></span>
        </div>

        {status === "sent" ? (
          <div>
            <div style={EYEBROW_STYLE}>Check your email</div>
            <h1 style={DISPLAY_STYLE}>A link is on its way.</h1>
            <p style={BODY_STYLE}>
              We sent a sign-in link to <strong>{email}</strong>. Open it from
              this device to continue.
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setStatus("idle"); setErrMsg(""); }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={EYEBROW_STYLE}>Welcome</div>
            <h1 style={DISPLAY_STYLE}>
              A calm place for the books you actually intend to{" "}
              <em style={{ fontStyle: "italic", color: "var(--accent)" }}>read</em>.
            </h1>
            <p style={BODY_STYLE}>
              Enter your email and we'll send you a magic sign-in link. No
              passwords required.
            </p>

            <label style={LABEL_STYLE} htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="input"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "sending"}
              style={{ width: "100%" }}
            />

            {status === "error" && (
              <div style={ERROR_STYLE}>{errMsg}</div>
            )}

            <button
              type="submit"
              className="btn btn-accent btn-block"
              disabled={status === "sending" || !email.trim()}
              style={{ marginTop: 14 }}
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>

            <div style={FINEPRINT_STYLE}>
              By continuing, you agree to keep your library to yourself.
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { AuthGate, AuthScreen, useSession, SessionCtx });
