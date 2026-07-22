/**
 * Kale Biber — cart & UI
 * Ayarlar: WhatsApp ülke kodu + numara (rakamlar only)
 */
const WHATSAPP_COUNTRY = "90";
const WHATSAPP_NUMBER = "5384478410"; // Kendi numaranızla değiştirin

const PRODUCTS = [
  {
    id: "kurutulmuş Balon biber",
    name: "kurutulmuş Balon biber",
    desc: "Kışlık, ev yapımı kahvaltılık.",
    price: 300,
    unit: "kg",
    emoji: "🌶️",
    theme: "dry",
    badge: "Kışlık",
  },
 
];

const STORAGE_KEY = "kale-biber-cart";

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return typeof data === "object" && data !== null ? data : {};
  } catch {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

let cart = loadCart();

const els = {
  grid: document.getElementById("product-grid"),
  cartToggle: document.getElementById("cart-toggle"),
  cartClose: document.getElementById("cart-close"),
  cartPanel: document.getElementById("cart-panel"),
  cartBackdrop: document.getElementById("cart-backdrop"),
  cartItems: document.getElementById("cart-items"),
  cartCount: document.getElementById("cart-count"),
  cartTotal: document.getElementById("cart-total"),
  cartWhatsapp: document.getElementById("cart-whatsapp"),
  whatsappOrder: document.getElementById("whatsapp-order"),
  year: document.getElementById("year"),
  navToggle: document.querySelector(".nav-toggle"),
  navMenu: document.getElementById("nav-menu"),
  contactForm: document.getElementById("contact-form"),
};

function formatMoney(n) {
  return `${n.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
}

function cartLineTotal(item) {
  const p = PRODUCTS.find((x) => x.id === item.id);
  if (!p) return 0;
  return p.price * item.qty;
}

function cartTotals() {
  let sub = 0;
  let count = 0;
  for (const [id, qty] of Object.entries(cart)) {
    if (qty <= 0) continue;
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) continue;
    sub += p.price * qty;
    count += qty;
  }
  return { sub, count };
}

function setCartOpen(open) {
  els.cartPanel.setAttribute("aria-hidden", String(!open));
  els.cartBackdrop.setAttribute("aria-hidden", String(!open));
  els.cartToggle.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("cart-open", open);
  requestAnimationFrame(() => {
    els.cartPanel.classList.toggle("is-open", open);
    els.cartBackdrop.classList.toggle("is-visible", open);
  });
  if (open) els.cartClose.focus();
}

function renderProducts() {
  els.grid.innerHTML = PRODUCTS.map(
    (p) => `
    <article class="product-card" data-id="${p.id}">
      <div class="product-visual product-visual--${p.theme}" aria-hidden="true">
        ${p.badge ? `<span class="product-badge">${escapeHtml(p.badge)}</span>` : ""}
        <span>${p.emoji}</span>
      </div>
      <div class="product-body">
        <h3>${escapeHtml(p.name)}</h3>
        <p class="product-desc">${escapeHtml(p.desc)}</p>
        <div class="product-meta">
          <span class="product-price">${formatMoney(p.price)} <small>/${p.unit}</small></span>
          <div class="qty-row">
            <button type="button" data-act="dec" aria-label="Azalt">−</button>
            <input type="number" min="1" max="99" value="1" inputmode="numeric" aria-label="Miktar" />
            <button type="button" data-act="inc" aria-label="Arttır">+</button>
          </div>
        </div>
        <button type="button" class="btn btn-primary add-btn" data-add="${p.id}">Sepete ekle</button>
      </div>
    </article>
  `
  ).join("");

  els.grid.querySelectorAll(".add-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".product-card");
      const id = btn.getAttribute("data-add");
      const input = card.querySelector('input[type="number"]');
      let qty = parseInt(input.value, 10) || 1;
      qty = Math.min(99, Math.max(1, qty));
      cart[id] = (cart[id] || 0) + qty;
      saveCart(cart);
      renderCart();
      input.value = 1;
      setCartOpen(true);
    });
  });

  els.grid.querySelectorAll(".qty-row").forEach((row) => {
    const input = row.querySelector("input");
    row.querySelector('[data-act="dec"]').addEventListener("click", () => {
      input.value = String(Math.max(1, (parseInt(input.value, 10) || 1) - 1));
    });
    row.querySelector('[data-act="inc"]').addEventListener("click", () => {
      input.value = String(Math.min(99, (parseInt(input.value, 10) || 1) + 1));
    });
  });
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function renderCart() {
  const { sub, count } = cartTotals();
  const ids = Object.keys(cart).filter((id) => cart[id] > 0);

  if (count === 0) {
    els.cartItems.innerHTML = '<p class="cart-empty">Sepetiniz boş. Ürün eklemek için aşağı kaydırın.</p>';
    els.cartCount.hidden = true;
  } else {
    els.cartCount.hidden = false;
    els.cartCount.textContent = String(count);
    els.cartItems.innerHTML = ids
      .map((id) => {
        const p = PRODUCTS.find((x) => x.id === id);
        const qty = cart[id];
        if (!p) return "";
        const line = p.price * qty;
        return `
        <div class="cart-line" data-line="${id}">
          <div>
            <p class="cart-line-title">${escapeHtml(p.name)}</p>
            <p class="cart-line-meta">${qty} × ${formatMoney(p.price)} = ${formatMoney(line)}</p>
          </div>
          <button type="button" class="cart-line-remove" data-remove="${id}">Kaldır</button>
        </div>`;
      })
      .join("");

    els.cartItems.querySelectorAll("[data-remove]").forEach((b) => {
      b.addEventListener("click", () => {
        delete cart[b.getAttribute("data-remove")];
        saveCart(cart);
        renderCart();
      });
    });
  }

  els.cartTotal.textContent = formatMoney(sub);
}

function buildWhatsAppText() {
  const lines = ["Merhaba, Kale Biber siparişi vermek istiyorum:", ""];
  let sub = 0;
  for (const [id, qty] of Object.entries(cart)) {
    if (qty <= 0) continue;
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) continue;
    const line = p.price * qty;
    sub += line;
    lines.push(`• ${p.name} — ${qty} ${p.unit} × ${formatMoney(p.price)} = ${formatMoney(line)}`);
  }
  lines.push("", `Ara toplam: ${formatMoney(sub)}`);
  lines.push("", "Teslimat / adres bilgisi: ");
  return lines.join("\n");
}

function openWhatsApp() {
  const text = buildWhatsAppText();
  const phone = `${WHATSAPP_COUNTRY}${WHATSAPP_NUMBER}`.replace(/\D/g, "");
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

els.cartToggle.addEventListener("click", () => {
  const open = !els.cartPanel.classList.contains("is-open");
  setCartOpen(open);
});

els.cartClose.addEventListener("click", () => setCartOpen(false));
els.cartBackdrop.addEventListener("click", () => setCartOpen(false));

els.cartWhatsapp.addEventListener("click", () => {
  if (cartTotals().count === 0) return;
  openWhatsApp();
});

els.whatsappOrder.addEventListener("click", () => openWhatsApp());

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && els.cartPanel.classList.contains("is-open")) setCartOpen(false);
});

if (els.navToggle && els.navMenu) {
  els.navToggle.addEventListener("click", () => {
    const open = els.navMenu.classList.toggle("is-open");
    els.navToggle.setAttribute("aria-expanded", String(open));
  });
  els.navMenu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      els.navMenu.classList.remove("is-open");
      els.navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

if (els.contactForm) {
  els.contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(els.contactForm);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const message = String(fd.get("message") || "").trim();
    const subject = encodeURIComponent(`Kale Biber — ${name || "İletişim"}`);
    const body = encodeURIComponent(
      `Ad: ${name}\nE-posta: ${email}\n\n${message}\n\n---\nSepet özeti:\n${buildWhatsAppText()}`
    );
    window.location.href = `mailto:info@kalebiber.example?subject=${subject}&body=${body}`;
  });
}

if (els.year) {
  els.year.textContent = String(new Date().getFullYear());
}

renderProducts();
renderCart();
