"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function CheckoutModal({ onClose }) {
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
    address: user?.address || "",
    city: user?.city || "",
    note: "",
    payment: "kapida",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successOrder, setSuccessOrder] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            city: formData.city,
            note: formData.note,
          },
          items: cart.map((i) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            qty: i.qty,
          })),
          paymentMethod: formData.payment,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Sipariş oluşturulamadı");
      }

      setSuccessOrder(data.order || data);
      clearCart();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-layer is-open">
      <div className="checkout-backdrop" onClick={onClose}></div>
      <div className="checkout-dialog" role="dialog" aria-modal="true">
        <div className="checkout-head">
          <h2>Siparişi tamamla</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {successOrder ? (
          <div className="checkout-success" style={{ display: "block" }}>
            <p className="checkout-success-lead">🎉 Siparişiniz alındı!</p>
            <p className="fineprint">
              Sipariş Kodu: <strong>{successOrder.id || successOrder.orderCode}</strong>
            </p>
            <p className="fineprint" style={{ margin: "1rem 0" }}>
              Bu kodu saklayın;{" "}
              <Link href="/takip" onClick={onClose} style={{ color: "var(--accent)", textDecoration: "underline" }}>
                sipariş takip
              </Link>{" "}
              sayfasından durumu izleyebilirsiniz.
            </p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Tamam
            </button>
          </div>
        ) : (
          <form className="checkout-form" onSubmit={handleSubmit}>
            <div
              className="checkout-summary"
              style={{
                background: "var(--bg-warm)",
                padding: "1rem",
                borderRadius: "12px",
                marginBottom: "1rem",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                Sipariş Özeti ({cart.length} çeşit ürün)
              </div>
              {cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.9rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  <span>
                    {item.name} x {item.qty}
                  </span>
                  <span>{(item.price * item.qty).toLocaleString("tr-TR")} ₺</span>
                </div>
              ))}
              <hr style={{ border: 0, borderTop: "1px solid var(--hairline)", margin: "0.5rem 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span>Toplam:</span>
                <span>{cartTotal.toLocaleString("tr-TR")} ₺</span>
              </div>
            </div>

            <fieldset className="checkout-payment" style={{ border: 0, padding: 0, marginBottom: "1rem" }}>
              <legend style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                Ödeme Yöntemi
              </legend>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <label className="payment-option">
                  <input
                    type="radio"
                    name="payment"
                    value="kapida"
                    checked={formData.payment === "kapida"}
                    onChange={(e) => setFormData({ ...formData, payment: e.target.value })}
                  />{" "}
                  Kapıda ödeme
                </label>
                <label className="payment-option">
                  <input
                    type="radio"
                    name="payment"
                    value="havale"
                    checked={formData.payment === "havale"}
                    onChange={(e) => setFormData({ ...formData, payment: e.target.value })}
                  />{" "}
                  Havale / EFT
                </label>
                <label className="payment-option">
                  <input
                    type="radio"
                    name="payment"
                    value="kart"
                    checked={formData.payment === "kart"}
                    onChange={(e) => setFormData({ ...formData, payment: e.target.value })}
                  />{" "}
                  Kredi Kartı
                </label>
              </div>
            </fieldset>

            <label>
              Ad soyad *
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </label>

            <label>
              Telefon *
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </label>

            <label>
              E-posta *
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </label>

            <label>
              Teslimat Adresi *
              <textarea
                rows={2}
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </label>

            <label>
              İl / İlçe
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </label>

            <label>
              Sipariş Notu
              <textarea
                rows={2}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              />
            </label>

            {error && <p className="checkout-error">{error}</p>}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ marginTop: "1rem" }}
            >
              {loading ? "Sipariş Alınıyor..." : "Siparişi Onayla"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
