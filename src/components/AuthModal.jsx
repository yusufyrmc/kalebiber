"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function AuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen, loginWithEmail, signUpWithEmail } = useAuth();
  const [tab, setTab] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      if (tab === "login") {
        await loginWithEmail(email, password);
        setIsAuthModalOpen(false);
      } else {
        const res = await signUpWithEmail({ email, password, name, phone });
        if (res?.confirmationRequired) {
          setInfoMessage("Kayıt başarılı! Lütfen e-postanıza gönderilen onay bağlantısına tıklayın.");
        } else {
          setIsAuthModalOpen(false);
        }
      }
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

          {infoMessage && (
            <div className="auth-info" style={{ background: "#e6fffa", color: "#234e52", padding: "0.75rem", borderRadius: 8, fontSize: "0.88rem", marginBottom: "1rem", border: "1px solid #b2f5ea" }}>
              ✅ {infoMessage}
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
