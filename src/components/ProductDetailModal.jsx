"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

export default function ProductDetailModal({ product, onClose }) {
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const handleAddToCart = () => {
    addToCart(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const imgSrc = product.imageUrl || product.image_url || product.image || "/uploads/1781217375828-c05eb8bc.jpg";

  return (
    <div className="product-layer is-open">
      <div className="product-layer-backdrop" onClick={onClose}></div>
      <div className="product-layer-dialog" style={{ maxWidth: 680, padding: 0, overflow: "hidden", borderRadius: 24 }}>
        <button
          type="button"
          className="icon-btn product-layer-close"
          onClick={onClose}
          style={{ top: 16, right: 16, zIndex: 10, background: "rgba(255,255,255,0.9)" }}
        >
          ×
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          <div style={{ position: "relative", background: "var(--bg-warm)" }}>
            {product.badge && <span className="product-badge">{product.badge}</span>}
            <img
              src={imgSrc}
              alt={product.name}
              style={{ width: "100%", height: "100%", minHeight: 360, objectFit: "cover", display: "block" }}
            />
          </div>

          <div style={{ padding: "2rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary-emerald)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {product.category === "kurutulmus" ? "Geleneksel Kurutma" : "Taze Mahsul"}
              </span>

              <h2 style={{ fontSize: "1.6rem", margin: "0.4rem 0 0.6rem", color: "var(--text-main)" }}>
                {product.name}
              </h2>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ color: "var(--gold-accent)", fontSize: "1rem" }}>★★★★★</span>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>4.9 (Onaylı Hasat)</span>
              </div>

              <p style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "var(--text-muted)", marginBottom: "1.5rem" }}>
                {product.desc || "Denizli Kale ilçesi tarlalarımızdan mevsiminde özenle toplanmış katıksız lezzet."}
              </p>

              <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginBottom: "1.5rem" }}>
                <strong style={{ fontSize: "1.8rem", color: "var(--accent-red)" }}>
                  {product.price} ₺
                </strong>
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                  / {product.unit || "kg"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>Miktar ({product.unit || "kg"}):</span>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--glass-border)", borderRadius: 10, background: "var(--warm-bg)" }}>
                  <button
                    type="button"
                    style={{ border: 0, background: "none", padding: "0.4rem 0.8rem", cursor: "pointer", fontWeight: 700 }}
                    onClick={() => setQty(Math.max(1, qty - 1))}
                  >
                    -
                  </button>
                  <span style={{ padding: "0 0.6rem", fontWeight: 700, fontSize: "0.95rem" }}>{qty}</span>
                  <button
                    type="button"
                    style={{ border: 0, background: "none", padding: "0.4rem 0.8rem", cursor: "pointer", fontWeight: 700 }}
                    onClick={() => setQty(qty + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleAddToCart}
              style={{ padding: "0.9rem", fontSize: "1rem" }}
            >
              {added ? "✓ Sepete Eklendi!" : `Sepete Ekle (${(product.price * qty).toLocaleString("tr-TR")} ₺)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
