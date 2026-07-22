"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { cartCount, setIsCartOpen } = useCart();
  const { user, setIsAuthModalOpen } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={`navbar-floating-wrapper ${scrolled ? "is-scrolled" : ""}`}>
      <header className="navbar-glass-container">
        <div className="navbar-inner">
          {/* Brand Logo */}
          <Link href="/" className="navbar-brand-logo">
            <div className="logo-badge">
              <img src="/images/logo-yuvarlak.png" alt="Logo" width={38} height={38} />
            </div>
            <span className="logo-brand-text">
              Yarımca <em>Kale Bibercisi</em>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="navbar-menu-desktop">
            <ul className="navbar-links">
              <li>
                <Link href="/magaza" className={pathname === "/magaza" ? "is-active" : ""}>
                  Mağaza
                </Link>
              </li>
              <li>
                <Link href="/#yorumlar">Yorumlar</Link>
              </li>
              <li>
                <Link href="/#hakkimizda">Hakkımızda</Link>
              </li>
              <li>
                <Link href="/takip" className={pathname === "/takip" ? "is-active" : ""}>
                  Sipariş Takip
                </Link>
              </li>
              <li>
                <Link href="/#sss">SSS</Link>
              </li>
            </ul>
          </nav>

          {/* Right Actions (Auth + Cart + Mobile Toggle) */}
          <div className="navbar-actions">
            {user ? (
              <Link href="/hesap" className="nav-account-pill">
                <span className="user-icon">👤</span>
                <span>{user.name ? user.name.split(" ")[0] : "Hesabım"}</span>
              </Link>
            ) : (
              <button
                type="button"
                className="nav-account-pill"
                onClick={() => setIsAuthModalOpen(true)}
              >
                <span className="user-icon">👤</span>
                <span>Giriş Yap</span>
              </button>
            )}

            <button
              type="button"
              className="nav-cart-pill"
              onClick={() => setIsCartOpen(true)}
              title="Sepet"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M6 6h15l-1.5 9h-12z" />
                <circle cx="9" cy="20" r="1.5" fill="currentColor" />
                <circle cx="18" cy="20" r="1.5" fill="currentColor" />
                <path d="M6 6 5 3H2" />
              </svg>
              {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
            </button>

            <button
              type="button"
              className="navbar-mobile-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menü"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {isMobileMenuOpen && (
          <div className="navbar-mobile-dropdown">
            <ul className="mobile-nav-list">
              <li>
                <Link href="/magaza" onClick={() => setIsMobileMenuOpen(false)}>
                  🛒 Mağaza
                </Link>
              </li>
              <li>
                <Link href="/#yorumlar" onClick={() => setIsMobileMenuOpen(false)}>
                  ⭐ Yorumlar
                </Link>
              </li>
              <li>
                <Link href="/#hakkimizda" onClick={() => setIsMobileMenuOpen(false)}>
                  🌿 Hakkımızda
                </Link>
              </li>
              <li>
                <Link href="/takip" onClick={() => setIsMobileMenuOpen(false)}>
                  🚚 Sipariş Takip
                </Link>
              </li>
              <li>
                <Link href="/#sss" onClick={() => setIsMobileMenuOpen(false)}>
                  ❓ SSS
                </Link>
              </li>
            </ul>
          </div>
        )}
      </header>
    </div>
  );
}
