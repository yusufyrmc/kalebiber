"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ProductDetailModal from "@/components/ProductDetailModal";
import { useCart } from "@/context/CartContext";

export default function HomePage() {
  const { setIsCartOpen } = useCart();
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [settings, setSettings] = useState(null);
  const [reviewStats, setReviewStats] = useState({ avgRating: "4.9", totalCount: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [starFilter, setStarFilter] = useState("all");

  const [selectedProduct, setSelectedProduct] = useState(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewMessage, setReviewMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch((err) => console.error("Settings load error:", err));

    fetch("/api/products", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.products) setProducts(data.products);
      })
      .catch((err) => console.error(err));

    fetch("/api/reviews", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.reviews) {
          setReviews(data.reviews);
          setReviewStats({ avgRating: data.avgRating, totalCount: data.totalCount });
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const heroInfo = settings?.navbar || {
    eyebrow: "Bahçeden Sofranıza Hasat",
    title: "Taze Biber,",
    titleAccent: "Gerçek Lezzet",
    heroLead:     "Denizli Kale ilçesinin bereketli topraklarından özenle toplanmış %100 doğal biber çeşitleri.",
    imageUrl: "/uploads/1783037299290-923cbde8.png",
  };

  const aboutInfo = settings?.about || {
    title: "Geleneksel Hasat Hikayemiz",
    content:
      "Yarımca Kale Bibercisi olarak, nesilden nesile aktarılan tarım geleneklerimizle tarlalarımızda katıksız biber yetiştiriyoruz. Güneşle kurutulan balon biberlerimiz ve taze toplanan mahsullerimizle sofranıza doğallık katıyoruz.",
    photos: [],
  };

  const filteredProducts = products.filter((p) => {
    if (!p) return false;
    const matchesCategory = category === "all" || (p.category || "taze") === category;
    const matchesSearch = (p.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredReviews = reviews.filter((r) => {
    if (starFilter === "all") return true;
    return Number(r.rating) === Number(starFilter);
  });

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewMessage("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: reviewAuthor,
          text: reviewText,
          rating: reviewRating,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Yorum gönderilemedi.");

      setReviews([data.review, ...reviews]);
      setReviewMessage("Yorumunuz başarıyla alındı! Teşekkürler.");
      setTimeout(() => {
        setReviewModalOpen(false);
        setReviewMessage("");
        setReviewAuthor("");
        setReviewText("");
      }, 1500);
    } catch (err) {
      setReviewMessage(err.message);
    }
  };

  return (
    <div style={{ overflowX: "hidden" }}>
      {/* 1. HERO SECTION */}
      <section className="hero-pro-container">
        <div className="hero-pro-grid">
          <div className="hero-text-block">
            <div className="hero-badge-pill">
              <span>🌱</span>
              <span>{heroInfo.eyebrow || "Bahçeden Sofranıza Hasat"}</span>
            </div>

            <h1 className="hero-title-large">
              {heroInfo.title || "Taze Biber,"} <br />
              <strong>{heroInfo.titleAccent || "Gerçek Lezzet"}</strong>
            </h1>

            <p className="hero-description">
              {heroInfo.heroLead ||
                    "Denizli Kale ilçesinin bereketli topraklarından özenle toplanmış %100 doğal biber çeşitleri."}
            </p>

            <div className="hero-action-buttons">
              <a href="#urunler" className="btn-primary-hero">
                <span>Alışverişe Başla</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
              <button type="button" className="btn-secondary-hero" onClick={() => setIsCartOpen(true)}>
                <span>Sepeti Görüntüle</span>
              </button>
            </div>

            <div style={{ display: "flex", gap: "1.5rem", marginTop: "2.5rem", flexWrap: "wrap", fontSize: "0.9rem", color: "var(--text-muted)" }}>
              <span>✓ <strong>%100 Yerli</strong> Üretim</span>
              <span>✓ <strong>Aynı Gün</strong> Hasat & Kargo</span>
              <span>✓ <strong>Kapıda</strong> Ödeme Kolaylığı</span>
            </div>
          </div>

          <div className="hero-visual-block">
            <div className="hero-image-frame">
              <img
                src={heroInfo.imageUrl || "/uploads/1783037299290-923cbde8.png"}
                alt="Yarımca Kale Biberi Hasat"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. VALUE PROPOSITIONS GRID */}
      <section className="features-bar">
        <div className="features-grid">
          <div className="feature-item-card">
            <div className="feature-icon-wrapper">🌿</div>
            <div>
              <h4 className="feature-title">%100 Doğal & Katkısız</h4>
              <p className="feature-sub">Koruyucu ve kimyasal kullanılmadan tarladan mutfağınıza.</p>
            </div>
          </div>

          <div className="feature-item-card">
            <div className="feature-icon-wrapper">☀️</div>
            <div>
              <h4 className="feature-title">Güneşte Doğal Kurutma</h4>
              <p className="feature-sub">Geleneksel yöntemlerle kurutulmuş yüksek aromalı biberler.</p>
            </div>
          </div>

          <div className="feature-item-card">
            <div className="feature-icon-wrapper">🚀</div>
            <div>
              <h4 className="feature-title">Aynı Gün Hızlı Kargo</h4>
              <p className="feature-sub">Özenle paketlenen siparişleriniz tazeliğini yitirmeden kapınızda.</p>
            </div>
          </div>

          <div className="feature-item-card">
            <div className="feature-icon-wrapper">🛡️</div>
            <div>
              <h4 className="feature-title">Güvenli Alışveriş</h4>
              <p className="feature-sub">Kapıda ödeme veya kredi kartı ile güvenli sipariş garantisi.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. COMPACT HIGH-CONVERTING PRODUCTS CATALOG SHOWCASE */}
      <section className="section section-products" id="urunler" style={{ background: "var(--warm-bg)", padding: "3rem 1.5rem" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.8rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <span className="section-badge" style={{ background: "rgba(90, 114, 0, 0.08)", color: "var(--primary-emerald)", fontSize: "0.78rem" }}>
                🌱 Taze Tarladan Hasat
              </span>
              <h2 className="section-title" style={{ fontSize: "2rem", margin: "0.2rem 0 0" }}>
                Sezon Mahsulleri
              </h2>
            </div>

            <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="search"
                className="shop-search"
                placeholder="🔍 Ürün ara…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: "0.55rem 1rem", borderRadius: "10px", border: "1px solid var(--glass-border)", background: "#ffffff", fontSize: "0.88rem", width: 200 }}
              />
              <div className="shop-filters" role="group" style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  type="button"
                  className={`filter-pill ${category === "all" ? "is-active" : ""}`}
                  onClick={() => setCategory("all")}
                  style={{ padding: "0.45rem 0.9rem", fontSize: "0.82rem" }}
                >
                  Tümü ({products.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${category === "taze" ? "is-active" : ""}`}
                  onClick={() => setCategory("taze")}
                  style={{ padding: "0.45rem 0.9rem", fontSize: "0.82rem" }}
                >
                  🫑 Taze Biber
                </button>
                <button
                  type="button"
                  className={`filter-pill ${category === "kurutulmus" ? "is-active" : ""}`}
                  onClick={() => setCategory("kurutulmus")}
                  style={{ padding: "0.45rem 0.9rem", fontSize: "0.82rem" }}
                >
                  🌶️ Kurutulmuş
                </button>
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", background: "#ffffff", borderRadius: "16px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>Aradığınız kriterlere uygun ürün bulunamadı.</p>
            </div>
          ) : (
            <div className="product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.2rem" }}>
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

      {/* 4. HAKKIMIZDA SECTION */}
      <section id="hakkimizda" className="about-section-pro">
        <div className="about-pro-grid">
          <div>
            <span className="section-badge" style={{ background: "rgba(90, 114, 0, 0.08)", color: "var(--primary-emerald)" }}>
              🌿 30 Yıllık Hasat Geleneği
            </span>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "2.8rem", margin: "0.6rem 0 1.2rem", lineHeight: 1.15 }}>
              {aboutInfo.title || "Tarladan Sofranıza Uzanan Doğallık"}
            </h2>
            <p style={{ fontSize: "1.05rem", lineHeight: 1.7, color: "var(--text-muted)", margin: "0 0 1.5rem" }}>
              {aboutInfo.content}
            </p>

            <div className="about-highlights-grid">
              <div className="about-highlight-chip">
                <span>🌱</span>
                <div>
                  <strong>%100 Doğal Hasat</strong>
                  <small>Sıfır koruyucu & kimyasal</small>
                </div>
              </div>
              <div className="about-highlight-chip">
                <span>☀️</span>
                <div>
                  <strong>Güneşte Kurutma</strong>
                  <small>Geleneksel açık hava</small>
                </div>
              </div>
              <div className="about-highlight-chip">
                <span>🌾</span>
                <div>
                  <strong>Ata Tohumu</strong>
                  <small>Kale Köyü verimli toprakları</small>
                </div>
              </div>
              <div className="about-highlight-chip">
                <span>📦</span>
                <div>
                  <strong>Taze Kargo</strong>
                  <small>Hasat günü paketleme</small>
                </div>
              </div>
            </div>
          </div>

          <div className="about-image-stack">
            <img
              src="/uploads/1781217375828-c05eb8bc.jpg"
              alt="Yarımca Kale Bibercisi Hasat"
              className="about-main-img"
            />
            <div className="about-floating-badge">
              <span style={{ fontSize: "1.5rem" }}>🏆</span>
              <div>
                <strong style={{ display: "block", fontSize: "0.95rem" }}>30+ Yıllık Tecrübe</strong>
                <span style={{ fontSize: "0.8rem", opacity: 0.85 }}>Denizli · Kale İlçesi</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SLEEK & COMPACT REVIEWS SECTION */}
      <section id="yorumlar" className="compact-reviews-section">
        <div className="container">
          <div className="compact-reviews-header">
            <div className="compact-reviews-title-area">
              <span className="compact-reviews-badge">Müşteri Deneyimleri</span>
              <h2 className="compact-reviews-title">Gerçek Değerlendirmeler</h2>
            </div>

            <div className="compact-rating-pill">
              <div className="compact-score-num">{reviewStats.avgRating}</div>
              <div>
                <div style={{ color: "var(--gold-accent)", fontSize: "1rem", lineHeight: 1 }}>★★★★★</div>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
                  {reviewStats.totalCount} Onaylı Yorum
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setReviewModalOpen(true)}
              style={{ padding: "0.6rem 1.2rem", fontSize: "0.9rem", borderRadius: "10px", borderColor: "var(--primary-emerald)", color: "var(--primary-emerald)", fontWeight: 600 }}
            >
              ✍️ Yorum Yazın
            </button>
          </div>

          <div className="compact-reviews-grid">
            {filteredReviews.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", gridColumn: "1 / -1", background: "#ffffff", borderRadius: "14px" }}>
                Henüz değerlendirme bulunmamaktadır.
              </div>
            ) : (
              filteredReviews.slice(0, 3).map((rev) => (
                <div key={rev.id} className="compact-review-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div className="review-user-avatar">
                        {rev.author ? rev.author.charAt(0).toUpperCase() : "M"}
                      </div>
                      <div>
                        <strong style={{ fontSize: "0.95rem", display: "block", color: "var(--text-main)" }}>
                          {rev.author}
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "#7fa800", fontWeight: 600 }}>
                          ✓ Onaylı Alıcı
                        </span>
                      </div>
                    </div>
                    <span style={{ color: "var(--gold-accent)", fontSize: "0.9rem" }}>{"★".repeat(rev.rating)}</span>
                  </div>

                  <p className="compact-review-text">
                    "{rev.text}"
                  </p>

                  <div style={{ marginTop: "0.8rem", fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "right" }}>
                    {new Date(rev.createdAt || Date.now()).toLocaleDateString("tr-TR")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 6. SLEEK & COMPACT FAQ SECTION */}
      <section className="compact-faq-section" id="sss">
        <div className="compact-faq-grid">
          <div>
            <span className="section-badge" style={{ background: "rgba(90, 114, 0, 0.08)", color: "var(--primary-emerald)" }}>
              Merak Edilenler
            </span>
            <h2 style={{ fontSize: "2rem", margin: "0.4rem 0 0.8rem", fontWeight: 700 }}>
              Sık Sorulan Sorular
            </h2>
            <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              Biberlerimizin hasadından kargolanma sürecine ve ödeme yöntemlerine kadar sorularınızın yanıtı burada.
            </p>
          </div>

          <div className="compact-faq-list">
            <details className="compact-faq-card">
              <summary>Biberleriniz nasıl kargolanıyor?</summary>
              <div className="compact-faq-answer">
                Özel havalandırmalı gıda kutularımızda 1-3 iş gününde tazeliğini yitirmeden kapınıza ulaşır.
              </div>
            </details>

            <details className="compact-faq-card">
              <summary>Kapıda ödeme var mı?</summary>
              <div className="compact-faq-answer">
                Evet! Kapıda ödeme, Havale/EFT ve Kredi Kartı seçeneklerimiz mevcuttur.
              </div>
            </details>

            <details className="compact-faq-card">
              <summary>Kurutulmuş ürünlerde katkı var mı?</summary>
              <div className="compact-faq-answer">
                Hayır, %100 geleneksel açık hava güneş kurutmasıdır. Sıfır koruyucu içerir.
              </div>
            </details>

            <details className="compact-faq-card">
              <summary>Siparişimi nasıl takip ederim?</summary>
              <div className="compact-faq-answer">
                Sipariş sonundaki KB- koda sahip numara ile <Link href="/takip" style={{ color: "var(--accent-red)", fontWeight: 600 }}>Sipariş Takip</Link> sayfasından izleyebilirsiniz.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Review Modal */}
      {reviewModalOpen && (
        <div className="product-layer is-open">
          <div className="product-layer-backdrop" onClick={() => setReviewModalOpen(false)}></div>
          <div className="product-layer-dialog" style={{ maxWidth: 520, borderRadius: 24, padding: "2rem" }}>
            <button type="button" className="product-layer-close" onClick={() => setReviewModalOpen(false)}>
              ✕
            </button>
            <div style={{ marginBottom: "1.2rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary-emerald)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                ✍️ Değerlendirme
              </span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.2rem 0 0.4rem", color: "var(--text-main)" }}>
                Yorum Yazın
              </h3>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", margin: 0 }}>
                Deneyiminizi paylaşın, diğer lezzet tutkunlarına yol gösterin.
              </p>
            </div>

            <form onSubmit={handleReviewSubmit} className="review-form review-form--styled">
              <div className="form-field">
                <label className="form-field-label">Adınız Soyadınız</label>
                <div className="form-field-control">
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Örn. Ahmet Yılmaz"
                    value={reviewAuthor}
                    onChange={(e) => setReviewAuthor(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-field-label">Puanınız</label>
                <div className="form-field-control form-field-control--stars" style={{ display: "flex", alignItems: "center" }}>
                  <div className="star-input star-input--boxed">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={star <= reviewRating ? "is-on" : ""}
                        onClick={() => setReviewRating(star)}
                        title={`${star} Yıldız`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <span style={{ marginLeft: "0.8rem", fontSize: "0.88rem", fontWeight: 600, color: "#e6a800" }}>
                    {reviewRating === 5 && "Harika (5/5)"}
                    {reviewRating === 4 && "İyi (4/5)"}
                    {reviewRating === 3 && "Orta (3/5)"}
                    {reviewRating === 2 && "Zayıf (2/5)"}
                    {reviewRating === 1 && "Kötü (1/5)"}
                  </span>
                </div>
              </div>

              <div className="form-field">
                <label className="form-field-label">Yorumunuz</label>
                <div className="form-field-control">
                  <textarea
                    rows={4}
                    required
                    className="form-textarea"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Ürünün tadı, tazeliği ve teslimat sürecinden bahsedebilirsiniz..."
                  ></textarea>
                </div>
              </div>

              {reviewMessage && (
                <div style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  background: reviewMessage.includes("başarıyla") ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  color: reviewMessage.includes("başarıyla") ? "#15803d" : "#b91c1c",
                  marginTop: "0.5rem"
                }}>
                  {reviewMessage}
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-block review-submit-btn" style={{ marginTop: "1rem" }}>
                Yorumu Gönder
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
