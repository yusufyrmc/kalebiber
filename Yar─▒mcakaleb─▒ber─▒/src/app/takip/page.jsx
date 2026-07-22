"use client";

import { useState } from "react";

export default function OrderTrackingPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const statusLabels = {
    yeni: "Yeni Alındı",
    hazirlaniyor: "Hazırlanıyor",
    kargoda: "Kargoda",
    teslim_edildi: "Teslim Edildi",
    iptal: "İptal Edildi",
  };

  const statusBadges = {
    yeni: "bg-blue",
    hazirlaniyor: "bg-yellow",
    kargoda: "bg-purple",
    teslim_edildi: "bg-green",
    iptal: "bg-red",
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const res = await fetch(`/api/orders?query=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sipariş bulunamadı.");

      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: "calc(var(--header-h) + 2rem)", paddingBottom: "4rem" }}>
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="section-head text-center">
          <span className="section-badge">Canlı Takip</span>
          <h1 className="section-title">Sipariş Durumu Sorgulama</h1>
          <p className="section-sub">
            Sipariş numaranızı (KB-123456) veya siparişte kullandığınız telefon numarasını girin.
          </p>
        </div>

        <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1, padding: "0.85rem 1rem", fontSize: "1rem" }}
            placeholder="Sipariş kodu (Örn: KB-784912) veya Telefon"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Aranıyor..." : "Sorgula"}
          </button>
        </form>

        {error && <p className="checkout-error" style={{ textAlign: "center" }}>{error}</p>}

        {searched && orders && orders.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "2rem", background: "var(--surface)", borderRadius: 14 }}>
            <p>Aradığınız kritere uygun sipariş bulunamadı.</p>
          </div>
        )}

        {orders && orders.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {orders.map((order) => (
              <div
                key={order.id}
                style={{
                  background: "var(--surface)",
                  borderRadius: "16px",
                  padding: "1.5rem",
                  border: "1px solid var(--hairline)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div>
                    <h3 style={{ margin: 0, color: "var(--accent)" }}>Sipariş #{order.id}</h3>
                    <small style={{ color: "var(--ink-muted)" }}>
                      {new Date(order.createdAt).toLocaleString("tr-TR")}
                    </small>
                  </div>
                  <span
                    style={{
                      padding: "0.4rem 0.8rem",
                      borderRadius: "20px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      background: "var(--gold-soft)",
                      color: "var(--ink)",
                    }}
                  >
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>

                <div style={{ borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)", padding: "1rem 0", margin: "1rem 0" }}>
                  <strong>Sipariş İçeriği:</strong>
                  <ul style={{ paddingLeft: "1.2rem", margin: "0.5rem 0 0" }}>
                    {order.items?.map((item, idx) => (
                      <li key={idx}>
                        {item.name} x {item.qty} ({item.price} ₺)
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "0.85rem", color: "var(--ink-muted)" }}>Teslim Edilecek Adres: </span>
                    <span style={{ fontSize: "0.9rem" }}>{order.customer?.city || "Türkiye"}</span>
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent)" }}>
                    {order.totalAmount} ₺
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
