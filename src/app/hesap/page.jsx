"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

export default function AccountPage() {
  const { user, logout, setIsAuthModalOpen } = useAuth();
  const [userOrders, setUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (user?.id || user?.phone || user?.email) {
      setLoadingOrders(true);
      const params = new URLSearchParams();
      if (user.id) params.set("userId", user.id);
      if (user.phone) params.set("phone", user.phone);

      fetch(`/api/orders?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.orders) setUserOrders(data.orders);
        })
        .finally(() => setLoadingOrders(false));
    }
  }, [user]);

  if (!user) {
    return (
      <div style={{ paddingTop: "calc(var(--header-h) + 4rem)", paddingBottom: "6rem", textAlign: "center" }}>
        <div className="container" style={{ maxWidth: 480 }}>
          <h1 className="section-title">Hesabım</h1>
          <p className="section-sub" style={{ margin: "1rem 0 2rem" }}>
            Sipariş geçmişinizi görüntülemek ve bilgilerinizi yönetmek için giriş yapmalısınız.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAuthModalOpen(true)}
          >
            Giriş Yap / Kayıt Ol
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "calc(var(--header-h) + 2rem)", paddingBottom: "4rem" }}>
      <div className="container" style={{ maxWidth: 800 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 className="section-title" style={{ margin: 0 }}>
              Hoş Geldiniz, {user.name}
            </h1>
            <p className="section-sub">{user.email}</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={logout}>
            Çıkış Yap
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
          <div
            style={{
              background: "var(--surface)",
              padding: "1.5rem",
              borderRadius: "16px",
              border: "1px solid var(--hairline)",
            }}
          >
            <h3>Profil Bilgilerim</h3>
            <p><strong>Ad Soyad:</strong> {user.name}</p>
            <p><strong>E-posta:</strong> {user.email}</p>
            <p><strong>Telefon:</strong> {user.phone || "-"}</p>
            <p><strong>Adres:</strong> {user.address || "-"}</p>
          </div>

          <div
            style={{
              background: "var(--surface)",
              padding: "1.5rem",
              borderRadius: "16px",
              border: "1px solid var(--hairline)",
            }}
          >
            <h3>Sipariş Geçmişim</h3>
            {loadingOrders ? (
              <p>Siparişler yükleniyor...</p>
            ) : userOrders.length === 0 ? (
              <p style={{ color: "var(--ink-muted)" }}>Henüz verilmiş siparişiniz yok.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {userOrders.map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      padding: "1rem",
                      background: "var(--bg-warm)",
                      borderRadius: "12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                      <span>Sipariş #{ord.id}</span>
                      <span style={{ color: "var(--accent)" }}>{ord.totalAmount} ₺</span>
                    </div>
                    <small style={{ color: "var(--ink-muted)", display: "block", marginTop: "0.25rem" }}>
                      {new Date(ord.createdAt).toLocaleDateString("tr-TR")} · Durum: {ord.status}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
