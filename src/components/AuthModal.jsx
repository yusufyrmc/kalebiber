"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function AuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen, loginUser } = useAuth();
  const [tab, setTab] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/signup";
      const payload =
        tab === "login"
          ? { email, password }
          : { email, password, name, phone };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        let errStr = "İşlem başarısız oldu.";
        if (data.error) {
          if (typeof data.error === "string") errStr = data.error;
          else if (typeof data.error === "object") errStr = data.error.message || JSON.stringify(data.error);
        }
        throw new Error(errStr === "{}" ? "Giriş/Kayıt bilgileri hatalı veya Supabase ayarları eksik." : errStr);
      }

      loginUser(data.user, data.token);
      setIsAuthModalOpen(false);
    } catch (err) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-layer is-open">
      <div className="product-layer-backdrop" onClick={() => setIsAuthModalOpen(false)}></div>

      <div className="auth-modal-card">
        <button type="button" className="auth-modal-close" onClick={() => setIsAuthModalOpen(false)}>
          ×
        </button>

        {/* Brand Header */}
        <div className="auth-modal-header">
          <div className="auth-modal-logo">🌿</div>
          <h2 className="auth-modal-title">
            {tab === "login" ? "Hesabınıza Giriş Yapın" : "Yeni Hesap Oluşturun"}
          </h2>
          <p className="auth-modal-sub">
            {tab === "login"
              ? "Siparişlerinizi takip etmek için giriş yapın."
              : "Birkaç saniyede ücretsiz hesabınızı oluşturun."}
          </p>
        </div>

        {/* Tabs */}
        <div className="auth-tab-row">
          <button
            type="button"
            className={`auth-tab-btn ${tab === "login" ? "is-active" : ""}`}
            onClick={() => setTab("login")}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${tab === "signup" ? "is-active" : ""}`}
            onClick={() => setTab("signup")}
          >
            Kayıt Ol
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {tab === "signup" && (
            <>
              <div className="auth-field">
                <label className="auth-field-label">Adınız Soyadınız</label>
                <input
                  type="text"
                  required
                  className="auth-input"
                  placeholder="Örn: Ahmet Yılmaz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="auth-field">
                <label className="auth-field-label">Telefon Numarası</label>
                <input
                  type="tel"
                  className="auth-input"
                  placeholder="05XX XXX XX XX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="auth-field">
            <label className="auth-field-label">E-posta Adresi</label>
            <input
              type="email"
              required
              className="auth-input"
              placeholder="ornek@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label className="auth-field-label">Şifre</label>
            <input
              type="password"
              required
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="auth-error">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? "Lütfen bekleyin…" : tab === "login" ? "Giriş Yap →" : "Hesap Oluştur →"}
          </button>
        </form>
      </div>
    </div>
  );
}
