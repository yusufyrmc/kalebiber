import { apiUrl } from "./api-base.js";
import { getMe, authHeaders, updateHeaderAccountLink, initAuth } from "./auth-client.js";

const STORAGE_KEY = "kale-biber-cart-v2";
const VISITOR_KEY = "kale-biber-visitor-v1";
const ORDER_EMAIL = "siparis@kalebiber.com";

let SETTINGS = {};
let PRODUCTS = [];
let REVIEWS = [];
let REVIEW_STATS = { count: 0, avg: 0 };
let cart = loadCart();
let activeCategory = "all";
let searchQuery = "";
let reviewFilterProduct = "";
let selectedRating = 5;
let currentUser = null;

const els = {
  announcementBar: document.getElementById("announcement-bar"),
  announcementText: document.getElementById("announcement-text"),
  siteBrandName: document.getElementById("site-brand-name"),
  siteLogoImg: document.getElementById("site-logo-img"),
  storeSignature: document.getElementById("store-signature"),
  aboutTitle: document.getElementById("about-title"),
  aboutContent: document.getElementById("about-content"),
  aboutGallery: document.getElementById("about-gallery"),
  heroEyebrow: document.getElementById("hero-eyebrow"),
  heroTitle: document.getElementById("hero-title"),
  heroTitleAccent: document.getElementById("hero-title-accent"),
  heroTagline: document.getElementById("hero-tagline"),
  heroTrust: document.getElementById("hero-trust"),
  heroVisual: document.getElementById("hero-visual"),
  heroImage: document.getElementById("hero-image"),
  footerBrand: document.getElementById("footer-brand"),
  footerAddress: document.getElementById("footer-address"),
  contactPhone: document.getElementById("contact-phone"),
  contactBlurb: document.getElementById("contact-blurb"),
  grid: document.getElementById("product-grid"),
  categoryFilters: document.getElementById("category-filters"),
  productSearch: document.getElementById("product-search"),
  cartToggle: document.getElementById("cart-toggle"),
  cartClose: document.getElementById("cart-close"),
  cartPanel: document.getElementById("cart-panel"),
  cartBackdrop: document.getElementById("cart-backdrop"),
  cartItems: document.getElementById("cart-items"),
  cartCount: document.getElementById("cart-count"),
  cartSubtotal: document.getElementById("cart-subtotal"),
  cartShippingHint: document.getElementById("cart-shipping-hint"),
  cartCheckout: document.getElementById("cart-checkout"),
  openCheckout: document.getElementById("open-checkout"),
  heroCheckout: document.getElementById("hero-checkout"),
  checkoutLayer: document.getElementById("checkout-layer"),
  checkoutBackdrop: document.getElementById("checkout-backdrop"),
  checkoutClose: document.getElementById("checkout-close"),
  checkoutForm: document.getElementById("checkout-form"),
  checkoutError: document.getElementById("checkout-error"),
  checkoutSubmit: document.getElementById("checkout-submit"),
  checkoutSuccess: document.getElementById("checkout-success"),
  checkoutOrderId: document.getElementById("checkout-order-id"),
  checkoutDone: document.getElementById("checkout-done"),
  checkoutSummary: document.getElementById("checkout-summary"),
  trackForm: document.getElementById("track-form"),
  trackId: document.getElementById("track-id"),
  trackResult: document.getElementById("track-result"),
  contactForm: document.getElementById("contact-form"),
  toastHost: document.getElementById("toast-host"),
  year: document.getElementById("year"),
  navToggle: document.querySelector(".nav-toggle"),
  navMenu: document.getElementById("nav-menu"),
  heroRating: document.getElementById("hero-rating"),
  reviewsSummary: document.getElementById("reviews-summary"),
  reviewsList: document.getElementById("reviews-list"),
  reviewsProductFilter: document.getElementById("reviews-product-filter"),
  reviewForm: document.getElementById("review-form"),
  reviewProduct: document.getElementById("review-product"),
  reviewAuthor: document.getElementById("review-author"),
  reviewText: document.getElementById("review-text"),
  reviewRating: document.getElementById("review-rating"),
  reviewError: document.getElementById("review-error"),
  reviewSuccess: document.getElementById("review-success"),
  starInput: document.getElementById("star-input"),
  productLayer: document.getElementById("product-layer"),
  productLayerBackdrop: document.getElementById("product-layer-backdrop"),
  productLayerClose: document.getElementById("product-layer-close"),
  productLayerBody: document.getElementById("product-layer-body"),
};

const STATUS_TR = {
  yeni: "Yeni sipariş",
  hazirlaniyor: "Hazırlanıyor",
  kargoda: "Kargoda",
  teslim_edildi: "Teslim edildi",
  iptal: "İptal",
};

const PAYMENT_TR = { kapida: "Kapıda ödeme", havale: "Havale/EFT", kart: "Kart" };

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

function saveCart() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

function formatMoney(n) {
  return `${Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function toast(msg) {
  if (!els.toastHost) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  els.toastHost.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function getVisitorId() {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = "v-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function analyticsPing() {
  fetch(apiUrl("/api/analytics/ping"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visitorId: getVisitorId(),
      path: window.location.pathname + (window.location.hash || ""),
    }),
  }).catch(() => {});
}

function renderStars(avg, count) {
  const r = Math.max(0, Math.min(5, Number(avg) || 0));
  const full = Math.floor(r);
  const half = r - full >= 0.5 ? 1 : 0;
  let html = "";
  for (let i = 1; i <= 5; i++) {
    let cls = "star";
    if (i <= full) cls += " star--full";
    else if (i === full + 1 && half) cls += " star--half";
    html += `<span class="${cls}" aria-hidden="true">★</span>`;
  }
  const label = count != null ? `<span class="star-count">(${count})</span>` : "";
  return `<span class="stars" title="${r.toFixed(1)} / 5">${html}${label}</span>`;
}

function setStarInput(rating) {
  selectedRating = rating;
  if (els.reviewRating) els.reviewRating.value = String(rating);
  els.starInput?.querySelectorAll("button").forEach((btn) => {
    const n = parseInt(btn.getAttribute("data-star"), 10);
    btn.classList.toggle("is-on", n <= rating);
  });
}

function calcShipping(sub) {
  const fee = Number(SETTINGS.shippingFee) || 0;
  const freeOver = Number(SETTINGS.freeShippingOver) || 0;
  if (freeOver > 0 && sub >= freeOver) return 0;
  return fee;
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
  return { sub, count, shipping: calcShipping(sub), total: sub + calcShipping(sub) };
}

function formatBrandHtml(name) {
  const n = String(name || "").trim();
  if (!n) return "";
  const m = n.match(/^(.+?)\s+(kale\s+bibercisi)$/i);
  if (m) return `${escapeHtml(m[1].trim())} <em>${escapeHtml(m[2])}</em>`;
  return escapeHtml(n);
}

async function fetchSettings() {
  const embedded = typeof window !== "undefined" ? window.__KALE_SETTINGS__ : null;
  if (embedded && typeof embedded === "object") {
    delete window.__KALE_SETTINGS__;
    return embedded;
  }
  const res = await fetch(apiUrl(`/api/settings?_=${Date.now()}`), { cache: "no-store" });
  if (!res.ok) throw new Error("settings");
  return res.json();
}

function renderAbout() {
  const about = SETTINGS.about || {};
  if (els.aboutTitle) els.aboutTitle.textContent = about.title || "Hakkımızda";
  if (els.aboutContent) {
    if (about.content && about.content.trim()) {
      els.aboutContent.innerHTML = `<p>${escapeHtml(about.content.trim())}</p>`;
    } else {
      els.aboutContent.innerHTML = `
        <p>Yarımca Kale Bibercisi olarak, Kocaeli'nin bereketli topraklarında geleneksel tarım anlayışıyla yetiştirdiğimiz %100 doğal, katkısız ve taze biber çeşitlerimizi tarladan sofranıza ulaştırıyoruz.</p>`;
    }
  }
}

function renderNavbar() {
  const nav = SETTINGS.navbar || {};
  if (els.siteLogoImg && nav.logoUrl) {
    els.siteLogoImg.src = nav.logoUrl;
    els.siteLogoImg.alt = SETTINGS.storeName || "Yarımca Kale Bibercisi";
  }
  if (els.heroEyebrow && nav.eyebrow) els.heroEyebrow.textContent = nav.eyebrow;
  if (els.heroTitle && nav.title) {
    const accent = nav.titleAccent || "";
    els.heroTitle.innerHTML = accent
      ? `${escapeHtml(nav.title)}<br /><span class="hero-accent" id="hero-title-accent">${escapeHtml(accent)}</span>`
      : escapeHtml(nav.title);
  }
  const lead = nav.heroLead || SETTINGS.tagline;
  if (els.heroTagline && lead) els.heroTagline.textContent = lead;
  const trust = nav.trustItems || [];
  if (els.heroTrust && trust.length) {
    els.heroTrust.innerHTML = trust.map((t) => `<span>${escapeHtml(t)}</span>`).join("");
    const ratingSpan = document.createElement("span");
    ratingSpan.id = "hero-rating";
    ratingSpan.className = "hero-rating";
    ratingSpan.hidden = true;
    els.heroTrust.appendChild(ratingSpan);
    els.heroRating = ratingSpan;
  }
  if (els.heroVisual && els.heroImage && nav.imageUrl) {
    els.heroImage.src = nav.imageUrl;
    els.heroImage.alt = nav.imageAlt || SETTINGS.storeName || "Ürün görseli";
    els.heroVisual.removeAttribute("hidden");
  } else if (els.heroVisual) {
    els.heroVisual.setAttribute("hidden", "");
  }
}

function applySettings() {
  if (SETTINGS.storeName) {
    if (els.siteBrandName) els.siteBrandName.innerHTML = formatBrandHtml(SETTINGS.storeName);
    if (els.footerBrand) els.footerBrand.textContent = SETTINGS.storeName;
    if (els.storeSignature) els.storeSignature.textContent = SETTINGS.storeName;
    document.title = `${SETTINGS.storeName} | Taze Biber`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", `${SETTINGS.storeName} — doğal, taze biber.`);
  }
  renderNavbar();
  if (els.footerAddress && SETTINGS.address) els.footerAddress.textContent = SETTINGS.address;
  if (els.contactPhone && SETTINGS.phone) {
    els.contactPhone.href = `tel:${SETTINGS.phone.replace(/\s/g, "")}`;
    els.contactPhone.textContent = `Ara: ${SETTINGS.phone}`;
  }
  if (SETTINGS.announcement && els.announcementText) {
    els.announcementText.textContent = SETTINGS.announcement;
    els.announcementBar?.removeAttribute("hidden");
  }
  renderAbout();
}

function getCategories() {
  const cats = new Set(PRODUCTS.map((p) => p.category || "genel"));
  return ["all", ...cats];
}

function renderFilters() {
  if (!els.categoryFilters) return;
  const cats = getCategories();
  const labels = { all: "Tümü", genel: "Genel", kurutulmus: "Kurutulmuş", taze: "Taze", aci: "Acı", tatli: "Tatlı" };
  els.categoryFilters.innerHTML = cats
    .map(
      (c) =>
        `<button type="button" class="filter-chip ${c === activeCategory ? "is-active" : ""}" data-cat="${escapeHtml(c)}">${escapeHtml(labels[c] || c)}</button>`
    )
    .join("");
  els.categoryFilters.querySelectorAll(".filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.getAttribute("data-cat");
      renderFilters();
      renderProducts();
    });
  });
}

function filteredProducts() {
  const q = searchQuery.toLowerCase();
  return PRODUCTS.filter((p) => {
    if (activeCategory !== "all" && p.category !== activeCategory) return false;
    if (q && !p.name.toLowerCase().includes(q) && !p.desc.toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderProducts() {
  if (!els.grid) return;
  const list = filteredProducts();
  if (list.length === 0) {
    els.grid.innerHTML = '<p class="prose">Aramanıza uygun ürün bulunamadı.</p>';
    return;
  }
  els.grid.innerHTML = list
    .map((p) => {
      const out = p.stock <= 0;
      const low = p.stock > 0 && p.stock <= 5;
      const img = p.imageUrl
        ? `<img class="product-img" src="${escapeHtml(p.imageUrl)}" alt="" loading="lazy" />`
        : "";
      const ratingHtml =
        p.reviewCount > 0
          ? `<div class="product-rating">${renderStars(p.ratingAvg, p.reviewCount)}</div>`
          : `<p class="product-rating product-rating--empty">Henüz yorum yok</p>`;
      return `
    <article class="product-card ${out ? "product-card--out" : ""} ${p.featured ? "product-card--featured" : ""}" data-id="${escapeHtml(p.id)}">
      <div class="product-visual product-visual--${escapeHtml(p.theme)} ${p.imageUrl ? "has-img" : ""}">
        ${p.badge ? `<span class="product-badge">${escapeHtml(p.badge)}</span>` : ""}
        ${img}
        <span class="product-emoji-fallback">${p.emoji}</span>
      </div>
      <div class="product-body">
        <h3>${escapeHtml(p.name)}</h3>
        ${ratingHtml}
        <p class="product-desc">${escapeHtml(p.desc)}</p>
        <p class="product-stock ${low ? "product-stock--low" : ""}">${out ? "Stokta yok" : low ? `Son ${p.stock} ${p.unit}` : `Stok: ${p.stock} ${p.unit}`}</p>
        <div class="product-meta">
          <span class="product-price">${formatMoney(p.price)} <small>/${escapeHtml(p.unit)}</small></span>
          <div class="qty-row">
            <button type="button" data-act="dec" aria-label="Azalt">−</button>
            <input type="number" min="1" max="${Math.min(99, p.stock || 1)}" value="1" ${out ? "disabled" : ""} />
            <button type="button" data-act="inc" aria-label="Arttır" ${out ? "disabled" : ""}>+</button>
          </div>
        </div>
        <div class="product-actions">
          <button type="button" class="btn btn-outline btn-sm" data-detail="${escapeHtml(p.id)}">Detay & yorumlar</button>
          <button type="button" class="btn btn-primary add-btn" data-add="${escapeHtml(p.id)}" ${out ? "disabled" : ""}>Sepete ekle</button>
        </div>
      </div>
    </article>`;
    })
    .join("");

  els.grid.querySelectorAll(".add-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".product-card");
      const id = btn.getAttribute("data-add");
      const p = PRODUCTS.find((x) => x.id === id);
      const input = card.querySelector("input");
      let qty = parseInt(input.value, 10) || 1;
      qty = Math.min(p.stock, 99, Math.max(1, qty));
      cart[id] = (cart[id] || 0) + qty;
      saveCart();
      renderCart();
      toast(`${p.name} sepete eklendi`);
      setCartOpen(true);
    });
  });

  els.grid.querySelectorAll("[data-detail]").forEach((btn) => {
    btn.addEventListener("click", () => openProductLayer(btn.getAttribute("data-detail")));
  });

  els.grid.querySelectorAll(".qty-row").forEach((row) => {
    const input = row.querySelector("input");
    row.querySelector('[data-act="dec"]')?.addEventListener("click", () => {
      input.value = String(Math.max(1, (parseInt(input.value, 10) || 1) - 1));
    });
    row.querySelector('[data-act="inc"]')?.addEventListener("click", () => {
      const max = parseInt(input.max, 10) || 99;
      input.value = String(Math.min(max, (parseInt(input.value, 10) || 1) + 1));
    });
  });
}

function renderCart() {
  const { sub, count, shipping, total } = cartTotals();
  const ids = Object.keys(cart).filter((id) => cart[id] > 0);

  if (count === 0) {
    els.cartItems.innerHTML = '<p class="cart-empty">Sepetiniz boş.</p>';
    els.cartCount.hidden = true;
  } else {
    els.cartCount.hidden = false;
    els.cartCount.textContent = String(count);
    els.cartItems.innerHTML = ids
      .map((id) => {
        const p = PRODUCTS.find((x) => x.id === id);
        const qty = cart[id];
        if (!p) return "";
        return `
        <div class="cart-line">
          <div>
            <p class="cart-line-title">${escapeHtml(p.name)}</p>
            <p class="cart-line-meta">${qty} × ${formatMoney(p.price)} = ${formatMoney(p.price * qty)}</p>
          </div>
          <button type="button" class="cart-line-remove" data-remove="${escapeHtml(id)}">Kaldır</button>
        </div>`;
      })
      .join("");
    els.cartItems.querySelectorAll("[data-remove]").forEach((b) => {
      b.addEventListener("click", () => {
        delete cart[b.getAttribute("data-remove")];
        saveCart();
        renderCart();
      });
    });
  }

  els.cartSubtotal.textContent = formatMoney(sub);
  if (els.cartShippingHint) {
    const freeOver = Number(SETTINGS.freeShippingOver) || 0;
    if (shipping === 0 && sub > 0) els.cartShippingHint.textContent = "Kargo ücretsiz";
    else if (freeOver > 0)
      els.cartShippingHint.textContent = `${formatMoney(freeOver - sub)} daha ekleyin, kargo bedava`;
    else els.cartShippingHint.textContent = `Kargo: ${formatMoney(shipping)} · Toplam: ${formatMoney(total)}`;
  }
}

function updateCheckoutSummary() {
  if (!els.checkoutSummary) return;
  const { sub, shipping, total } = cartTotals();
  els.checkoutSummary.innerHTML = `
    <dl>
      <dt>Ara toplam</dt><dd>${formatMoney(sub)}</dd>
      <dt>Kargo</dt><dd>${shipping === 0 ? "Ücretsiz" : formatMoney(shipping)}</dd>
      <dt><strong>Toplam</strong></dt><dd><strong>${formatMoney(total)}</strong></dd>
    </dl>`;
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
}

function prefillCheckoutFromUser(user) {
  if (!user) return;
  const set = (id, val, opts = {}) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (val) el.value = String(val);
    if (opts.readonly) {
      el.readOnly = true;
      el.setAttribute("aria-readonly", "true");
    } else {
      el.readOnly = false;
      el.removeAttribute("aria-readonly");
    }
  };
  set("checkout-name", user.name);
  set("checkout-email", user.email, { readonly: true });
  set("checkout-phone", user.phone);
  set("checkout-address", user.address);
  set("checkout-city", user.city);
}

function setCheckoutOpen(open) {
  els.checkoutLayer.setAttribute("aria-hidden", String(!open));
  document.body.classList.toggle("checkout-open", open);
  requestAnimationFrame(() => els.checkoutLayer.classList.toggle("is-open", open));
  if (open) {
    resetCheckoutUi();
    updateCheckoutSummary();
    prefillCheckoutFromUser(currentUser);
    document.getElementById("checkout-name")?.focus();
  }
}

function resetCheckoutUi() {
  els.checkoutForm?.removeAttribute("hidden");
  els.checkoutSuccess?.setAttribute("hidden", "");
  if (els.checkoutError) els.checkoutError.textContent = "";
  els.checkoutForm?.reset();
}

async function tryOpenCheckout() {
  if (cartTotals().count === 0) {
    toast("Sepetiniz boş");
    document.getElementById("urunler")?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (!currentUser) {
    currentUser = await getMe();
    updateHeaderAccountLink(currentUser);
  }
  if (!currentUser) {
    toast("Sipariş için giriş yapın veya kayıt olun");
    window.location.href = "/hesap.html?tab=giris&next=checkout";
    return;
  }
  setCartOpen(false);
  setCheckoutOpen(true);
}

function cartPayload() {
  return Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));
}

function sanitizeCart() {
  const valid = new Set(PRODUCTS.map((p) => p.id));
  for (const k of Object.keys(cart)) {
    if (!valid.has(k)) delete cart[k];
  }
  saveCart();
}

els.cartToggle?.addEventListener("click", () => setCartOpen(!els.cartPanel.classList.contains("is-open")));
els.cartClose?.addEventListener("click", () => setCartOpen(false));
els.cartBackdrop?.addEventListener("click", () => setCartOpen(false));
els.cartCheckout?.addEventListener("click", tryOpenCheckout);
els.openCheckout?.addEventListener("click", tryOpenCheckout);
els.heroCheckout?.addEventListener("click", () => {
  setCartOpen(true);
});
els.checkoutBackdrop?.addEventListener("click", () => setCheckoutOpen(false));
els.checkoutClose?.addEventListener("click", () => setCheckoutOpen(false));
els.checkoutDone?.addEventListener("click", () => setCheckoutOpen(false));

els.checkoutForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (els.checkoutError) els.checkoutError.textContent = "";
  const items = cartPayload();
  if (!items.length) {
    if (els.checkoutError) els.checkoutError.textContent = "Sepet boş";
    return;
  }
  const fd = new FormData(els.checkoutForm);
  const paymentMethod = fd.get("payment") || "kapida";
  const customer = {
    name: String(fd.get("name") || "").trim(),
    email: String(fd.get("email") || "").trim(),
    phone: String(fd.get("phone") || "").trim(),
    address: String(fd.get("address") || "").trim(),
    city: String(fd.get("city") || "").trim(),
  };
  const note = String(fd.get("note") || "").trim();
  els.checkoutSubmit.disabled = true;
  try {
    const res = await fetch(apiUrl("/api/orders"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ items, customer, note, paymentMethod }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Sipariş gönderilemedi");
    cart = {};
    saveCart();
    renderCart();
    await initProducts();
    els.checkoutForm.setAttribute("hidden", "");
    els.checkoutSuccess.removeAttribute("hidden");
    els.checkoutOrderId.textContent = data.orderId || "—";
    const trackLink = document.getElementById("checkout-track-link");
    if (trackLink && data.orderId) {
      trackLink.href = `/takip.html?id=${encodeURIComponent(data.orderId)}`;
    }
    toast("Siparişiniz kaydedildi");
  } catch (err) {
    if (els.checkoutError) els.checkoutError.textContent = err.message;
  } finally {
    els.checkoutSubmit.disabled = false;
  }
});

els.trackForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = els.trackId.value.trim();
  if (!id) return;
  els.trackResult.hidden = false;
  els.trackResult.innerHTML = "Sorgulanıyor…";
  try {
    const res = await fetch(apiUrl(`/api/orders/track?id=${encodeURIComponent(id)}`));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Bulunamadı");
    const items = data.items.map((i) => `<li>${escapeHtml(i.name)} × ${i.quantity} ${escapeHtml(i.unit)}</li>`).join("");
    els.trackResult.innerHTML = `
      <p><strong>${escapeHtml(data.id)}</strong> — ${escapeHtml(STATUS_TR[data.status] || data.status)}</p>
      <p class="fineprint">${new Date(data.createdAt).toLocaleString("tr-TR")}</p>
      ${data.trackingCode ? `<p>Kargo takip: <strong>${escapeHtml(data.trackingCode)}</strong></p>` : ""}
      <p>Toplam: <strong>${formatMoney(data.total)}</strong></p>
      <ul>${items}</ul>`;
  } catch (err) {
    els.trackResult.innerHTML = `<p class="checkout-error">${escapeHtml(err.message)}</p>`;
  }
});

els.productSearch?.addEventListener("input", () => {
  searchQuery = els.productSearch.value.trim();
  renderProducts();
});

els.contactForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(els.contactForm);
  const subject = encodeURIComponent(`İletişim — ${fd.get("name") || "Müşteri"}`);
  const body = encodeURIComponent(`Ad: ${fd.get("name")}\nE-posta: ${fd.get("email")}\n\n${fd.get("message")}`);
  window.location.href = `mailto:${SETTINGS.email || ORDER_EMAIL}?subject=${subject}&body=${body}`;
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (els.productLayer?.classList.contains("is-open")) setProductLayerOpen(false);
    else if (els.checkoutLayer?.classList.contains("is-open")) setCheckoutOpen(false);
    else if (els.cartPanel?.classList.contains("is-open")) setCartOpen(false);
  }
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
  document.addEventListener("click", (e) => {
    if (!els.navMenu.classList.contains("is-open")) return;
    if (e.target.closest(".nav--below") || e.target.closest(".nav-toggle")) return;
    els.navMenu.classList.remove("is-open");
    els.navToggle.setAttribute("aria-expanded", "false");
  });
}

if (els.year) els.year.textContent = String(new Date().getFullYear());

let selectedStarFilter = "all";
const helpfulLikesMap = new Map();

function updateReviewSummary() {
  const avg = REVIEW_STATS.avg || 0;
  const count = REVIEW_STATS.count || 0;

  if (els.reviewsSummary) {
    els.reviewsSummary.textContent = count > 0 
      ? `${count} onaylı değerlendirme · ortalama ${avg.toFixed(1)} / 5.0`
      : "Henüz onaylı yorum bulunmuyor. İlk değerlendirmeyi siz yapın!";
  }

  const scoreAvgEl = document.getElementById("review-score-avg");
  const scoreStarsEl = document.getElementById("review-score-stars");
  const scoreCountEl = document.getElementById("review-score-count");
  if (scoreAvgEl) scoreAvgEl.textContent = avg > 0 ? avg.toFixed(1) : "5.0";
  if (scoreStarsEl) scoreStarsEl.innerHTML = renderStars(avg > 0 ? avg : 5);
  if (scoreCountEl) scoreCountEl.textContent = count > 0 ? `${count} onaylı müşteri değerlendirmesi` : "Henüz değerlendirme yapılmadı";

  const heroRating = document.getElementById("hero-rating");
  if (heroRating && count > 0) {
    heroRating.hidden = false;
    heroRating.innerHTML = `${renderStars(avg, count)} müşteri puanı`;
  }

  // Calculate breakdown counts
  const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  REVIEWS.forEach((r) => {
    const rating = Math.round(Number(r.rating) || 5);
    if (starCounts[rating] !== undefined) starCounts[rating]++;
  });

  const totalReviews = REVIEWS.length || 1;
  [5, 4, 3, 2, 1].forEach((star) => {
    const row = document.querySelector(`#review-breakdown-list .breakdown-row[data-star="${star}"]`);
    if (row) {
      const c = starCounts[star] || 0;
      const pct = Math.round((c / totalReviews) * 100);
      const fill = row.querySelector(".bar-fill");
      const countEl = row.querySelector(".bar-count");
      if (fill) fill.style.width = `${pct}%`;
      if (countEl) countEl.textContent = String(c);
    }
  });
}

function fillReviewProductSelects() {
  const opts = PRODUCTS.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");
  if (els.reviewProduct) els.reviewProduct.innerHTML = opts;
  if (els.reviewsProductFilter) {
    els.reviewsProductFilter.innerHTML =
      `<option value="">Tüm Ürünler</option>` + PRODUCTS.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");
  }
}

function getInitials(name) {
  if (!name) return "M";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

function renderReviewsList() {
  if (!els.reviewsList) return;
  let list = REVIEWS;

  if (reviewFilterProduct) {
    list = list.filter((r) => r.productId === reviewFilterProduct);
  }

  if (selectedStarFilter !== "all") {
    const targetStar = Number(selectedStarFilter);
    list = list.filter((r) => Math.round(Number(r.rating)) === targetStar);
  }

  if (!list.length) {
    els.reviewsList.innerHTML = `
      <div class="reviews-empty-compact">
        <span>💬 Seçilen kriterlere uygun yorum henüz bulunmuyor. İlk değerlendirmeyi siz yazın!</span>
        <button type="button" class="btn btn-outline btn-sm open-review-modal-btn">✍️ Yorum Yazın</button>
      </div>`;
    return;
  }

  els.reviewsList.innerHTML = list
    .map((r, idx) => {
      const initials = getInitials(r.author);
      const reviewId = r.id || `rev-${idx}`;
      const likes = helpfulLikesMap.get(reviewId) || 0;
      const isLiked = helpfulLikesMap.has(reviewId);

      return `
    <article class="review-card">
      <header class="review-card-head">
        <div class="review-user-info">
          <div class="review-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
          <div>
            <div class="review-meta-author">
              <span>${escapeHtml(r.author)}</span>
              <span class="verified-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                Doğrulanmış Alıcı
              </span>
            </div>
            ${r.productName ? `<span class="review-product-tag">📦 ${escapeHtml(r.productName)}</span>` : ""}
          </div>
        </div>
        <div>${renderStars(r.rating)}</div>
      </header>
      <div class="review-card-body">
        <p>${escapeHtml(r.text)}</p>
      </div>
      <footer class="review-card-footer">
        <time>${new Date(r.createdAt || Date.now()).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</time>
        <button type="button" class="helpful-btn ${isLiked ? "is-active" : ""}" data-review-id="${escapeHtml(reviewId)}">
          <span>👍</span>
          <span>Faydalı ${likes > 0 ? `(${likes})` : ""}</span>
        </button>
      </footer>
    </article>`;
    })
    .join("");

  // Attach helpful likes handler
  els.reviewsList.querySelectorAll(".helpful-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-review-id");
      const current = helpfulLikesMap.get(id) || 0;
      if (helpfulLikesMap.has(id)) {
        helpfulLikesMap.delete(id);
      } else {
        helpfulLikesMap.set(id, current + 1);
      }
      renderReviewsList();
    });
  });
}

async function loadReviews() {
  try {
    const q = reviewFilterProduct ? `?productId=${encodeURIComponent(reviewFilterProduct)}` : "";
    const res = await fetch(apiUrl(`/api/reviews${q}`));
    if (!res.ok) return;
    const data = await res.json();
    REVIEWS = data.reviews || [];
    REVIEW_STATS = data.stats || { count: 0, avg: 0 };
    updateReviewSummary();
    renderReviewsList();
  } catch {
    /* ignore */
  }
}

function setProductLayerOpen(open) {
  if (!els.productLayer) return;
  els.productLayer.setAttribute("aria-hidden", String(!open));
  document.body.classList.toggle("product-layer-open", open);
  requestAnimationFrame(() => els.productLayer.classList.toggle("is-open", open));
}

async function openProductLayer(productId) {
  const p = PRODUCTS.find((x) => x.id === productId);
  if (!p || !els.productLayerBody) return;
  let productReviews = REVIEWS.filter((r) => r.productId === productId);
  if (!productReviews.length) {
    try {
      const res = await fetch(apiUrl(`/api/reviews?productId=${encodeURIComponent(productId)}`));
      const data = await res.json();
      productReviews = data.reviews || [];
    } catch {
      productReviews = [];
    }
  }
  const img = p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="" class="product-layer-img" />` : `<span class="product-layer-emoji">${p.emoji}</span>`;
  const reviewsHtml = productReviews.length
    ? productReviews
        .map(
          (r) => `
      <article class="review-card review-card--compact">
        <div class="review-card-head">${renderStars(r.rating)} <strong>${escapeHtml(r.author)}</strong></div>
        <p>${escapeHtml(r.text)}</p>
      </article>`
        )
        .join("")
    : "<p class=\"fineprint\">Bu ürün için henüz yorum yok.</p>";

  els.productLayerBody.innerHTML = `
    <div class="product-layer-grid">
      <div class="product-layer-visual product-visual--${escapeHtml(p.theme)}">${img}</div>
      <div>
        <h2 id="product-layer-title">${escapeHtml(p.name)}</h2>
        ${p.reviewCount > 0 ? renderStars(p.ratingAvg, p.reviewCount) : ""}
        <p class="product-desc">${escapeHtml(p.desc)}</p>
        <p class="product-price">${formatMoney(p.price)} <small>/${escapeHtml(p.unit)}</small></p>
        <p class="product-stock">${p.stock > 0 ? `Stok: ${p.stock}` : "Stokta yok"}</p>
        <button type="button" class="btn btn-primary" id="layer-add-cart" ${p.stock <= 0 ? "disabled" : ""}>Sepete ekle</button>
        <button type="button" class="btn btn-ghost btn-sm" id="layer-write-review">Yorum yaz</button>
      </div>
    </div>
    <h3>Bu ürünün yorumları</h3>
    <div class="reviews-list reviews-list--compact">${reviewsHtml}</div>`;

  document.getElementById("layer-add-cart")?.addEventListener("click", () => {
    if (p.stock <= 0) return;
    cart[p.id] = (cart[p.id] || 0) + 1;
    saveCart();
    renderCart();
    toast("Sepete eklendi");
    setProductLayerOpen(false);
    setCartOpen(true);
  });
  document.getElementById("layer-write-review")?.addEventListener("click", () => {
    setProductLayerOpen(false);
    if (els.reviewProduct) els.reviewProduct.value = p.id;
    setReviewModalOpen(true);
  });

  setProductLayerOpen(true);
}

function setReviewModalOpen(open) {
  const modal = document.getElementById("review-layer") || document.getElementById("review-modal");
  if (!modal) return;
  modal.setAttribute("aria-hidden", String(!open));
  document.body.classList.toggle("review-layer-open", open);
  requestAnimationFrame(() => modal.classList.toggle("is-open", open));
}

document.addEventListener("click", (e) => {
  const openBtn = e.target.closest("#open-review-modal, .open-review-modal-btn");
  if (openBtn) {
    e.preventDefault();
    setReviewModalOpen(true);
    return;
  }

  const closeBtn = e.target.closest("#review-layer-close, #review-modal-close, .review-modal-close");
  if (closeBtn) {
    e.preventDefault();
    setReviewModalOpen(false);
    return;
  }

  if (e.target.matches("#review-layer-backdrop, #review-modal-backdrop, .review-modal-backdrop")) {
    setReviewModalOpen(false);
    return;
  }
});

els.productLayerBackdrop?.addEventListener("click", () => setProductLayerOpen(false));
els.productLayerClose?.addEventListener("click", () => setProductLayerOpen(false));

// Star Filter Pills Click Handler
document.querySelectorAll("#reviews-star-filters .filter-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll("#reviews-star-filters .filter-pill").forEach((p) => p.classList.remove("is-active"));
    pill.classList.add("is-active");
    selectedStarFilter = pill.getAttribute("data-star-filter");
    renderReviewsList();
  });
});

// Interactive Star Input Hover & Click Handlers
els.starInput?.querySelectorAll("button").forEach((btn) => {
  const val = parseInt(btn.getAttribute("data-star"), 10);
  btn.addEventListener("click", () => setStarInput(val));
  btn.addEventListener("mouseenter", () => setStarInput(val));
});
els.starInput?.addEventListener("mouseleave", () => {
  const currentVal = parseInt(els.reviewRating?.value || "5", 10);
  setStarInput(currentVal);
});

els.reviewsProductFilter?.addEventListener("change", async () => {
  reviewFilterProduct = els.reviewsProductFilter.value;
  await loadReviews();
});

els.reviewForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (els.reviewError) els.reviewError.textContent = "";
  if (els.reviewSuccess) els.reviewSuccess.hidden = true;
  try {
    const res = await fetch(apiUrl("/api/reviews"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: els.reviewProduct.value,
        author: els.reviewAuthor.value.trim(),
        text: els.reviewText.value.trim(),
        rating: Number(els.reviewRating?.value || selectedRating),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Gönderilemedi");
    els.reviewForm.reset();
    setStarInput(5);
    if (els.reviewSuccess) {
      els.reviewSuccess.hidden = false;
      els.reviewSuccess.textContent = data.message || "Teşekkürler! Yorumunuz onay sonrası yayınlanacak.";
    }
    toast("Yorum gönderildi");
    setTimeout(() => setReviewModalOpen(false), 1600);
  } catch (err) {
    if (els.reviewError) els.reviewError.textContent = err.message;
  }
});

async function initProducts() {
  const res = await fetch(apiUrl("/api/products"));
  if (!res.ok) throw new Error("products");
  PRODUCTS = await res.json();
  sanitizeCart();
  renderFilters();
  renderProducts();
  renderCart();
}

async function init() {
  analyticsPing();
  setInterval(analyticsPing, 60000);
  await initAuth();

  try {
    SETTINGS = await fetchSettings();
    applySettings();
    currentUser = await getMe();
    updateHeaderAccountLink(currentUser);
    if (new URLSearchParams(window.location.search).get("checkout") === "1" && currentUser) {
      tryOpenCheckout();
    }
  } catch {
    if (els.grid) {
      els.grid.innerHTML =
        '<p class="prose">Mağaza sunucusu kapalı. Terminalde <code>npm start</code> çalıştırıp <a href="http://localhost:3000">localhost:3000</a> açın (Live Server değil).</p>';
    }
    renderCart();
    return;
  }

  try {
    const pRes = await fetch(apiUrl("/api/products"), { cache: "no-store" });
    if (!pRes.ok) throw new Error("products");
    PRODUCTS = await pRes.json();
    fillReviewProductSelects();
    sanitizeCart();
    renderFilters();
    renderProducts();
    renderCart();
    await loadReviews();
  } catch {
    if (els.grid) {
      els.grid.innerHTML = '<p class="prose">Ürünler yüklenemedi. Sunucunun çalıştığından emin olun.</p>';
    }
    renderCart();
  }
}

init();
