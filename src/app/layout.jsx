import "./globals.css";
import "./styles.css";
import "./admin-panel.css";
import "./shop.css";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import NavbarWrapper from "@/components/NavbarWrapper";
import FooterWrapper from "@/components/FooterWrapper";
import CartDrawer from "@/components/CartDrawer";
import AuthModal from "@/components/AuthModal";

export const metadata = {
  title: "Yarımca Kale Bibercisi | Taze Biber & Geleneksel Lezzet",
  description: "Yarımca Kale Bibercisi — doğal, taze ve seçilmiş biber çeşitleri.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <CartProvider>
            <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
              <NavbarWrapper />
              <main style={{ flex: 1 }}>{children}</main>
              <FooterWrapper />
              <CartDrawer />
              <AuthModal />
            </div>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
