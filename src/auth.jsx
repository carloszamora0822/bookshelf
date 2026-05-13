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
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | working | confirm | error
  const [errMsg, setErrMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const em = email.trim();
    if (!em || !password) return;
    setStatus("working");
    setErrMsg("");
    try {
      if (mode === "signin") {
        await window.api.auth.signIn(em, password);
        // onAuthChange in AuthGate will swap to the app
      } else {
        const { needsConfirmation } = await window.api.auth.signUp(em, password);
        if (needsConfirmation) setStatus("confirm");
        // else session is live; AuthGate will swap us in
      }
    } catch (err) {
      setStatus("error");
      setErrMsg(err.message || "Authentication failed.");
    }
  };

  const isSignup = mode === "signup";

  return (
    <div style={SHELL_STYLE}>
      <div style={CARD_STYLE}>
        <div style={BRAND_STYLE}>
          <span>Book<em style={{ fontStyle: "italic", color: "var(--accent)" }}>shelf</em></span>
        </div>

        {status === "confirm" ? (
          <div>
            <div style={EYEBROW_STYLE}>Confirm your email</div>
            <h1 style={DISPLAY_STYLE}>One more step.</h1>
            <p style={BODY_STYLE}>
              We sent a confirmation link to <strong>{email}</strong>. Click it,
              then come back here to sign in.
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setMode("signin"); setStatus("idle"); setErrMsg(""); }}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={EYEBROW_STYLE}>Welcome</div>
            <h1 style={DISPLAY_STYLE}>
              {isSignup ? "Make a " : "A calm place for the books you actually intend to "}
              <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
                {isSignup ? "reading nook" : "read"}
              </em>
              {isSignup ? "." : "."}
            </h1>
            <p style={BODY_STYLE}>
              {isSignup
                ? "Create an account with your email and a password. Your browser can save it for you."
                : "Sign in with your email and password. We'll keep you signed in on this device."}
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
              disabled={status === "working"}
              style={{ width: "100%" }}
            />

            <label style={{ ...LABEL_STYLE, marginTop: 16 }} htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="input"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={isSignup ? "At least 6 characters" : "Your password"}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={status === "working"}
              style={{ width: "100%" }}
            />

            {status === "error" && (
              <div style={ERROR_STYLE}>{errMsg}</div>
            )}

            <button
              type="submit"
              className="btn btn-accent btn-block"
              disabled={status === "working" || !email.trim() || !password}
              style={{ marginTop: 14 }}
            >
              {status === "working"
                ? (isSignup ? "Creating…" : "Signing in…")
                : (isSignup ? "Create account" : "Sign in")}
            </button>

            <div style={{ ...FINEPRINT_STYLE, marginTop: 18 }}>
              {isSignup ? "Already have an account?" : "New here?"}{" "}
              <button
                type="button"
                onClick={() => { setMode(isSignup ? "signin" : "signup"); setErrMsg(""); setStatus("idle"); }}
                style={{
                  background: "none", border: 0, padding: 0,
                  color: "var(--accent)", cursor: "pointer",
                  font: "inherit", textDecoration: "underline",
                }}
              >
                {isSignup ? "Sign in" : "Create an account"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { AuthGate, AuthScreen, useSession, SessionCtx });
