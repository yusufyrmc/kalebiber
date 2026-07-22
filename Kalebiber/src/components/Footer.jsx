"use client";

import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-pro">
      <div className="footer-pro-inner">
        <div className="footer-pro-grid">
          {/* Col 1 — Brand */}
          <div className="footer-brand-col">
            <Link href="/" className="footer-brand-link">
              <img src="/images/logo-yuvarlak.png" alt="Yarımca Kale Bibercisi" width={44} height={44} />
              <div>
                <span className="footer-brand-name">Yarımca</span>
                <em className="footer-brand-sub">Kale Bibercisi</em>
              </div>
            </Link>
            <p className="footer-brand-desc">
              Denizli Kale ilçesinin bereketli topraklarından sofranıza. %100 doğal, katıksız biber.
            </p>
            <div className="footer-social-row">
              <a href="https://wa.me/905384478410" target="_blank" rel="noreferrer" className="footer-social-chip">
                💬 WhatsApp
              </a>
              <a href="tel:+905384478410" className="footer-social-chip">
                📞 Ara
              </a>
            </div>
          </div>

          {/* Col 2 — Sayfalar */}
          <div className="footer-nav-col">
            <h5 className="footer-col-heading">Sayfalar</h5>
            <ul className="footer-nav-list">
              <li><Link href="/">Ana Sayfa</Link></li>
              <li><Link href="/magaza">Tüm Ürünler</Link></li>
              <li><Link href="/#hakkimizda">Hakkımızda</Link></li>
              <li><Link href="/#yorumlar">Yorumlar</Link></li>
              <li><Link href="/#sss">SSS</Link></li>
            </ul>
          </div>

          {/* Col 3 — Hesap & Takip */}
          <div className="footer-nav-col">
            <h5 className="footer-col-heading">Hesap & Destek</h5>
            <ul className="footer-nav-list">
              <li><Link href="/takip">Sipariş Takibi</Link></li>
              <li><Link href="/hesap">Hesabım</Link></li>
              <li><a href="https://wa.me/905384478410" target="_blank" rel="noreferrer">WhatsApp Sipariş</a></li>
              <li><Link href="/admin">Yönetici Paneli</Link></li>
            </ul>
          </div>

          {/* Col 4 — Güvenli Ödeme */}
          <div className="footer-nav-col">
            <h5 className="footer-col-heading">Güvenli Ödeme</h5>
            <div className="footer-payment-badges">
              <div className="footer-payment-badge">🛡️ Kapıda Ödeme</div>
              <div className="footer-payment-badge">💳 Kredi Kartı</div>
              <div className="footer-payment-badge">🏦 Havale / EFT</div>
            </div>
            <p className="footer-contact-info">
              📍 Denizli · Kale İlçesi<br />
              ✉️ siparis@kalebiber.com
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-pro-bottom">
          <p>© {currentYear} Yarımca Kale Bibercisi. Tüm hakları saklıdır.</p>
          <div className="footer-bottom-links">
            <span>Gizlilik Politikası</span>
            <span className="footer-divider">·</span>
            <span>Mesafeli Satış</span>
            <span className="footer-divider">·</span>
            <span>Kargo & İade</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
