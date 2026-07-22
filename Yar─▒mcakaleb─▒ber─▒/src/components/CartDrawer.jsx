"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import CheckoutModal from "./CheckoutModal";

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    cartTotal,
  } = useCart();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  if (!isCartOpen) return null;

  return (
    <>
      <aside
        className={`cart-panel ${isCartOpen ? "is-open" : ""}`}
        aria-label="Sepet"
        aria-hidden={!isCartOpen}
      >
        <div className="cart-panel-header">
          <h2>Sepetiniz ({cart.reduce((s, i) => s + i.qty, 0)})</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setIsCartOpen(false)}
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        <div className="cart-panel-body">
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--ink-muted)" }}>
              <p>Sepetiniz boş.</p>
              <button
                type="button"
                className="btn btn-outline"
                style={{ marginTop: "1rem" }}
                onClick={() => setIsCartOpen(false)}
              >
                Alışverişe başla
              </button>
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {cart.map((item) => (
                <li
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "1rem 0",
                    borderBottom: "1px solid var(--hairline)",
                  }}
                >
                  <img
                    src={item.imageUrl || item.image || "/uploads/1781217375828-c05eb8bc.jpg"}
                    alt={item.name}
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 10,
                      objectFit: "cover",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: "0.95rem" }}>{item.name}</h4>
                    <p style={{ margin: "0.2rem 0 0", color: "var(--accent)", fontWeight: 600 }}>
                      {item.price} ₺ / {item.unit}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: "0.1rem 0.5rem" }}
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 600 }}>{item.qty}</span>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: "0.1rem 0.5rem" }}
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeFromCart(item.id)}
                    style={{ color: "#d9534f" }}
                    title="Sil"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-panel-footer">
            <p className="cart-total">
              <span>Ara toplam</span> <strong>{cartTotal.toLocaleString("tr-TR")} ₺</strong>
            </p>
            <p className="fineprint">Kargo ve vergiler ödemede hesaplanır.</p>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => {
                setIsCartOpen(false);
                setIsCheckoutOpen(true);
              }}
            >
              Siparişi tamamla
            </button>
          </div>
        )}
      </aside>

      <div
        className="cart-backdrop is-open"
        onClick={() => setIsCartOpen(false)}
      ></div>

      {isCheckoutOpen && (
        <CheckoutModal onClose={() => setIsCheckoutOpen(false)} />
      )}
    </>
  );
}
