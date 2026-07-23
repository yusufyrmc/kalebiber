"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

export default function ProductCard({ product, onOpenDetail }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const imgSrc = product.imageUrl || product.image_url || product.image || "/uploads/1781217375828-c05eb8bc.jpg";

  const handleAdd = (e) => {
    e.stopPropagation();
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="product-card-compact" onClick={() => onOpenDetail && onOpenDetail(product)}>
      <div className="compact-card-media">
        {product.badge && <span className="product-badge-sm">{product.badge}</span>}
        <img src={imgSrc} alt={product.name} loading="lazy" />
      </div>

      <div className="compact-card-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="compact-card-cat">
            {product.category === "kurutulmus" ? "Kurutulmuş" : "Taze Biber"}
          </span>
          <span style={{ fontSize: "0.78rem", color: "var(--gold-accent)", fontWeight: 600 }}>★ 4.9</span>
        </div>

        <h3 className="compact-card-title">{product.name}</h3>

        <div className="compact-card-footer">
          <div className="compact-card-price">
            <strong>{product.price} ₺</strong>
            <small> / {product.unit || "kg"}</small>
          </div>

          <button
            type="button"
            className={`compact-add-btn ${added ? "is-added" : ""}`}
            onClick={handleAdd}
          >
            {added ? "✓ Eklendi" : "+ Sepete Ekle"}
          </button>
        </div>
      </div>
    </div>
  );
}
