/** Aynı mantık api-base.js — modül kullanılmıyor (file:// ve tüm tarayıcılarda çalışsın) */
const STATIC_ONLY_PORTS = new Set(["5500", "5501", "5502", "5173", "4173", "8000"]);
function getApiBase() {
  if (typeof window !== "undefined" && window.__KALE_API_BASE__) {
    return String(window.__KALE_API_BASE__).replace(/\/$/, "");
  }
  const meta = document.querySelector('meta[name="kale-api-base"]');
  const fromMeta = meta?.getAttribute("content")?.trim();
  if (fromMeta) return fromMeta.replace(/\/$/, "");
  if (typeof window === "undefined") return "";
  if (window.location.protocol === "file:") return "http://127.0.0.1:3000";
  const host = window.location.hostname;
  const port = window.location.port || "";
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (!isLocal) return "";
  if (STATIC_ONLY_PORTS.has(port)) return "http://127.0.0.1:3000";
  return "";
}
function apiUrl(path) {
  const base = getApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

const KEY_STORAGE = "kale-biber-admin-key-v3";

const STATUS_LABELS = {
  yeni: "Yeni",
  hazirlaniyor: "Hazırlanıyor",
  kargoda: "Kargoda",
  teslim_edildi: "Teslim edildi",
  iptal: "İptal",
};

const PAYMENT_LABELS = {
  kapida: "Kapıda ödeme",
  havale: "Havale / EFT",
  kart: "Kart",
};

let pollTimer = null;
let ordersCache = [];

const $ = (id) => document.getElementById(id);

const els = {
  login: $("admin-login"),
  shell: $("admin-shell"),
  loginForm: $("login-form"),
  loginError: $("login-error"),
  loginSubmit: $("login-submit"),
  keyInput: $("admin-key-input"),
  logout: $("logout-admin"),
  navBtns: document.querySelectorAll(".admin-nav-btn"),
  autoRefresh: $("auto-refresh"),
  dashStatus: $("dash-status"),
  sRevenue: $("s-revenue"),
  sNew: $("s-new"),
  sOrders: $("s-orders"),
  sProducts: $("s-products"),
  sLow: $("s-low"),
  sActive: $("s-active"),
  sVisitors: $("s-visitors"),
  sPendingReviews: $("s-pending-reviews"),
  sRating: $("s-rating"),
  chartBars: $("chart-bars"),
  navBadgeReviews: $("nav-badge-reviews"),
  chartVisits: $("chart-visits"),
  analyticsStatus: $("analytics-status"),
  aActive: $("a-active"),
  aTodayVisitors: $("a-today-visitors"),
  aTodayViews: $("a-today-views"),
  aTotalSessions: $("a-total-sessions"),
  activeUsersList: $("active-users-list"),
  topPagesList: $("top-pages-list"),
  refreshAnalytics: $("refresh-analytics"),
  reviewsAdminStatus: $("reviews-admin-status"),
  reviewsTbody: $("reviews-tbody"),
  reviewFilterStatus: $("review-filter-status"),
  refreshReviews: $("refresh-reviews"),
  dashRecent: $("dash-recent"),
  navBadgeOrders: $("nav-badge-orders"),
  orderSearch: $("order-search"),
  orderFilterStatus: $("order-filter-status"),
  ordersStatus: $("orders-status"),
  ordersTbody: $("orders-tbody"),
  refreshOrders: $("refresh-orders"),
  exportCsv: $("export-csv"),
  productsStatus: $("products-status"),
  productsTbody: $("products-tbody"),
  productNew: $("product-new"),
  settingsForm: $("settings-form"),
  settingsError: $("settings-error"),
  orderModal: $("order-modal"),
  modalOrderTitle: $("modal-order-title"),
  modalOrderBody: $("modal-order-body"),
  productModal: $("product-modal"),
  productModalTitle: $("product-modal-title"),
  productForm: $("product-form"),
  pfOriginalId: $("pf-original-id"),
  pfId: $("pf-id"),
  pfName: $("pf-name"),
  pfDesc: $("pf-desc"),
  pfPrice: $("pf-price"),
  pfUnit: $("pf-unit"),
  pfStock: $("pf-stock"),
  pfCategory: $("pf-category"),
  pfImageUrl: $("pf-imageUrl"),
  pfEmoji: $("pf-emoji"),
  pfTheme: $("pf-theme"),
  pfBadge: $("pf-badge"),
  pfActive: $("pf-active"),
  pfFeatured: $("pf-featured"),
  productFormError: $("product-form-error"),
  productDelete: $("product-delete"),
};

const FINANCE_CAT_LABELS = {
  siparis: "Sipariş",
  urun_satis: "Ürün satışı",
  diger_gelir: "Diğer gelir",
  malzeme: "Malzeme",
  kargo: "Kargo",
  personel: "Personel",
  kira: "Kira",
  vergi: "Vergi",
  pazarlama: "Pazarlama",
  diger_gider: "Diğer gider",
};

let financeCategories = { income: [], expense: [] };

const views = {
  dashboard: $("view-dashboard"),
  analytics: $("view-analytics"),
  orders: $("view-orders"),
  reviews: $("view-reviews"),
  products: $("view-products"),
  navbar: $("view-navbar"),
  about: $("view-about"),
  finance: $("view-finance"),
  settings: $("view-settings"),
};

function getKey() {
  return sessionStorage.getItem(KEY_STORAGE) || "";
}

function setKey(k) {
  const v = k ? String(k).trim() : "";
  if (v) sessionStorage.setItem(KEY_STORAGE, v);
  else sessionStorage.removeItem(KEY_STORAGE);
}

function formatMoney(n) {
  return `${Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function mediaSrc(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
    return apiUrl(url) || url;
  }
  return url;
}

function setMediaPreview(previewEl, url) {
  if (!previewEl) return;
  if (url) {
    previewEl.innerHTML = `<img src="${escapeHtml(mediaSrc(url))}" alt="" loading="lazy" />`;
  } else {
    previewEl.innerHTML = '<span class="fineprint">Henüz görsel yok</span>';
  }
}

async function uploadImageFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  let res;
  try {
    res = await fetch(apiUrl("/api/admin/upload"), {
      method: "POST",
      headers: { "X-Admin-Key": getKey().trim() },
      body: fd,
    });
  } catch {
    throw new Error("Sunucuya bağlanılamadı");
  }
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!res.ok) throw new Error(data.error || "Yükleme başarısız");
  return data.url;
}

function bindMediaUpload(fileInput, hiddenInput, previewEl, statusEl) {
  if (!fileInput || !hiddenInput) return;
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (statusEl) statusEl.textContent = "Yükleniyor…";
    fileInput.disabled = true;
    try {
      const url = await uploadImageFile(file);
      hiddenInput.value = url;
      setMediaPreview(previewEl, url);
      if (statusEl) statusEl.textContent = "Görsel yüklendi.";
    } catch (e) {
      if (statusEl) statusEl.textContent = e.message || "Yüklenemedi";
    } finally {
      fileInput.disabled = false;
      fileInput.value = "";
    }
  });
}

function bindMediaUploadRow(row) {
  bindMediaUpload(
    row.querySelector(".media-upload-file"),
    row.querySelector(".media-upload-url"),
    row.querySelector(".media-upload-preview"),
    row.querySelector(".media-upload-status")
  );
}

async function api(reqPath, opts = {}) {
  const key = getKey().trim();
  let res;
  try {
    res = await fetch(apiUrl(reqPath), {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": key,
        ...opts.headers,
      },
    });
  } catch {
    throw new Error(
      "API sunucusuna ulaşılamıyor. `npm start` çalışıyor olmalı; paneli http://localhost:3000/admin adresinden açın."
    );
  }
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || "Yanıt okunamadı" };
  }
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Şifre yanlış. .env içindeki ADMIN_KEY değerini girin.");
    }
    throw new Error(data.error || res.statusText);
  }
  return data;
}

function showShell(show) {
  els.login.hidden = show;
  els.shell.hidden = !show;
}

function setView(name) {
  Object.entries(views).forEach(([key, el]) => {
    if (el) el.hidden = key !== name;
  });
  els.navBtns.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === name);
  });
  if (name === "orders") loadOrders();
  if (name === "products") loadProducts();
  if (name === "settings") loadSettings();
  if (name === "navbar") loadNavbar();
  if (name === "about") loadAbout();
  if (name === "finance") loadFinance();
  if (name === "dashboard") loadDashboard();
  if (name === "analytics") loadAnalytics();
  if (name === "reviews") loadAdminReviews();
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPollIfEnabled() {
  stopPoll();
  if (!els.autoRefresh?.checked) return;
  pollTimer = setInterval(() => {
    loadDashboard({ quiet: true }).catch(() => {});
    if (!views.orders.hidden) loadOrders({ quiet: true }).catch(() => {});
    if (!views.analytics.hidden) loadAnalytics().catch(() => {});
  }, 30000);
}

function updateNavBadge(n) {
  if (!els.navBadgeOrders) return;
  if (n > 0) {
    els.navBadgeOrders.hidden = false;
    els.navBadgeOrders.textContent = String(n);
  } else {
    els.navBadgeOrders.hidden = true;
    els.navBadgeOrders.textContent = "";
  }
}

function updateReviewsBadge(n) {
  if (!els.navBadgeReviews) return;
  if (n > 0) {
    els.navBadgeReviews.hidden = false;
    els.navBadgeReviews.textContent = String(n);
  } else {
    els.navBadgeReviews.hidden = true;
    els.navBadgeReviews.textContent = "";
  }
}

function renderVisitsChart(chartVisits7) {
  if (!els.chartVisits) return;
  const data = chartVisits7 || [];
  const max = Math.max(1, ...data.map((d) => d.uniqueVisitors));
  els.chartVisits.innerHTML = data
    .map((d) => {
      const barH = Math.max(8, Math.round(((d.uniqueVisitors || 0) / max) * 110));
      const label = d.date.slice(5).replace("-", "/");
      return `<div class="chart-bar-wrap" title="${d.pageViews || 0} görüntüleme">
        <div class="chart-bar chart-bar--blue" style="height:${barH}px"></div>
        <span class="chart-bar-label">${label}</span>
      </div>`;
    })
    .join("");
}

function renderStarsAdmin(rating) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function renderChart(chartLast7) {
  if (!els.chartBars) return;
  const data = chartLast7 || [];
  const max = Math.max(1, ...data.map((d) => d.count));
  els.chartBars.innerHTML = data
    .map((d) => {
      const barH = Math.max(8, Math.round((d.count / max) * 110));
      const label = d.date.slice(5).replace("-", "/");
      return `<div class="chart-bar-wrap" title="${d.count} sipariş">
        <div class="chart-bar" style="height:${barH}px"></div>
        <span class="chart-bar-label">${label}</span>
      </div>`;
    })
    .join("");
}

function renderRecent(orders) {
  if (!els.dashRecent) return;
  if (!orders.length) {
    els.dashRecent.innerHTML = '<p class="prose">Henüz sipariş yok.</p>';
    return;
  }
  els.dashRecent.innerHTML = orders
    .slice(0, 8)
    .map(
      (o) => `
    <div class="recent-order-row ${o.status === "yeni" ? "recent-order-row--new" : ""}">
      <div>
        <strong>${escapeHtml(o.id)}</strong>
        <span class="fineprint">${formatDate(o.createdAt)} · ${escapeHtml(STATUS_LABELS[o.status] || o.status)}</span>
      </div>
      <div class="recent-order-meta">
        <span>${escapeHtml(o.customer?.name || "")}</span>
        <strong>${formatMoney(o.total ?? o.subtotal)}</strong>
      </div>
    </div>`
    )
    .join("");
}

async function loadDashboard(opts = {}) {
  if (!opts.quiet && els.dashStatus) els.dashStatus.textContent = "Yükleniyor…";
  try {
    const s = await api("/api/admin/summary");
    if (els.sRevenue) els.sRevenue.textContent = formatMoney(s.revenue).replace(" ₺", "");
    if (els.sNew) els.sNew.textContent = String(s.newOrders);
    if (els.sOrders) els.sOrders.textContent = String(s.orderCount);
    if (els.sProducts) els.sProducts.textContent = String(s.productCount);
    if (els.sLow) els.sLow.textContent = String(s.lowStock);
    if (els.sActive) els.sActive.textContent = String(s.activeNow ?? 0);
    if (els.sVisitors) els.sVisitors.textContent = String(s.todayUniqueVisitors ?? 0);
    if (els.sPendingReviews) els.sPendingReviews.textContent = String(s.pendingReviews ?? 0);
    if (els.sRating) els.sRating.textContent = s.reviewCount > 0 ? String(s.reviewAvg) : "—";
    updateNavBadge(s.newOrders);
    updateReviewsBadge(s.pendingReviews ?? 0);
    renderChart(s.chartLast7);
    renderRecent(s.recentOrders || []);
    if (!opts.quiet && els.dashStatus) els.dashStatus.textContent = "Güncel";
  } catch (e) {
    if (!opts.quiet && els.dashStatus) els.dashStatus.textContent = e.message || "Özet alınamadı";
    throw e;
  }
}

function orderTotal(o) {
  return Number(o.total) || Number(o.subtotal) || 0;
}

function buildOrdersQuery() {
  const status = els.orderFilterStatus?.value || "all";
  const q = els.orderSearch?.value.trim() || "";
  const params = new URLSearchParams();
  if (status && status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  const qs = params.toString();
  return `/api/admin/orders${qs ? `?${qs}` : ""}`;
}

function statusBadgeClass(status) {
  return `badge-status badge-status--${status}`;
}

function renderOrdersTable(orders) {
  if (!els.ordersTbody) return;
  if (!orders.length) {
    els.ordersTbody.innerHTML =
      '<tr><td colspan="6" class="table-empty">Henüz sipariş yok. Müşteriler siteden sipariş verince burada görünür.</td></tr>';
    return;
  }
  els.ordersTbody.innerHTML = orders
    .map(
      (o) => `
    <tr class="${o.status === "yeni" ? "row-new" : ""}">
      <td><code>${escapeHtml(o.id)}</code></td>
      <td class="fineprint">${formatDate(o.createdAt)}</td>
      <td>${escapeHtml(o.customer?.name || "")}<br><span class="fineprint">${escapeHtml(o.customer?.phone || "")}</span></td>
      <td><strong>${formatMoney(orderTotal(o))}</strong></td>
      <td><span class="${statusBadgeClass(o.status)}">${escapeHtml(STATUS_LABELS[o.status] || o.status)}</span></td>
      <td><button type="button" class="btn btn-outline btn-sm" data-open-order="${escapeHtml(o.id)}">Detay</button></td>
    </tr>`
    )
    .join("");
  els.ordersTbody.querySelectorAll("[data-open-order]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-open-order");
      const o = ordersCache.find((x) => x.id === id);
      if (o) openOrderModal(o);
    });
  });
}

async function loadAnalytics() {
  if (els.analyticsStatus) els.analyticsStatus.textContent = "Yükleniyor…";
  try {
    const a = await api("/api/admin/analytics");
    if (els.aActive) els.aActive.textContent = String(a.activeNow);
    if (els.aTodayVisitors) els.aTodayVisitors.textContent = String(a.todayUniqueVisitors);
    if (els.aTodayViews) els.aTodayViews.textContent = String(a.todayPageViews);
    if (els.aTotalSessions) els.aTotalSessions.textContent = String(a.totalSessions);
    renderVisitsChart(a.chartVisits7);
    if (els.activeUsersList) {
      const users = a.activeUsers || [];
      els.activeUsersList.innerHTML = users.length
        ? users
            .map(
              (u) => `
          <div class="recent-order-row">
            <div><strong>${escapeHtml(u.id)}</strong><span class="fineprint">${escapeHtml(u.lastPath)}</span></div>
            <span class="fineprint">${formatDate(u.lastSeen)} · ${u.pageViews} sayfa</span>
          </div>`
            )
            .join("")
        : '<p class="prose">Şu an aktif ziyaretçi yok.</p>';
    }
    if (els.topPagesList) {
      const pages = a.topPages || [];
      els.topPagesList.innerHTML = pages.length
        ? `<ul class="top-pages">${pages.map((p) => `<li><span>${escapeHtml(p.path)}</span><strong>${p.count}</strong></li>`).join("")}</ul>`
        : '<p class="prose">Henüz veri yok.</p>';
    }
    if (els.analyticsStatus) els.analyticsStatus.textContent = "Güncel";
  } catch (e) {
    if (els.analyticsStatus) els.analyticsStatus.textContent = e.message || "Yüklenemedi";
  }
}

async function loadAdminReviews() {
  if (els.reviewsAdminStatus) els.reviewsAdminStatus.textContent = "Yükleniyor…";
  try {
    const status = els.reviewFilterStatus?.value || "all";
    const list = await api(`/api/admin/reviews?status=${encodeURIComponent(status)}`);
    if (!list.length) {
      els.reviewsTbody.innerHTML =
        '<tr><td colspan="7" class="table-empty">Yorum bulunamadı.</td></tr>';
    } else {
      els.reviewsTbody.innerHTML = list
        .map((r) => {
          const st = r.approved
            ? '<span class="badge-status badge-status--teslim_edildi">Onaylı</span>'
            : '<span class="badge-status badge-status--yeni">Bekliyor</span>';
          return `
        <tr>
          <td class="fineprint">${formatDate(r.createdAt)}</td>
          <td>${escapeHtml(r.productName)}</td>
          <td>${escapeHtml(r.author)}</td>
          <td title="${r.rating}/5">${renderStarsAdmin(r.rating)}</td>
          <td class="review-text-cell">${escapeHtml(r.text)}</td>
          <td>${st}</td>
          <td class="review-actions">
            ${!r.approved ? `<button type="button" class="btn btn-primary btn-sm" data-approve="${escapeHtml(r.id)}">Onayla</button>` : ""}
            ${r.approved ? `<button type="button" class="btn btn-outline btn-sm" data-reject="${escapeHtml(r.id)}">Gizle</button>` : ""}
            <button type="button" class="btn btn-ghost btn-sm" data-del-review="${escapeHtml(r.id)}">Sil</button>
          </td>
        </tr>`;
        })
        .join("");
      els.reviewsTbody.querySelectorAll("[data-approve]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          await api(`/api/admin/reviews/${encodeURIComponent(btn.getAttribute("data-approve"))}`, {
            method: "PATCH",
            body: JSON.stringify({ approved: true }),
          });
          await loadAdminReviews();
          await loadDashboard({ quiet: true });
        });
      });
      els.reviewsTbody.querySelectorAll("[data-reject]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          await api(`/api/admin/reviews/${encodeURIComponent(btn.getAttribute("data-reject"))}`, {
            method: "PATCH",
            body: JSON.stringify({ approved: false }),
          });
          await loadAdminReviews();
        });
      });
      els.reviewsTbody.querySelectorAll("[data-del-review]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("Yorumu silmek istediğinize emin misiniz?")) return;
          await api(`/api/admin/reviews/${encodeURIComponent(btn.getAttribute("data-del-review"))}`, {
            method: "DELETE",
          });
          await loadAdminReviews();
          await loadDashboard({ quiet: true });
        });
      });
    }
    const s = await api("/api/admin/summary");
    updateReviewsBadge(s.pendingReviews ?? 0);
    if (els.reviewsAdminStatus) els.reviewsAdminStatus.textContent = `${list.length} yorum`;
  } catch (e) {
    if (els.reviewsAdminStatus) els.reviewsAdminStatus.textContent = e.message || "Yüklenemedi";
  }
}

async function loadOrders(opts = {}) {
  if (!opts.quiet && els.ordersStatus) els.ordersStatus.textContent = "Yükleniyor…";
  try {
    ordersCache = await api(buildOrdersQuery());
    renderOrdersTable(ordersCache);
    if (!opts.quiet && els.ordersStatus) {
      els.ordersStatus.textContent = ordersCache.length ? `${ordersCache.length} sipariş` : "Sipariş yok";
    }
    const s = await api("/api/admin/summary");
    updateNavBadge(s.newOrders);
  } catch (e) {
    if (!opts.quiet && els.ordersStatus) els.ordersStatus.textContent = e.message || "Yüklenemedi";
    if (e.message?.includes("ADMIN_KEY") || e.message?.includes("Şifre")) {
      setKey("");
      showShell(false);
      if (els.loginError) els.loginError.textContent = "Oturum geçersiz.";
    }
  }
}

function openModal(layer) {
  if (!layer) return;
  layer.classList.add("is-open");
  layer.setAttribute("aria-hidden", "false");
}

function closeModal(layer) {
  if (!layer) return;
  layer.classList.remove("is-open");
  layer.setAttribute("aria-hidden", "true");
}

function openOrderModal(o) {
  const items = (o.items || [])
    .map(
      (l) =>
        `<li>${escapeHtml(l.name)} — ${l.quantity} ${escapeHtml(l.unit)} × ${formatMoney(l.unitPrice)} = <strong>${formatMoney(l.lineTotal)}</strong></li>`
    )
    .join("");
  const history = (o.statusHistory || [])
    .map((h) => `<li>${formatDate(h.at)} → ${escapeHtml(STATUS_LABELS[h.status] || h.status)}</li>`)
    .join("");
  const statusOpts = Object.entries(STATUS_LABELS)
    .map(([val, label]) => `<option value="${val}" ${o.status === val ? "selected" : ""}>${label}</option>`)
    .join("");

  els.modalOrderTitle.textContent = `Sipariş ${o.id}`;
  els.modalOrderBody.innerHTML = `
    <div class="order-detail">
      <p class="fineprint">${formatDate(o.createdAt)} · ${escapeHtml(PAYMENT_LABELS[o.paymentMethod] || o.paymentMethod || "—")}</p>
      <div class="order-detail-grid">
        <div><strong>Müşteri</strong><p>${escapeHtml(o.customer.name)}</p>
          <p class="fineprint">${escapeHtml(o.customer.phone)} · ${escapeHtml(o.customer.email)}</p>
          <p class="fineprint">${escapeHtml(o.customer.address)}${o.customer.city ? `, ${escapeHtml(o.customer.city)}` : ""}</p>
        </div>
        <div><strong>Özet</strong>
          <p>Ara toplam: ${formatMoney(o.subtotal)}</p>
          <p>Kargo: ${formatMoney(o.shippingFee ?? 0)}</p>
          <p><strong>Toplam: ${formatMoney(orderTotal(o))}</strong></p>
        </div>
      </div>
      ${o.note ? `<p class="order-note"><em>Müşteri notu:</em> ${escapeHtml(o.note)}</p>` : ""}
      <ul class="order-items">${items}</ul>
      ${history ? `<details><summary>Durum geçmişi</summary><ul>${history}</ul></details>` : ""}
      <form id="order-patch-form" class="order-patch-form">
        <label>Durum<select name="status">${statusOpts}</select></label>
        <label>Kargo takip no<input type="text" name="trackingCode" value="${escapeHtml(o.trackingCode || "")}" /></label>
        <label>Yönetici notu<textarea name="adminNote" rows="2">${escapeHtml(o.adminNote || "")}</textarea></label>
        <div class="product-form-actions">
          <button type="submit" class="btn btn-primary">Kaydet</button>
          <button type="button" class="btn btn-ghost" id="order-delete-btn">Siparişi sil</button>
        </div>
      </form>
      <p class="checkout-error" id="order-modal-error"></p>
    </div>`;

  openModal(els.orderModal);

  const form = document.getElementById("order-patch-form");
  const errEl = document.getElementById("order-modal-error");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    errEl.textContent = "";
    const fd = new FormData(form);
    try {
      await api(`/api/admin/orders/${encodeURIComponent(o.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: fd.get("status"),
          trackingCode: fd.get("trackingCode"),
          adminNote: fd.get("adminNote"),
        }),
      });
      closeModal(els.orderModal);
      await loadOrders();
      await loadDashboard({ quiet: true });
    } catch (err) {
      errEl.textContent = err.message || "Kaydedilemedi";
    }
  });

  document.getElementById("order-delete-btn")?.addEventListener("click", async () => {
    if (!confirm(`“${o.id}” siparişini silmek istediğinize emin misiniz?`)) return;
    try {
      await api(`/api/admin/orders/${encodeURIComponent(o.id)}`, { method: "DELETE" });
      closeModal(els.orderModal);
      await loadOrders();
      await loadDashboard({ quiet: true });
    } catch (err) {
      errEl.textContent = err.message || "Silinemedi";
    }
  });
}

function openProductModal(product) {
  els.productFormError.textContent = "";
  if (product) {
    els.productModalTitle.textContent = "Ürünü düzenle";
    els.pfOriginalId.value = product.id;
    els.pfId.value = product.id;
    els.pfId.readOnly = true;
    els.pfName.value = product.name;
    els.pfDesc.value = product.desc || "";
    els.pfPrice.value = String(product.price);
    els.pfUnit.value = product.unit || "kg";
    els.pfStock.value = String(product.stock ?? 99);
    els.pfCategory.value = product.category || "";
    els.pfImageUrl.value = product.imageUrl || "";
    setMediaPreview($("pf-image-preview"), product.imageUrl || "");
    els.pfEmoji.value = product.emoji || "";
    els.pfTheme.value = product.theme || "sweet";
    els.pfBadge.value = product.badge || "";
    els.pfActive.checked = product.active !== false;
    els.pfFeatured.checked = !!product.featured;
    els.productDelete.hidden = false;
  } else {
    els.productModalTitle.textContent = "Yeni ürün";
    els.pfOriginalId.value = "";
    els.productForm.reset();
    els.pfId.readOnly = false;
    els.pfTheme.value = "sweet";
    els.pfUnit.value = "kg";
    els.pfStock.value = "99";
    els.pfActive.checked = true;
    els.pfFeatured.checked = false;
    els.productDelete.hidden = true;
    setMediaPreview($("pf-image-preview"), "");
  }
  openModal(els.productModal);
  els.pfName.focus();
}

async function loadProducts() {
  if (els.productsStatus) els.productsStatus.textContent = "Yükleniyor…";
  try {
    const products = await api("/api/admin/products");
    if (!products.length) {
      els.productsTbody.innerHTML =
        '<tr><td colspan="6" class="table-empty">Ürün yok — «Yeni ürün» ile ekleyin.</td></tr>';
    } else {
      els.productsTbody.innerHTML = products
        .map((p) => {
          const thumb = p.imageUrl
            ? `<img src="${escapeHtml(p.imageUrl)}" alt="" class="product-thumb" loading="lazy" />`
            : `<span class="product-thumb-emoji">${p.emoji || "🫑"}</span>`;
          const st = p.active
            ? p.stock <= 5
              ? '<span class="badge-status badge-status--hazirlaniyor">Düşük stok</span>'
              : '<span class="badge-status badge-status--teslim_edildi">Aktif</span>'
            : '<span class="badge-status badge-status--iptal">Pasif</span>';
          return `
        <tr>
          <td>${thumb}</td>
          <td><strong>${escapeHtml(p.name)}</strong><br><span class="fineprint">${escapeHtml(p.id)}${p.featured ? " · öne çıkan" : ""}</span></td>
          <td>${formatMoney(p.price)}/${escapeHtml(p.unit)}</td>
          <td>${p.stock}</td>
          <td>${st}</td>
          <td>
            <button type="button" class="btn btn-outline btn-sm" data-edit-p="${escapeHtml(p.id)}">Düzenle</button>
          </td>
        </tr>`;
        })
        .join("");
      els.productsTbody.querySelectorAll("[data-edit-p]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const list = await api("/api/admin/products");
          const p = list.find((x) => x.id === btn.getAttribute("data-edit-p"));
          if (p) openProductModal(p);
        });
      });
    }
    if (els.productsStatus) els.productsStatus.textContent = `${products.length} ürün`;
  } catch (e) {
    if (els.productsStatus) els.productsStatus.textContent = e.message || "Yüklenemedi";
  }
}

function aboutPhotoRowHtml(photo = {}, index = 0) {
  const url = photo.url || "";
  const preview = url
    ? `<img src="${escapeHtml(mediaSrc(url))}" alt="" loading="lazy" />`
    : '<span class="fineprint">Dosya seçin</span>';
  return `
    <div class="about-photo-row media-upload-row" data-index="${index}">
      <input type="hidden" class="media-upload-url about-photo-url" value="${escapeHtml(url)}" />
      <div class="media-upload-preview about-photo-preview">${preview}</div>
      <label class="media-upload-btn btn btn-outline btn-sm">
        Dosya seç
        <input type="file" class="media-upload-file" accept="image/jpeg,image/png,image/webp,image/gif" hidden />
      </label>
      <p class="fineprint media-upload-status"></p>
      <label>Açıklama<input type="text" class="about-photo-caption" value="${escapeHtml(photo.caption || "")}" placeholder="Fotoğraf alt yazısı" /></label>
      <button type="button" class="btn btn-ghost btn-sm about-photo-remove">Kaldır</button>
    </div>`;
}

function renderAboutPhotosAdmin(photos = []) {
  const list = $("about-photos-list");
  if (!list) return;
  if (!photos.length) {
    list.innerHTML = '<p class="fineprint">Henüz fotoğraf yok. «+ Fotoğraf ekle» ile dosya yükleyin.</p>';
    return;
  }
  list.innerHTML = photos.map((p, i) => aboutPhotoRowHtml(p, i)).join("");
  list.querySelectorAll(".about-photo-row").forEach(bindMediaUploadRow);
  list.querySelectorAll(".about-photo-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.closest(".about-photo-row")?.remove();
      if (!list.querySelector(".about-photo-row")) {
        list.innerHTML = '<p class="fineprint">Henüz fotoğraf yok.</p>';
      }
    });
  });
}

let cachedAboutPhotos = [];

function collectAboutPhotos() {
  const rows = document.querySelectorAll(".about-photo-row");
  const photos = [];
  rows.forEach((row) => {
    const url = row.querySelector(".media-upload-url, .about-photo-url")?.value.trim();
    const caption = row.querySelector(".about-photo-caption")?.value.trim();
    if (url) photos.push({ url, caption });
  });
  if (photos.length) return photos;
  if (rows.length === 0 && cachedAboutPhotos.length) return cachedAboutPhotos;
  return photos;
}

async function loadSettings() {
  try {
    const s = await api("/api/admin/settings");
    $("set-storeName").value = s.storeName || "";
    $("set-tagline").value = s.tagline || "";
    $("set-phone").value = s.phone || "";
    $("set-email").value = s.email || "";
    $("set-address").value = s.address || "";
    $("set-announcement").value = s.announcement || "";
    $("set-shippingFee").value = s.shippingFee ?? 49;
    $("set-freeShippingOver").value = s.freeShippingOver ?? 500;
    $("set-whatsapp").value = s.whatsapp || "";
    if (els.settingsError) els.settingsError.textContent = "";
  } catch (e) {
    if (els.settingsError) els.settingsError.textContent = e.message || "Ayarlar okunamadı";
  }
}

async function loadNavbar() {
  try {
    const s = await api("/api/admin/settings");
    const n = s.navbar || {};
    $("nav-logoUrl").value = n.logoUrl || "/images/logo-yuvarlak.png";
    setMediaPreview($("nav-logo-preview"), n.logoUrl || "/images/logo-yuvarlak.png");
    $("nav-eyebrow").value = n.eyebrow || "";
    $("nav-title").value = n.title || "";
    $("nav-titleAccent").value = n.titleAccent || "";
    $("nav-heroLead").value = n.heroLead || "";
    $("nav-imageUrl").value = n.imageUrl || "";
    setMediaPreview($("nav-image-preview"), n.imageUrl || "");
    $("nav-imageAlt").value = n.imageAlt || "";
    $("nav-trustItems").value = (n.trustItems || []).join("\n");
    const err = $("navbar-error");
    if (err) err.textContent = "";
  } catch (e) {
    const err = $("navbar-error");
    if (err) err.textContent = e.message || "Yüklenemedi";
  }
}

async function loadAbout() {
  try {
    const s = await api("/api/admin/settings");
    $("set-about-title").value = s.about?.title || "Hakkımızda";
    $("set-about-content").value = s.about?.content || "";
    cachedAboutPhotos = Array.isArray(s.about?.photos) ? s.about.photos : [];
    renderAboutPhotosAdmin(cachedAboutPhotos);
    const err = $("about-error");
    if (err) err.textContent = "";
  } catch (e) {
    const err = $("about-error");
    if (err) err.textContent = e.message || "Yüklenemedi";
  }
}

function fillFinanceCategories(type) {
  const sel = $("finance-category");
  if (!sel) return;
  const list = financeCategories[type] || financeCategories.expense || [];
  sel.innerHTML = list
    .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(FINANCE_CAT_LABELS[c] || c)}</option>`)
    .join("");
}

function resetFinanceForm() {
  $("finance-edit-id").value = "";
  $("finance-type").value = "income";
  fillFinanceCategories("income");
  $("finance-amount").value = "";
  $("finance-date").value = new Date().toISOString().slice(0, 10);
  $("finance-description").value = "";
  $("finance-orderId").value = "";
  $("finance-submit").textContent = "Kaydet";
  $("finance-cancel-edit")?.setAttribute("hidden", "");
  $("finance-form-error").textContent = "";
}

async function loadFinance() {
  const status = $("finance-status");
  try {
    const from = $("finance-from")?.value || "";
    const to = $("finance-to")?.value || "";
    const type = $("finance-filter-type")?.value || "";
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (type) q.set("type", type);
    const data = await api(`/api/admin/finance?${q}`);
    financeCategories = data.categories || financeCategories;
    const sum = data.summary || {};
    $("fin-income").textContent = formatMoney(sum.income || 0);
    $("fin-expense").textContent = formatMoney(sum.expense || 0);
    $("fin-balance").textContent = formatMoney(sum.balance || 0);
    const tbody = $("finance-tbody");
    if (!tbody) return;
    const txs = data.transactions || [];
    if (!txs.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="fineprint">Kayıt yok</td></tr>';
    } else {
      tbody.innerHTML = txs
        .map((t) => {
          const tip = t.type === "income" ? "Gelir" : "Gider";
          const sign = t.type === "income" ? "+" : "−";
          return `<tr>
            <td>${escapeHtml(t.date)}</td>
            <td>${tip}</td>
            <td>${escapeHtml(FINANCE_CAT_LABELS[t.category] || t.category)}</td>
            <td><strong>${sign}${formatMoney(t.amount)}</strong></td>
            <td>${escapeHtml(t.description || t.orderId || "—")}</td>
            <td>
              <button type="button" class="btn btn-outline btn-sm" data-fin-edit="${escapeHtml(t.id)}">Düzenle</button>
              <button type="button" class="btn btn-ghost btn-sm" data-fin-del="${escapeHtml(t.id)}">Sil</button>
            </td>
          </tr>`;
        })
        .join("");
      tbody.querySelectorAll("[data-fin-edit]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const tx = txs.find((x) => x.id === btn.getAttribute("data-fin-edit"));
          if (!tx) return;
          $("finance-edit-id").value = tx.id;
          $("finance-type").value = tx.type;
          fillFinanceCategories(tx.type);
          $("finance-category").value = tx.category;
          $("finance-amount").value = tx.amount;
          $("finance-date").value = tx.date;
          $("finance-description").value = tx.description || "";
          $("finance-orderId").value = tx.orderId || "";
          $("finance-submit").textContent = "Güncelle";
          $("finance-cancel-edit")?.removeAttribute("hidden");
        });
      });
      tbody.querySelectorAll("[data-fin-del]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("Bu kaydı silmek istiyor musunuz?")) return;
          try {
            await api(`/api/admin/finance/${encodeURIComponent(btn.getAttribute("data-fin-del"))}`, {
              method: "DELETE",
            });
            await loadFinance();
          } catch (e) {
            alert(e.message || "Silinemedi");
          }
        });
      });
    }
    if (status) status.textContent = `${txs.length} kayıt`;
    if (!$("finance-date")?.value) resetFinanceForm();
    else fillFinanceCategories($("finance-type")?.value || "income");
  } catch (e) {
    if (status) status.textContent = e.message || "Yüklenemedi";
  }
}

async function deleteProductById(id) {
  if (!id || !confirm(`“${id}” ürününü silmek istediğinize emin misiniz?`)) return;
  await api(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
  closeModal(els.productModal);
  await loadProducts();
  await loadDashboard({ quiet: true });
}

document.querySelectorAll("[data-close-modal]").forEach((el) => {
  el.addEventListener("click", () => {
    closeModal(els.orderModal);
    closeModal(els.productModal);
  });
});

els.navBtns.forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

els.autoRefresh?.addEventListener("change", startPollIfEnabled);

els.refreshOrders?.addEventListener("click", () => loadOrders());
els.refreshAnalytics?.addEventListener("click", () => loadAnalytics());
els.refreshReviews?.addEventListener("click", () => loadAdminReviews());
els.reviewFilterStatus?.addEventListener("change", () => loadAdminReviews());

let searchDebounce;
els.orderSearch?.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => loadOrders({ quiet: true }), 300);
});
els.orderFilterStatus?.addEventListener("change", () => loadOrders({ quiet: true }));

els.exportCsv?.addEventListener("click", async () => {
  try {
    const res = await fetch(apiUrl("/api/admin/orders/export"), {
      headers: { "X-Admin-Key": getKey().trim() },
    });
    if (!res.ok) throw new Error("Dışa aktarılamadı");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "siparisler.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    alert(e.message || "CSV indirilemedi");
  }
});

$("about-photo-add")?.addEventListener("click", () => {
  const list = $("about-photos-list");
  if (!list) return;
  if (list.querySelector(".fineprint")) list.innerHTML = "";
  const idx = list.querySelectorAll(".about-photo-row").length;
  list.insertAdjacentHTML("beforeend", aboutPhotoRowHtml({}, idx));
  const row = list.lastElementChild;
  bindMediaUploadRow(row);
  row?.querySelector(".about-photo-remove")?.addEventListener("click", () => {
    row.remove();
    if (!list.querySelector(".about-photo-row")) {
      list.innerHTML = '<p class="fineprint">Henüz fotoğraf yok.</p>';
    }
  });
});

bindMediaUpload($("nav-logo-file"), $("nav-logoUrl"), $("nav-logo-preview"), $("nav-logo-status"));
bindMediaUpload(
  $("nav-image-file"),
  $("nav-imageUrl"),
  $("nav-image-preview"),
  $("nav-image-status")
);
bindMediaUpload(
  $("pf-image-file"),
  $("pf-imageUrl"),
  $("pf-image-preview"),
  $("pf-image-status")
);

els.productNew?.addEventListener("click", () => openProductModal(null));

els.productDelete?.addEventListener("click", () => deleteProductById(els.pfOriginalId.value.trim()));

els.productForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.productFormError.textContent = "";
  const originalId = els.pfOriginalId.value.trim();
  const body = {
    id: els.pfId.value.trim(),
    name: els.pfName.value.trim(),
    desc: els.pfDesc.value.trim(),
    price: Number(els.pfPrice.value),
    unit: els.pfUnit.value.trim() || "kg",
    stock: Number(els.pfStock.value),
    category: els.pfCategory.value.trim(),
    imageUrl: els.pfImageUrl.value.trim(),
    emoji: els.pfEmoji.value.trim() || "🫑",
    theme: els.pfTheme.value,
    badge: els.pfBadge.value.trim(),
    active: els.pfActive.checked,
    featured: els.pfFeatured.checked,
  };
  try {
    if (originalId) {
      await api(`/api/admin/products/${encodeURIComponent(originalId)}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    } else {
      if (!body.id) delete body.id;
      await api("/api/admin/products", { method: "POST", body: JSON.stringify(body) });
    }
    closeModal(els.productModal);
    await loadProducts();
    await loadDashboard({ quiet: true });
  } catch (err) {
    els.productFormError.textContent = err.message || "Kayıt başarısız";
  }
});

els.settingsForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.settingsError.textContent = "";
  try {
    await api("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({
        storeName: $("set-storeName").value.trim(),
        tagline: $("set-tagline").value.trim(),
        phone: $("set-phone").value.trim(),
        email: $("set-email").value.trim(),
        address: $("set-address").value.trim(),
        announcement: $("set-announcement").value.trim(),
        shippingFee: Number($("set-shippingFee").value),
        freeShippingOver: Number($("set-freeShippingOver").value),
        whatsapp: $("set-whatsapp").value.trim(),
      }),
    });
    els.settingsError.className = "admin-success";
    els.settingsError.textContent = "Ayarlar kaydedildi.";
  } catch (err) {
    els.settingsError.className = "checkout-error";
    els.settingsError.textContent = err.message || "Kaydedilemedi";
  }
});

$("navbar-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("navbar-error");
  if (err) err.textContent = "";
  try {
    const trustRaw = $("nav-trustItems").value.trim();
    const trustItems = trustRaw
      ? trustRaw
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
      : [];
    await api("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({
        navbar: {
          logoUrl: $("nav-logoUrl").value.trim(),
          eyebrow: $("nav-eyebrow").value.trim(),
          title: $("nav-title").value.trim(),
          titleAccent: $("nav-titleAccent").value.trim(),
          heroLead: $("nav-heroLead").value.trim(),
          imageUrl: $("nav-imageUrl").value.trim(),
          imageAlt: $("nav-imageAlt").value.trim(),
          trustItems,
        },
      }),
    });
    if (err) {
      err.className = "admin-success";
      err.textContent = "Navbar kaydedildi. Mağazayı yenileyin (F5).";
    }
  } catch (ex) {
    if (err) {
      err.className = "checkout-error";
      err.textContent = ex.message || "Kaydedilemedi";
    }
  }
});

$("about-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("about-error");
  if (err) err.textContent = "";
  try {
    const saved = await api("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({
        about: {
          title: $("set-about-title").value.trim(),
          content: $("set-about-content").value.trim(),
          photos: collectAboutPhotos(),
        },
      }),
    });
    cachedAboutPhotos = saved.settings?.about?.photos || collectAboutPhotos();
    renderAboutPhotosAdmin(cachedAboutPhotos);
    if (err) {
      err.className = "admin-success";
      err.textContent = "Hakkımızda kaydedildi.";
    }
  } catch (ex) {
    if (err) {
      err.className = "checkout-error";
      err.textContent = ex.message || "Kaydedilemedi";
    }
  }
});

$("finance-type")?.addEventListener("change", (e) => fillFinanceCategories(e.target.value));

$("finance-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = $("finance-form-error");
  if (errEl) errEl.textContent = "";
  const body = {
    type: $("finance-type").value,
    category: $("finance-category").value,
    amount: Number($("finance-amount").value),
    date: $("finance-date").value,
    description: $("finance-description").value.trim(),
    orderId: $("finance-orderId").value.trim(),
  };
  const editId = $("finance-edit-id").value.trim();
  try {
    if (editId) {
      await api(`/api/admin/finance/${encodeURIComponent(editId)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    } else {
      await api("/api/admin/finance", { method: "POST", body: JSON.stringify(body) });
    }
    resetFinanceForm();
    await loadFinance();
  } catch (ex) {
    if (errEl) errEl.textContent = ex.message || "Kaydedilemedi";
  }
});

$("finance-cancel-edit")?.addEventListener("click", resetFinanceForm);
$("finance-refresh")?.addEventListener("click", () => loadFinance());
$("finance-filter-apply")?.addEventListener("click", () => loadFinance());

$("finance-sync-orders")?.addEventListener("click", async () => {
  try {
    const r = await api("/api/admin/finance/sync-orders", { method: "POST" });
    alert(`${r.added || 0} sipariş gelir olarak eklendi.`);
    await loadFinance();
  } catch (e) {
    alert(e.message || "Aktarılamadı");
  }
});

$("finance-export")?.addEventListener("click", async () => {
  try {
    const res = await fetch(apiUrl("/api/admin/finance/export"), {
      headers: { "X-Admin-Key": getKey().trim() },
    });
    if (!res.ok) throw new Error("Dışa aktarılamadı");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gelir-gider.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    alert(e.message || "CSV indirilemedi");
  }
});

els.loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (els.loginError) els.loginError.textContent = "";
  const key = els.keyInput.value.trim();
  if (!key) return;
  setKey(key);
  els.loginSubmit.disabled = true;
  try {
    await api("/api/admin/summary");
    showShell(true);
    setView("dashboard");
    await loadDashboard();
    startPollIfEnabled();
  } catch (err) {
    setKey("");
    if (els.loginError) els.loginError.textContent = err.message || "Giriş başarısız";
  } finally {
    els.loginSubmit.disabled = false;
  }
});

els.logout?.addEventListener("click", () => {
  stopPoll();
  if (els.autoRefresh) els.autoRefresh.checked = false;
  setKey("");
  els.keyInput.value = "";
  showShell(false);
  closeModal(els.orderModal);
  closeModal(els.productModal);
});

const saved = getKey();
if (saved) {
  showShell(true);
  setView("dashboard");
  loadDashboard()
    .then(() => startPollIfEnabled())
    .catch(() => {
      setKey("");
      showShell(false);
      if (els.loginError) els.loginError.textContent = "Oturum geçersiz.";
    });
}
