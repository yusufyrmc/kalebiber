"use client";

import { useState, useEffect, useRef } from "react";

const VIEWS = [
  { id: "dashboard", label: "📊 Özet" },
  { id: "orders", label: "📦 Siparişler" },
  { id: "reviews", label: "⭐ Yorumlar" },
  { id: "products", label: "🌶️ Ürünler" },
  { id: "navbar", label: "🧭 Navbar / Vitrin" },
  { id: "about", label: "📖 Hakkımızda" },
  { id: "finance", label: "💰 Gelir / Gider" },
  { id: "settings", label: "⚙️ Ayarlar" },
];

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [activeView, setActiveView] = useState("dashboard");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Orders state
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Products state
  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: "", price: "", unit: "kg", category: "taze", badge: "", desc: "", stock: "", active: true, featured: false, emoji: "", imageUrl: "" });

  // Reviews state
  const [reviewFilter, setReviewFilter] = useState("all");

  // Finance state
  const [financeEntries, setFinanceEntries] = useState([]);
  const [financeForm, setFinanceForm] = useState({ type: "income", category: "siparis", amount: "", date: new Date().toISOString().slice(0, 10), description: "", orderId: "" });

  // Navbar / Hero state
  const [heroForm, setHeroForm] = useState({ eyebrow: "", title: "", titleAccent: "", heroLead: "", imageUrl: "", imageAlt: "" });

  // About state
  const [aboutForm, setAboutForm] = useState({ title: "", content: "" });

  // Finance — load from localStorage after mount (client-only)
  useEffect(() => {
    loadFinance();
  }, []);

  const loadFinance = async () => {
    try {
      const res = await fetch("/api/finance");
      const data = await res.json();
      if (data.transactions) setFinanceEntries(data.transactions);
    } catch {
      // fallback to localStorage
      try {
        const saved = localStorage.getItem("kale_finance");
        if (saved) setFinanceEntries(JSON.parse(saved));
      } catch {}
    }
  };

  useEffect(() => {
    const key = localStorage.getItem("kale_admin_key");
    if (key) { setIsLoggedIn(true); loadAll(); }
  }, []);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/orders").then(r => r.json()).catch(() => ({ orders: [] })),
      fetch("/api/products").then(r => r.json()).catch(() => ({ products: [] })),
      fetch("/api/reviews").then(r => r.json()).catch(() => ({ reviews: [] })),
      fetch("/api/settings").then(r => r.json()).catch(() => ({})),
    ]).then(([o, p, r, s]) => {
      setOrders(o.orders || []);
      setProducts(p.products || []);
      setReviews(r.reviews || []);
      const settingsData = s.settings || s || {};
      setSettings(settingsData);
      setHeroForm({
        eyebrow: settingsData.eyebrow || "",
        title: settingsData.title || "",
        titleAccent: settingsData.titleAccent || "",
        heroLead: settingsData.heroLead || "",
        imageUrl: settingsData.imageUrl || "",
        imageAlt: settingsData.imageAlt || "",
      });
      setAboutForm({ title: settingsData.aboutTitle || "", content: settingsData.aboutContent || "" });
    }).finally(() => setLoading(false));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (keyInput.trim()) {
      localStorage.setItem("kale_admin_key", keyInput.trim());
      setIsLoggedIn(true);
      loadAll();
    }
  };

  const logout = () => { localStorage.removeItem("kale_admin_key"); setIsLoggedIn(false); };

  // ── Save helpers ──────────────────────────────────────────
  const saveSettings = async (extra = {}) => {
    const body = { ...settings, ...extra };
    try {
      const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        setSettings(body);
        return true;
      } else {
        alert("Ayar kaydedilemedi: " + (data.error || "Bilinmeyen hata"));
        return false;
      }
    } catch (e) {
      alert("Hata oluştu: " + e.message);
      return false;
    }
  };

  const saveHero = async (e) => {
    e.preventDefault();
    await saveSettings({ eyebrow: heroForm.eyebrow, title: heroForm.title, titleAccent: heroForm.titleAccent, heroLead: heroForm.heroLead, imageUrl: heroForm.imageUrl, imageAlt: heroForm.imageAlt });
    alert("Navbar / Hero kaydedildi!");
  };

  const saveAbout = async (e) => {
    e.preventDefault();
    await saveSettings({ aboutTitle: aboutForm.title, aboutContent: aboutForm.content });
    alert("Hakkımızda kaydedildi!");
  };

  const saveSettingsForm = async (e) => {
    e.preventDefault();
    await saveSettings();
    alert("Ayarlar kaydedildi!");
  };

  // ── Products ──────────────────────────────────────────────
  const openNewProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: "", price: "", unit: "kg", category: "taze", badge: "", desc: "", stock: "", active: true, featured: false, emoji: "", imageUrl: "" });
    setProductModal(true);
  };

  const openEditProduct = (p) => {
    setEditingProduct(p);
    setProductForm({
      ...p,
      price: String(p.price),
      stock: String(p.stock || ""),
      imageUrl: p.imageUrl || p.image_url || "",
    });
    setProductModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const payload = { ...productForm, price: Number(productForm.price), stock: Number(productForm.stock) };
    const res = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) {
      loadAll();
      setProductModal(false);
    } else alert("Hata: " + (data.error || "Bilinmeyen hata"));
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (field === "product") setProductForm(f => ({ ...f, imageUrl: data.url }));
      else if (field === "hero") setHeroForm(f => ({ ...f, imageUrl: data.url }));
    } catch { alert("Görsel yüklenemedi."); }
  };

  // ── Finance ───────────────────────────────────────────────
  const addFinanceEntry = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(financeForm),
      });
      const data = await res.json();
      if (data.success) {
        await loadFinance();
        setFinanceForm(f => ({ ...f, amount: "", description: "", orderId: "" }));
      } else {
        alert("Kayıt eklenemedi: " + (data.error || "Bilinmeyen hata"));
      }
    } catch (err) {
      alert("Kayıt eklenemedi: " + err.message);
    }
  };

  const deleteFinanceEntry = async (id) => {
    try {
      await fetch(`/api/finance?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadFinance();
    } catch (err) {
      alert("Silinemedi: " + err.message);
    }
  };

  const financeTotal = (type) => financeEntries.filter(e => e.type === type).reduce((s, e) => s + Number(e.amount), 0);

  // ── Orders CSV ────────────────────────────────────────────
  const exportCSV = () => {
    const header = ["ID", "Müşteri", "Telefon", "Tutar", "Durum", "Tarih"].join(",");
    const rows = orders.map(o => [o.id, o.customer?.name, o.customer?.phone, o.totalAmount, o.status, o.createdAt].join(","));
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "siparisler.csv"; a.click();
  };

  // ── Derived ───────────────────────────────────────────────
  const filteredOrders = orders.filter(o => {
    const q = orderSearch.toLowerCase();
    const matchQ = !q || o.id?.toLowerCase().includes(q) || o.customer?.name?.toLowerCase().includes(q) || o.customer?.phone?.includes(q);
    const matchS = orderStatus === "all" || o.status === orderStatus;
    return matchQ && matchS;
  });

  const filteredReviews = reviews.filter(r => reviewFilter === "all" || r.status === reviewFilter);
  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const newOrders = orders.filter(o => o.status === "yeni").length;
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : "—";

  if (!isLoggedIn) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--warm-bg)" }}>
        <div className="card" style={{ maxWidth: 380, width: "100%", margin: "1rem", padding: "2.5rem 2rem" }}>
          <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.5rem" }}>Yönetim Paneli</h1>
          <p style={{ color: "var(--ink-muted)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>Devam etmek için şifrenizi girin.</p>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <input type="password" className="form-input" placeholder="Admin Şifresi" required value={keyInput} onChange={e => setKeyInput(e.target.value)} style={{ padding: "0.75rem 1rem", borderRadius: 10, border: "1.5px solid var(--hairline)", background: "var(--bg)", fontSize: "0.95rem" }} />
            <button type="submit" className="btn btn-primary btn-block">Giriş Yap →</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell" style={{ display: "flex", minHeight: "100vh", background: "var(--bg-warm)" }}>
      {/* Sidebar */}
      <aside className="admin-sidebar" style={{ width: 220, flexShrink: 0, background: "#1e2b1a", color: "#fff", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div className="admin-brand" style={{ padding: "1.5rem 1.2rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#fff" }}>Yarımca Kale Bibercisi</h1>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>Mağaza yönetimi</p>
        </div>

        <nav style={{ flex: 1, padding: "0.8rem 0" }}>
          {VIEWS.map(v => (
            <button key={v.id} type="button"
              onClick={() => { setActiveView(v.id); setSidebarOpen(false); }}
              className="admin-nav-btn"
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "0.7rem 1.2rem",
                background: activeView === v.id ? "rgba(127,168,0,0.2)" : "none",
                color: activeView === v.id ? "#b0cc40" : "rgba(255,255,255,0.75)",
                border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: activeView === v.id ? 600 : 400,
                borderLeft: activeView === v.id ? "3px solid #7fa800" : "3px solid transparent",
                transition: "all 0.15s",
              }}>
              {v.label}
              {v.id === "orders" && newOrders > 0 && <span style={{ marginLeft: "0.5rem", background: "#e53e3e", color: "#fff", borderRadius: 99, padding: "0.1rem 0.45rem", fontSize: "0.7rem" }}>{newOrders}</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding: "1rem 1.2rem", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <a href="/" target="_blank" className="btn btn-ghost btn-sm" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.2)", textAlign: "center", textDecoration: "none" }}>Siteyi aç</a>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout} style={{ color: "#fff" }}>Çıkış</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "2rem", overflowX: "auto", maxWidth: "100%" }}>
        {loading && <p style={{ color: "var(--ink-muted)" }}>Yükleniyor…</p>}

        {/* ── DASHBOARD ─────────────────────────────── */}
        {activeView === "dashboard" && (
          <div>
            <div className="admin-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0 }}>Özet</h2>
              <button className="btn btn-outline btn-sm" onClick={loadAll}>Yenile</button>
            </div>
            <div className="admin-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { label: "Toplam Ciro (₺)", value: totalRevenue.toLocaleString("tr-TR"), color: "var(--leaf)" },
                { label: "Yeni Sipariş", value: newOrders, color: "#e53e3e" },
                { label: "Tüm Siparişler", value: orders.length },
                { label: "Aktif Ürün", value: products.length },
                { label: "Müşteri Yorumu", value: reviews.length, color: "var(--gold)" },
                { label: "Ort. Puan", value: avgRating, color: "var(--gold)" },
              ].map(s => (
                <div key={s.label} className="summary-card card" style={{ padding: "1.2rem", borderRadius: 14, border: "1px solid var(--hairline)" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--ink-muted)", display: "block" }}>{s.label}</span>
                  <h2 style={{ margin: "0.4rem 0 0", color: s.color || "var(--ink)", fontSize: "1.8rem" }}>{s.value}</h2>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: "1.25rem", borderRadius: 14, border: "1px solid var(--hairline)" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Son Siparişler</h3>
              {orders.slice(0, 5).map(o => (
                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--hairline)", fontSize: "0.9rem" }}>
                  <span style={{ fontWeight: 600 }}>{o.id}</span>
                  <span>{o.customer?.name}</span>
                  <span style={{ fontWeight: 700, color: "var(--accent)" }}>{o.totalAmount} ₺</span>
                  <span style={{ background: "var(--gold-soft)", padding: "0.15rem 0.5rem", borderRadius: 8, fontSize: "0.8rem" }}>{o.status}</span>
                </div>
              ))}
              {orders.length === 0 && <p style={{ color: "var(--ink-muted)" }}>Henüz sipariş yok.</p>}
            </div>
          </div>
        )}

        {/* ── ORDERS ────────────────────────────────── */}
        {activeView === "orders" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ margin: 0 }}>Siparişler</h2>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-outline btn-sm" onClick={exportCSV}>CSV İndir</button>
                <button className="btn btn-primary btn-sm" onClick={loadAll}>Yenile</button>
              </div>
            </div>
            <div className="orders-toolbar-pro" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              <input type="search" placeholder="No, ad, telefon ara…" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} style={{ padding: "0.5rem 0.9rem", borderRadius: 10, border: "1px solid var(--hairline)", flex: 1, minWidth: 200 }} />
              <select value={orderStatus} onChange={e => setOrderStatus(e.target.value)} style={{ padding: "0.5rem 0.9rem", borderRadius: 10, border: "1px solid var(--hairline)" }}>
                <option value="all">Tüm durumlar</option>
                <option value="yeni">Yeni</option>
                <option value="hazirlaniyor">Hazırlanıyor</option>
                <option value="kargoda">Kargoda</option>
                <option value="teslim_edildi">Teslim edildi</option>
                <option value="iptal">İptal</option>
              </select>
            </div>
            <div className="orders-table-wrap" style={{ overflowX: "auto" }}>
              <table className="orders-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", background: "#fff", borderRadius: 14, overflow: "hidden" }}>
                <thead>
                  <tr style={{ background: "var(--bg-warm)", borderBottom: "2px solid var(--hairline)" }}>
                    {["No", "Tarih", "Müşteri", "Telefon", "Tutar", "Durum", ""].map(h => (
                      <th key={h} style={{ padding: "0.75rem 1rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => (
                    <tr key={o.id} style={{ borderBottom: "1px solid var(--hairline)" }}>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600, fontSize: "0.9rem" }}>{o.id}</td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", color: "var(--ink-muted)" }}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString("tr-TR") : "—"}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>{o.customer?.name}</td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.85rem" }}>{o.customer?.phone}</td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--leaf)" }}>{o.totalAmount} ₺</td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{ padding: "0.2rem 0.6rem", background: o.status === "yeni" ? "#fed7d7" : "var(--gold-soft)", color: o.status === "yeni" ? "#c53030" : "#744210", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600 }}>{o.status}</span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedOrder(o)}>Detay</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredOrders.length === 0 && <p style={{ padding: "2rem", textAlign: "center", color: "var(--ink-muted)" }}>Sipariş bulunamadı.</p>}
            </div>

            {/* Order detail modal */}
            {selectedOrder && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setSelectedOrder(null)}>
                <div style={{ background: "#fff", borderRadius: 16, padding: "2rem", maxWidth: 480, width: "90%", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ marginTop: 0 }}>Sipariş #{selectedOrder.id}</h3>
                  <p><strong>Müşteri:</strong> {selectedOrder.customer?.name}</p>
                  <p><strong>Telefon:</strong> {selectedOrder.customer?.phone}</p>
                  <p><strong>Adres:</strong> {selectedOrder.customer?.address}</p>
                  <p><strong>Tutar:</strong> {selectedOrder.totalAmount} ₺</p>
                  <p>
                    <strong>Durum:</strong>{" "}
                    <select
                      value={selectedOrder.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        setSelectedOrder({ ...selectedOrder, status: newStatus });
                        try {
                          await fetch("/api/orders", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              ...selectedOrder,
                              status: newStatus,
                              customer: selectedOrder.customer,
                              items: selectedOrder.items,
                            }),
                          });
                          loadAll();
                        } catch (err) {
                          alert("Durum güncellenemedi.");
                        }
                      }}
                      style={{ padding: "0.3rem 0.6rem", borderRadius: 8, border: "1px solid var(--hairline)", marginLeft: "0.5rem" }}
                    >
                      <option value="yeni">Yeni</option>
                      <option value="hazirlaniyor">Hazırlanıyor</option>
                      <option value="kargoda">Kargoda</option>
                      <option value="teslim_edildi">Teslim edildi</option>
                      <option value="iptal">İptal</option>
                    </select>
                  </p>
                  <h4>Ürünler</h4>
                  {(selectedOrder.items || []).map((item, i) => (
                    <p key={i}>{item.name} × {item.qty} — {item.price * item.qty} ₺</p>
                  ))}
                  <button className="btn btn-primary" onClick={() => setSelectedOrder(null)} style={{ marginTop: "1rem" }}>Kapat</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PRODUCTS ──────────────────────────────── */}
        {activeView === "products" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ margin: 0 }}>Ürünler</h2>
              <button className="btn btn-primary btn-sm" onClick={openNewProduct}>+ Yeni Ürün</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 14, overflow: "hidden" }}>
                <thead>
                  <tr style={{ background: "var(--bg-warm)", borderBottom: "2px solid var(--hairline)" }}>
                    {["Görsel", "Ürün", "Fiyat", "Stok", "Kategori", "Durum", ""].map(h => (
                      <th key={h} style={{ padding: "0.75rem 1rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--ink-muted)", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--hairline)" }}>
                      <td style={{ padding: "0.6rem 1rem" }}><img src={p.imageUrl || p.image_url || "/images/logo-yuvarlak.png"} alt={p.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} /></td>
                      <td style={{ padding: "0.6rem 1rem", fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: "0.6rem 1rem", fontWeight: 700, color: "var(--leaf)" }}>{p.price} ₺ / {p.unit}</td>
                      <td style={{ padding: "0.6rem 1rem" }}>{p.stock ?? "—"}</td>
                      <td style={{ padding: "0.6rem 1rem", fontSize: "0.85rem", color: "var(--ink-muted)" }}>{p.category}</td>
                      <td style={{ padding: "0.6rem 1rem" }}><span style={{ padding: "0.15rem 0.5rem", background: p.active !== false ? "#c6f6d5" : "#fed7d7", color: p.active !== false ? "#276749" : "#c53030", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600 }}>{p.active !== false ? "Aktif" : "Pasif"}</span></td>
                      <td style={{ padding: "0.6rem 1rem" }}><button className="btn btn-ghost btn-sm" onClick={() => openEditProduct(p)}>Düzenle</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {products.length === 0 && <p style={{ padding: "2rem", textAlign: "center", color: "var(--ink-muted)" }}>Henüz ürün yok.</p>}
            </div>

            {/* Product modal */}
            {productModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setProductModal(false)}>
                <div style={{ background: "#fff", borderRadius: 16, padding: "2rem", maxWidth: 520, width: "90%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ marginTop: 0 }}>{editingProduct ? "Ürünü Düzenle" : "Yeni Ürün"}</h3>
                  <form onSubmit={handleSaveProduct} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Ad *<input required value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }} /></label>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Açıklama<textarea rows={2} value={productForm.desc} onChange={e => setProductForm(f => ({ ...f, desc: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }} /></label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Fiyat (₺) *<input type="number" required min="0" step="0.01" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }} /></label>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Birim<input value={productForm.unit} onChange={e => setProductForm(f => ({ ...f, unit: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }} /></label>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Stok<input type="number" min="0" value={productForm.stock} onChange={e => setProductForm(f => ({ ...f, stock: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }} /></label>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Kategori<select value={productForm.category} onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }}><option value="taze">Taze Biber</option><option value="kurutulmus">Kurutulmuş</option></select></label>
                    </div>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Rozet (ör: Çok Satan)<input value={productForm.badge} onChange={e => setProductForm(f => ({ ...f, badge: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }} /></label>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Ürün Görseli URL<input value={productForm.imageUrl} onChange={e => setProductForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="/uploads/..." style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }} /></label>
                    <div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>ya da Dosya Seç</span>
                      <input type="file" accept="image/*" onChange={e => handleImageUpload(e, "product")} style={{ display: "block", marginTop: "0.3rem" }} />
                    </div>
                    {productForm.imageUrl && <img src={productForm.imageUrl} alt="önizleme" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} />}
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <label style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><input type="checkbox" checked={productForm.active} onChange={e => setProductForm(f => ({ ...f, active: e.target.checked }))} /> Vitrinde göster</label>
                      <label style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><input type="checkbox" checked={productForm.featured} onChange={e => setProductForm(f => ({ ...f, featured: e.target.checked }))} /> Öne çıkan</label>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                      <button type="submit" className="btn btn-primary">Kaydet</button>
                      <button type="button" className="btn btn-outline" onClick={() => setProductModal(false)}>İptal</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REVIEWS ───────────────────────────────── */}
        {activeView === "reviews" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ margin: 0 }}>Müşteri Yorumları</h2>
              <button className="btn btn-primary btn-sm" onClick={loadAll}>Yenile</button>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <select value={reviewFilter} onChange={e => setReviewFilter(e.target.value)} style={{ padding: "0.5rem 0.9rem", borderRadius: 10, border: "1px solid var(--hairline)" }}>
                <option value="all">Tümü</option>
                <option value="pending">Onay bekleyen</option>
                <option value="approved">Onaylı</option>
              </select>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 14, overflow: "hidden" }}>
                <thead>
                  <tr style={{ background: "var(--bg-warm)", borderBottom: "2px solid var(--hairline)" }}>
                    {["Tarih", "Müşteri", "Puan", "Yorum", "Durum"].map(h => (
                      <th key={h} style={{ padding: "0.75rem 1rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--ink-muted)", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--hairline)" }}>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.82rem", color: "var(--ink-muted)" }}>{r.date || "—"}</td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{r.author || r.name}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "var(--gold)" }}>{"★".repeat(r.rating || 5)}</td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.88rem", maxWidth: 300 }}>{r.text || r.comment}</td>
                      <td style={{ padding: "0.75rem 1rem" }}><span style={{ padding: "0.15rem 0.5rem", background: r.status === "approved" ? "#c6f6d5" : "#fefcbf", color: r.status === "approved" ? "#276749" : "#744210", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600 }}>{r.status || "approved"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredReviews.length === 0 && <p style={{ padding: "2rem", textAlign: "center", color: "var(--ink-muted)" }}>Yorum bulunamadı.</p>}
            </div>
          </div>
        )}

        {/* ── NAVBAR / HERO ─────────────────────────── */}
        {activeView === "navbar" && (
          <div>
            <h2 style={{ marginTop: 0 }}>Navbar & Vitrin</h2>
            <p style={{ color: "var(--ink-muted)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>Ana sayfa hero bölümü: başlık, alt metin ve büyük görsel.</p>
            <form onSubmit={saveHero} className="settings-form card" style={{ padding: "1.5rem", borderRadius: 14, border: "1px solid var(--hairline)", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              {[["Üst Etiket", "eyebrow"], ["Başlık Satır 1", "title"], ["Başlık Vurgu", "titleAccent"], ["Alt Metin", "heroLead"], ["Görsel URL", "imageUrl"], ["Görsel Alt Yazısı", "imageAlt"]].map(([label, key]) => (
                <label key={key} style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {label}
                  <input value={heroForm[key]} onChange={e => setHeroForm(f => ({ ...f, [key]: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }} />
                </label>
              ))}
              <div>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Hero Görseli — Dosya Seç</span>
                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, "hero")} style={{ display: "block", marginTop: "0.3rem" }} />
              </div>
              {heroForm.imageUrl && <img src={heroForm.imageUrl} alt="önizleme" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8 }} />}
              <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>Kaydet</button>
            </form>
          </div>
        )}

        {/* ── ABOUT ─────────────────────────────────── */}
        {activeView === "about" && (
          <div>
            <h2 style={{ marginTop: 0 }}>Hakkımızda</h2>
            <form onSubmit={saveAbout} className="settings-form card" style={{ padding: "1.5rem", borderRadius: 14, border: "1px solid var(--hairline)", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Başlık<input value={aboutForm.title} onChange={e => setAboutForm(f => ({ ...f, title: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }} /></label>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>İçerik<textarea rows={6} value={aboutForm.content} onChange={e => setAboutForm(f => ({ ...f, content: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }} /></label>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>Kaydet</button>
            </form>
          </div>
        )}

        {/* ── FINANCE ───────────────────────────────── */}
        {activeView === "finance" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ margin: 0 }}>Gelir / Gider</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Toplam Gelir", value: financeTotal("income").toLocaleString("tr-TR") + " ₺", color: "var(--leaf)" },
                { label: "Toplam Gider", value: financeTotal("expense").toLocaleString("tr-TR") + " ₺", color: "#e53e3e" },
                { label: "Net Bakiye", value: (financeTotal("income") - financeTotal("expense")).toLocaleString("tr-TR") + " ₺", color: "var(--gold)" },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding: "1.2rem", borderRadius: 14, border: "1px solid var(--hairline)" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--ink-muted)", display: "block" }}>{s.label}</span>
                  <h2 style={{ margin: "0.4rem 0 0", color: s.color, fontSize: "1.5rem" }}>{s.value}</h2>
                </div>
              ))}
            </div>
            <form onSubmit={addFinanceEntry} className="card" style={{ padding: "1.25rem", borderRadius: 14, border: "1px solid var(--hairline)", display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem" }}>Kayıt Ekle</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Tip<select value={financeForm.type} onChange={e => setFinanceForm(f => ({ ...f, type: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.5rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem" }}><option value="income">Gelir</option><option value="expense">Gider</option></select></label>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Tutar (₺) *<input type="number" required min="0.01" step="0.01" value={financeForm.amount} onChange={e => setFinanceForm(f => ({ ...f, amount: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.5rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }} /></label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Tarih<input type="date" value={financeForm.date} onChange={e => setFinanceForm(f => ({ ...f, date: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.5rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }} /></label>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Açıklama<input value={financeForm.description} onChange={e => setFinanceForm(f => ({ ...f, description: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.5rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }} /></label>
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>Ekle</button>
            </form>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 14, overflow: "hidden" }}>
                <thead>
                  <tr style={{ background: "var(--bg-warm)", borderBottom: "2px solid var(--hairline)" }}>
                    {["Tarih", "Tip", "Tutar", "Açıklama", ""].map(h => (
                      <th key={h} style={{ padding: "0.75rem 1rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--ink-muted)", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {financeEntries.map(e => (
                    <tr key={e.id} style={{ borderBottom: "1px solid var(--hairline)" }}>
                      <td style={{ padding: "0.7rem 1rem", fontSize: "0.85rem", color: "var(--ink-muted)" }}>{e.date}</td>
                      <td style={{ padding: "0.7rem 1rem" }}><span style={{ padding: "0.15rem 0.5rem", background: e.type === "income" ? "#c6f6d5" : "#fed7d7", color: e.type === "income" ? "#276749" : "#c53030", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600 }}>{e.type === "income" ? "Gelir" : "Gider"}</span></td>
                      <td style={{ padding: "0.7rem 1rem", fontWeight: 700, color: e.type === "income" ? "var(--leaf)" : "#e53e3e" }}>{Number(e.amount).toLocaleString("tr-TR")} ₺</td>
                      <td style={{ padding: "0.7rem 1rem", fontSize: "0.88rem" }}>{e.description}</td>
                      <td style={{ padding: "0.7rem 1rem" }}><button className="btn btn-ghost btn-sm" style={{ color: "#e53e3e" }} onClick={() => deleteFinanceEntry(e.id)}>Sil</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {financeEntries.length === 0 && <p style={{ padding: "2rem", textAlign: "center", color: "var(--ink-muted)" }}>Henüz kayıt yok.</p>}
            </div>
          </div>
        )}

        {/* ── SETTINGS ──────────────────────────────── */}
        {activeView === "settings" && (
          <div>
            <h2 style={{ marginTop: 0 }}>Mağaza Ayarları</h2>
            <form onSubmit={saveSettingsForm} className="settings-form card" style={{ padding: "1.5rem", borderRadius: 14, border: "1px solid var(--hairline)", display: "flex", flexDirection: "column", gap: "0.8rem", maxWidth: 560 }}>
              {[
                ["Mağaza Adı", "storeName", "text"],
                ["Slogan", "tagline", "text"],
                ["Telefon", "phone", "text"],
                ["E-posta", "email", "email"],
                ["Kargo Ücreti (₺)", "shippingFee", "number"],
                ["Ücretsiz Kargo Limiti (₺)", "freeShippingOver", "number"],
                ["WhatsApp (rakamlar)", "whatsapp", "text"],
              ].map(([label, key, type]) => (
                <label key={key} style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {label}
                  <input type={type} value={settings[key] || ""} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }} />
                </label>
              ))}
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Adres<textarea rows={2} value={settings.address || ""} onChange={e => setSettings(s => ({ ...s, address: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }} /></label>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Duyuru Bandı<textarea rows={2} value={settings.announcement || ""} onChange={e => setSettings(s => ({ ...s, announcement: e.target.value }))} style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid var(--hairline)", marginTop: "0.3rem", boxSizing: "border-box" }} /></label>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>Ayarları Kaydet</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
