"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";
import ProductDetailModal from "@/components/ProductDetailModal";

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch("/api/products", { cache: "no-store", signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list = data.products || data || [];
        setProducts(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Ürünler yüklenemedi:", err);
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });
  }, []);

  const filteredProducts = products.filter((p) => {
    if (!p) return false;
    const matchesCategory = category === "all" || (p.category || "taze") === category;
    const matchesSearch = (p.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ paddingTop: "110px", paddingBottom: "4rem", background: "var(--warm-bg)", minHeight: "100vh" }}>
      <section style={{ padding: "0 1.5rem" }}>
        <div className="container">

          {/* Page Header */}
          <div style={{ marginBottom: "2rem" }}>
            <span className="section-badge" style={{ background: "rgba(90, 114, 0, 0.08)", color: "var(--primary-emerald)", fontSize: "0.78rem" }}>
              🌱 Taze Tarladan Hasat
            </span>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 700, margin: "0.3rem 0 0.5rem" }}>Tüm Ürünler</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "1rem", margin: 0 }}>
              En taze ve özenle seçilmiş biber çeşitlerimizi inceleyin.
            </p>
          </div>

          {/* Toolbar */}
          <div style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#ffffff",
            padding: "0.8rem 1.2rem",
            borderRadius: "16px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
            marginBottom: "2rem",
          }}>
            <input
              type="search"
              className="shop-search"
              placeholder="🔍 Ürün ara…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: "0.6rem 1rem", borderRadius: "10px", border: "1px solid var(--glass-border)", background: "var(--warm-bg)", fontSize: "0.9rem", minWidth: 220, flex: 1 }}
            />
            <div className="shop-filters" role="group" style={{ display: "flex", gap: "0.4rem" }}>
              <button type="button" className={`filter-pill ${category === "all" ? "is-active" : ""}`} onClick={() => setCategory("all")}>
                Tümü ({products.length})
              </button>
              <button type="button" className={`filter-pill ${category === "taze" ? "is-active" : ""}`} onClick={() => setCategory("taze")}>
                🫑 Taze Biber
              </button>
              <button type="button" className={`filter-pill ${category === "kurutulmus" ? "is-active" : ""}`} onClick={() => setCategory("kurutulmus")}>
                🌶️ Kurutulmuş
              </button>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-muted)" }}>
              <p>Ürünler yükleniyor…</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 1rem", background: "#ffffff", borderRadius: "16px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>Aradığınız kriterlere uygun ürün bulunamadı.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.2rem" }}>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpenDetail={(prod) => setSelectedProduct(prod)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
