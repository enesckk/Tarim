import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { homePathForRoles } from "../auth/roles";
import "../layout/layout.css";
import "./login-mobile.css";

export function LoginPage() {
  const { token, user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onLogout() {
    logout();
    setEmail("");
    setPassword("");
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const nextUser = await login(email, password);
      // Pre-warm dashboard cache in background so it renders in 0ms on redirect
      api<unknown>('/api/dashboard')
        .then((dash) => {
          if (dash) {
            sessionStorage.setItem('ams_dashboard_summary_cache', JSON.stringify(dash))
          }
        })
        .catch(() => {})
      navigate(homePathForRoles(nextUser.roles), { replace: true });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Giriş başarısız";
      setError(
        err instanceof ApiError && err.status === 401
          ? "E-posta/telefon veya şifre hatalı. Lütfen tekrar deneyin."
          : err instanceof ApiError && err.status === 403
            ? "Bu hesabın web uygulamasına erişim izni yok."
          : /invalid email or password|unauthorized/i.test(raw)
          ? "E-posta veya şifre hatalı."
          : /failed to fetch|networkerror/i.test(raw)
            ? "Sunucuya bağlanılamadı. Lütfen kısa süre sonra tekrar deneyin."
          : raw,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon" aria-hidden="true">
            <i />
            <i />
          </div>
          <div>
            <h1>Tarım</h1>
            <span>Hesabınla devam et</span>
          </div>
        </div>
        <p className="login-lead">
          Görevlerini gör, uzmanlarla konuş ve arazini kolayca takip et.
        </p>

        {token && user && (
          <div
            style={{
              padding: "12px",
              borderRadius: "10px",
              background: "rgba(26,107,60,0.1)",
              border: "1px solid rgba(26,107,60,0.3)",
              marginBottom: "16px",
              fontSize: "13px",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                color: "#166534",
                marginBottom: "6px",
              }}
            >
              ✓ Aktif Oturum: {user.fullName ?? user.email}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="primary-btn"
                style={{ padding: "6px 12px", fontSize: "12px" }}
                onClick={() => navigate(homePathForRoles(user.roles))}
              >
                Sisteme / Panele Git →
              </button>
              <button
                type="button"
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
                onClick={onLogout}
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        )}
        <form onSubmit={onSubmit}>
          <label>
            Telefon veya e-posta
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Telefon numaran veya e-posta adresin"
              required
              autoComplete="username"
            />
          </label>
          <label>
            Şifre
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifreniz"
              required
              autoComplete="current-password"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
        </form>
        {import.meta.env.DEV ? (
          <div className="login-hint">
            Demo yönetici: <code>admin@agriculture.local</code> /{" "}
            <code>Admin123!</code>
            <br />
            Demo uzman (web + mobil): <code>
              uzman@agriculture.local
            </code> / <code>Officer123!</code>
            <br />
            Demo üretici: <code>uretici@agriculture.local</code> /{" "}
            <code>Producer123!</code>
          </div>
        ) : null}
      </div>
    </div>
  );
}
