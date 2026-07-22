import { apiUrl } from "./api-base.js";

const KEY_STORAGE = "kale-biber-admin-key-v3";

const STATUS_LABELS = {
  yeni: "Yeni",
  hazirlaniyor: "Hazırlanıyor",
  kargoda: "Kargoda",
  teslim_edildi: "Teslim edildi",
  iptal: "İptal",
};

const els = {
  login: document.getElementById("admin-login"),
  dashboard: document.getElementById("admin-dashboard"),
  loginForm: document.getElementById("login-form"),
  loginError: document.getElementById("login-error"),
  loginSubmit: document.getElementById("login-submit"),
  keyInput: document.getElementById("admin-key-input"),
  logout: document.getElementById("logout-admin"),
  tabProducts: document.getElementById("tab-products"),
  tabOrders: document.getElementById("tab-orders"),
  panelProducts: document.getElementById("panel-products"),
  panelOrders: document.getElementById("panel-orders"),
  productsList: document.getElementById("products-list"),
  productsStatus: document.getElementById("products-status"),
  refreshProducts: document.getElementById("refresh-products"),
  productNew: document.getElementById("product-new"),
  productEditorWrap: document.getElementById("product-editor-wrap"),
  productEditorTitle: document.getElementById("product-editor-title"),
  productForm: document.getElementById("product-form"),
  pfOriginalId: document.getElementById("pf-original-id"),
  pfId: document.getElementById("pf-id"),
  pfName: document.getElementById("pf-name"),
  pfDesc: document.getElementById("pf-desc"),
  pfPrice: document.getElementById("pf-price"),
  pfUnit: document.getElementById("pf-unit"),
  pfEmoji: document.getElementById("pf-emoji"),
  pfTheme: document.getElementById("pf-theme"),
  pfBadge: document.getElementById("pf-badge"),
  productFormError: document.getElementById("product-form-error"),
  productDelete: document.getElementById("product-delete"),
  productCancel: document.getElementById("product-cancel"),
  ordersList: document.getElementById("orders-list"),
  adminStatus: document.getElementById("admin-status"),
  refreshOrders: document.getElementById("refresh-orders"),
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
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

async function api(path, opts = {}) {
  const key = getKey().trim();
  let res;
  try {
    res = await fetch(path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": key,
        ...opts.headers,
      },
    });
  } catch {
    throw new Error(
      "API sunucusuna ulaşılamıyor. Ayrı bir terminalde proje klasöründe `npm start` çalıştırın (Node 3000 portunda dinlemeli). Mümkünse http://localhost:3000/admin.html ile açın."
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
      throw new Error("Şifre yanlış. .env dosyasındaki ADMIN_KEY ile aynı olduğundan emin olun (ör. yusuf123).");
    }
    throw new Error(data.error || res.statusText);
  }
  return data;
}

function showDashboard(show) {
  els.login.hidden = show;
  els.dashboard.hidden = !show;
}

function setTab(tab) {
  const orders = tab === "orders";
  els.panelProducts.hidden = orders;
  els.panelOrders.hidden = !orders;
  els.tabProducts.classList.toggle("is-active", !orders);
  els.tabOrders.classList.toggle("is-active", orders);
  els.tabProducts.setAttribute("aria-selected", String(!orders));
  els.tabOrders.setAttribute("aria-selected", String(orders));
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

async function loadOrders() {
  els.adminStatus.textContent = "Siparişler yükleniyor…";
  els.ordersList.innerHTML = "";
  try {
    const orders = await api("/api/admin/orders");
    els.adminStatus.textContent = orders.length ? `${orders.length} sipariş` : "Henüz sipariş yok";
    if (orders.length === 0) {
      els.ordersList.innerHTML = '<p class="prose">Sipariş geldiğinde burada listelenecek.</p>';
      return;
    }
    els.ordersList.innerHTML = orders.map((o) => orderCard(o)).join("");
    els.ordersList.querySelectorAll("[data-order-status]").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const id = sel.getAttribute("data-order-id");
        const status = sel.value;
        sel.disabled = true;
        try {
          await api(`/api/admin/orders/${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: JSON.stringify({ status }),
          });
          els.adminStatus.textContent = "Durum güncellendi";
        } catch (err) {
          els.adminStatus.textContent = err.message || "Hata";
          await loadOrders();
        } finally {
          sel.disabled = false;
        }
      });
    });
  } catch (e) {
    els.adminStatus.textContent = e.message || "Siparişler alınamadı";
    if (e.message === "Yetkisiz" || e.message.includes("ADMIN_KEY")) {
      setKey("");
      showDashboard(false);
      if (els.loginError) els.loginError.textContent = "Yetkisiz veya sunucu anahtarı tanımsız.";
    }
  }
}

function orderCard(o) {
  const items = o.items
    .map(
      (l) =>
        `<li>${escapeHtml(l.name)} — ${l.quantity} ${escapeHtml(l.unit)} × ${formatMoney(l.unitPrice)} = <strong>${formatMoney(l.lineTotal)}</strong></li>`
    )
    .join("");
  const opts = Object.entries(STATUS_LABELS)
    .map(
      ([val, label]) =>
        `<option value="${val}" ${o.status === val ? "selected" : ""}>${label}</option>`
    )
    .join("");
  return `
    <article class="order-card card">
      <header class="order-card-head">
        <div>
          <span class="order-id">${escapeHtml(o.id)}</span>
          <time class="order-time" datetime="${escapeHtml(o.createdAt)}">${formatDate(o.createdAt)}</time>
        </div>
        <label class="order-status-label">
          Durum
          <select data-order-status data-order-id="${escapeHtml(o.id)}">${opts}</select>
        </label>
      </header>
      <div class="order-customer">
        <p><strong>${escapeHtml(o.customer.name)}</strong></p>
        <p class="fineprint">${escapeHtml(o.customer.phone)} · ${escapeHtml(o.customer.email)}</p>
        <p class="fineprint">${escapeHtml(o.customer.address)}${o.customer.city ? `, ${escapeHtml(o.customer.city)}` : ""}</p>
      </div>
      ${o.note ? `<p class="order-note"><em>Not:</em> ${escapeHtml(o.note)}</p>` : ""}
      <ul class="order-items">${items}</ul>
      <p class="order-subtotal">Ara toplam: <strong>${formatMoney(o.subtotal)}</strong></p>
    </article>
  `;
}

function openProductForm(product) {
  els.productEditorWrap.hidden = false;
  els.productFormError.textContent = "";
  if (product) {
    els.productEditorTitle.textContent = "Ürünü düzenle";
    els.pfOriginalId.value = product.id;
    els.pfId.value = product.id;
    els.pfId.readOnly = true;
    els.pfName.value = product.name;
    els.pfDesc.value = product.desc || "";
    els.pfPrice.value = String(product.price);
    els.pfUnit.value = product.unit || "kg";
    els.pfEmoji.value = product.emoji || "";
    els.pfTheme.value = product.theme || "sweet";
    els.pfBadge.value = product.badge || "";
    els.productDelete.hidden = false;
  } else {
    els.productEditorTitle.textContent = "Yeni ürün";
    els.pfOriginalId.value = "";
    els.pfId.value = "";
    els.pfId.readOnly = false;
    els.productForm.reset();
    els.pfTheme.value = "sweet";
    els.pfUnit.value = "kg";
    els.productDelete.hidden = true;
  }
  els.pfName.focus();
}

function closeProductForm() {
  els.productEditorWrap.hidden = true;
  els.productFormError.textContent = "";
}

async function loadProducts() {
  els.productsStatus.textContent = "Ürünler yükleniyor…";
  els.productsList.innerHTML = "";
  try {
    const products = await api("/api/admin/products");
    els.productsStatus.textContent = products.length ? `${products.length} ürün` : "Henüz ürün yok";
    if (products.length === 0) {
      els.productsList.innerHTML = '<p class="prose">«Yeni ürün» ile ekleyin.</p>';
      return;
    }
    els.productsList.innerHTML = products
      .map(
        (p) => `
      <div class="product-admin-row" data-pid="${escapeHtml(p.id)}">
        <div class="product-admin-row-main">
          <span class="product-admin-emoji" aria-hidden="true">${p.emoji || "🫑"}</span>
          <div>
            <strong>${escapeHtml(p.name)}</strong>
            <span class="fineprint product-admin-meta">${escapeHtml(p.id)} · ${formatMoney(p.price)}/${escapeHtml(p.unit)}</span>
          </div>
        </div>
        <button type="button" class="btn btn-outline btn-sm" data-edit="${escapeHtml(p.id)}">Düzenle</button>
      </div>
    `
      )
      .join("");
    els.productsList.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-edit");
        const list = await api("/api/admin/products");
        const p = list.find((x) => x.id === id);
        if (p) openProductForm(p);
      });
    });
  } catch (e) {
    els.productsStatus.textContent = e.message || "Ürünler alınamadı";
  }
}

els.tabProducts.addEventListener("click", () => setTab("products"));
els.tabOrders.addEventListener("click", () => setTab("orders"));

els.refreshOrders.addEventListener("click", () => loadOrders());
els.refreshProducts.addEventListener("click", () => loadProducts());

els.productNew.addEventListener("click", () => openProductForm(null));
els.productCancel.addEventListener("click", () => closeProductForm());

els.productDelete.addEventListener("click", async () => {
  const id = els.pfOriginalId.value.trim();
  if (!id || !confirm(`“${id}” ürününü silmek istediğinize emin misiniz?`)) return;
  els.productFormError.textContent = "";
  try {
    await api(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
    els.productsStatus.textContent = "Ürün silindi";
    closeProductForm();
    await loadProducts();
  } catch (e) {
    els.productFormError.textContent = e.message || "Silinemedi";
  }
});

els.productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.productFormError.textContent = "";
  const originalId = els.pfOriginalId.value.trim();
  const body = {
    id: els.pfId.value.trim(),
    name: els.pfName.value.trim(),
    desc: els.pfDesc.value.trim(),
    price: Number(els.pfPrice.value),
    unit: els.pfUnit.value.trim() || "kg",
    emoji: els.pfEmoji.value.trim() || "🫑",
    theme: els.pfTheme.value,
    badge: els.pfBadge.value.trim(),
  };
  try {
    if (originalId) {
      await api(`/api/admin/products/${encodeURIComponent(originalId)}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      els.productsStatus.textContent = "Ürün güncellendi";
    } else {
      const payload = { ...body };
      if (!payload.id) delete payload.id;
      await api("/api/admin/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      els.productsStatus.textContent = "Ürün eklendi";
    }
    closeProductForm();
    await loadProducts();
  } catch (err) {
    els.productFormError.textContent = err.message || "Kayıt başarısız";
  }
});

els.loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (els.loginError) els.loginError.textContent = "";
  const key = els.keyInput.value.trim();
  if (!key) return;
  setKey(key);
  els.loginSubmit.disabled = true;
  try {
    await api("/api/admin/products");
    showDashboard(true);
    setTab("products");
    await loadProducts();
    await loadOrders();
  } catch (err) {
    setKey("");
    if (els.loginError) els.loginError.textContent = err.message || "Giriş başarısız";
  } finally {
    els.loginSubmit.disabled = false;
  }
});

els.logout.addEventListener("click", () => {
  setKey("");
  els.keyInput.value = "";
  showDashboard(false);
  closeProductForm();
});

const saved = getKey();
if (saved) {
  showDashboard(true);
  setTab("products");
  Promise.all([loadProducts(), loadOrders()]).catch(() => {
    setKey("");
    showDashboard(false);
    if (els.loginError) els.loginError.textContent = "Oturum geçersiz veya süresi doldu.";
  });
}
