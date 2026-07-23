import { apiUrl } from "./api-base.js";
import {
  getMe,
  login,
  register,
  logout,
  updateProfile,
  fetchMyOrders,
  updateHeaderAccountLink,
  initAuth,
} from "./auth-client.js";

const STATUS_TR = {
  yeni: "Yeni sipariş",
  hazirlaniyor: "Hazırlanıyor",
  kargoda: "Kargoda",
  teslim_edildi: "Teslim edildi",
  iptal: "İptal",
};

const PAYMENT_TR = { kapida: "Kapıda ödeme", havale: "Havale/EFT", kart: "Kart" };

const els = {
  guest: document.getElementById("account-guest"),
  member: document.getElementById("account-member"),
  userName: document.getElementById("account-user-name"),
  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  loginError: document.getElementById("login-error"),
  registerError: document.getElementById("register-error"),
  profileForm: document.getElementById("profile-form"),
  profileError: document.getElementById("profile-error"),
  profileSuccess: document.getElementById("profile-success"),
  ordersStatus: document.getElementById("orders-status"),
  ordersList: document.getElementById("orders-list"),
  logoutBtn: document.getElementById("logout-btn"),
  siteBrandName: document.getElementById("site-brand-name"),
  siteLogoImg: document.getElementById("site-logo-img"),
  footerBrand: document.getElementById("footer-brand"),
  year: document.getElementById("year"),
  navToggle: document.querySelector(".nav-toggle"),
  navMenu: document.getElementById("nav-menu"),
  toastHost: document.getElementById("toast-host"),
};

let currentUser = null;

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function formatMoney(n) {
  return `${Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
}

function toast(msg) {
  if (!els.toastHost) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  els.toastHost.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function formatBrandHtml(name) {
  const n = String(name || "").trim();
  if (!n) return "";
  const m = n.match(/^(.+?)\s+(kale\s+bibercisi)$/i);
  if (m) return `${escapeHtml(m[1].trim())} <em>${escapeHtml(m[2])}</em>`;
  return escapeHtml(n);
}

function applySettings(s) {
  if (s.storeName) {
    if (els.siteBrandName) els.siteBrandName.innerHTML = formatBrandHtml(s.storeName);
    if (els.footerBrand) els.footerBrand.textContent = s.storeName;
    document.title = `Hesabım | ${s.storeName}`;
  }
  const logoUrl = s.navbar?.logoUrl;
  if (els.siteLogoImg && logoUrl) {
    els.siteLogoImg.src = logoUrl;
    els.siteLogoImg.alt = s.storeName || "Yarımca Kale Bibercisi";
  }
}

function showGuest() {
  els.guest?.removeAttribute("hidden");
  els.member?.setAttribute("hidden", "");
  updateHeaderAccountLink(null);
}

function showMember(user) {
  currentUser = user;
  els.guest?.setAttribute("hidden", "");
  els.member?.removeAttribute("hidden");
  if (els.userName) els.userName.textContent = user.name || user.email;
  fillProfileForm(user);
  updateHeaderAccountLink(user);
}

function fillProfileForm(user) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? "";
  };
  set("profile-name", user.name);
  set("profile-email", user.email);
  set("profile-phone", user.phone);
  set("profile-address", user.address);
  set("profile-city", user.city);
  const pwd = document.getElementById("profile-password");
  if (pwd) pwd.value = "";
}

function setGuestTab(tab) {
  document.querySelectorAll("[data-guest-tab]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-guest-tab") === tab);
  });
  document.querySelectorAll("[data-guest-panel]").forEach((panel) => {
    const id = panel.getAttribute("data-guest-panel");
    if (id === tab) panel.removeAttribute("hidden");
    else panel.setAttribute("hidden", "");
  });
}

function setMemberTab(tab) {
  document.querySelectorAll("[data-member-tab]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-member-tab") === tab);
  });
  document.querySelectorAll("[data-member-panel]").forEach((panel) => {
    const id = panel.getAttribute("data-member-panel");
    if (id === tab) panel.removeAttribute("hidden");
    else panel.setAttribute("hidden", "");
  });
  if (tab === "orders") loadOrders();
}

function renderOrderCard(order) {
  const items = (order.items || [])
    .map(
      (i) =>
        `<li>${escapeHtml(i.name)} × ${i.quantity} ${escapeHtml(i.unit || "")} — ${formatMoney(i.lineTotal)}</li>`
    )
    .join("");
  const status = STATUS_TR[order.status] || order.status;
  const pay = PAYMENT_TR[order.paymentMethod] || order.paymentMethod || "";
  return `
    <article class="order-account-card card">
      <div class="order-account-head">
        <div>
          <p class="order-account-id"><strong>${escapeHtml(order.id)}</strong></p>
          <p class="fineprint">${new Date(order.createdAt).toLocaleString("tr-TR")}</p>
        </div>
        <span class="order-account-badge">${escapeHtml(status)}</span>
      </div>
      <p class="order-account-total">Toplam: <strong>${formatMoney(order.total)}</strong>${pay ? ` · ${escapeHtml(pay)}` : ""}</p>
      ${order.trackingCode ? `<p class="fineprint">Kargo: <strong>${escapeHtml(order.trackingCode)}</strong></p>` : ""}
      <ul class="order-account-items">${items}</ul>
      <a class="btn btn-ghost btn-sm" href="/takip.html?id=${encodeURIComponent(order.id)}">Detaylı takip</a>
    </article>`;
}

async function loadOrders() {
  if (!els.ordersList) return;
  els.ordersStatus.textContent = "Yükleniyor…";
  els.ordersList.innerHTML = "";
  try {
    const orders = await fetchMyOrders();
    if (!orders.length) {
      els.ordersStatus.textContent = "Henüz siparişiniz yok. Mağazadan alışverişe başlayın.";
      return;
    }
    els.ordersStatus.textContent = `${orders.length} sipariş`;
    els.ordersList.innerHTML = orders.map(renderOrderCard).join("");
  } catch (err) {
    els.ordersStatus.textContent = "";
    els.ordersList.innerHTML = `<p class="checkout-error">${escapeHtml(err.message)}</p>`;
  }
}

document.querySelectorAll("[data-guest-tab]").forEach((btn) => {
  btn.addEventListener("click", () => setGuestTab(btn.getAttribute("data-guest-tab")));
});

document.querySelectorAll("[data-member-tab]").forEach((btn) => {
  btn.addEventListener("click", () => setMemberTab(btn.getAttribute("data-member-tab")));
});

els.loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (els.loginError) els.loginError.textContent = "";
  const email = document.getElementById("login-email")?.value.trim();
  const password = document.getElementById("login-password")?.value;
  try {
    const user = await login(email, password);
    toast("Giriş başarılı");
    showMember(user);
    setMemberTab("profile");
    redirectAfterAuth();
  } catch (err) {
    if (els.loginError) els.loginError.textContent = err.message;
  }
});

els.registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (els.registerError) els.registerError.textContent = "";
  const name = document.getElementById("reg-name")?.value.trim();
  const email = document.getElementById("reg-email")?.value.trim();
  const phone = document.getElementById("reg-phone")?.value.trim();
  const password = document.getElementById("reg-password")?.value;
  const password2 = document.getElementById("reg-password2")?.value;
  if (password !== password2) {
    if (els.registerError) els.registerError.textContent = "Şifreler eşleşmiyor";
    return;
  }
  try {
    const user = await register({ name, email, password, phone });
    toast("Hesabınız oluşturuldu");
    showMember(user);
    setMemberTab("profile");
    redirectAfterAuth();
  } catch (err) {
    if (els.registerError) els.registerError.textContent = err.message;
  }
});

els.profileForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (els.profileError) els.profileError.textContent = "";
  if (els.profileSuccess) {
    els.profileSuccess.hidden = true;
    els.profileSuccess.textContent = "";
  }
  const body = {
    name: document.getElementById("profile-name")?.value.trim(),
    phone: document.getElementById("profile-phone")?.value.trim(),
    address: document.getElementById("profile-address")?.value.trim(),
    city: document.getElementById("profile-city")?.value.trim(),
  };
  const pwd = document.getElementById("profile-password")?.value;
  if (pwd) body.password = pwd;
  try {
    const user = await updateProfile(body);
    currentUser = user;
    fillProfileForm(user);
    updateHeaderAccountLink(user);
    if (els.profileSuccess) {
      els.profileSuccess.textContent = "Profil kaydedildi.";
      els.profileSuccess.hidden = false;
    }
    toast("Profil güncellendi");
  } catch (err) {
    if (els.profileError) els.profileError.textContent = err.message;
  }
});

els.logoutBtn?.addEventListener("click", async () => {
  await logout();
  currentUser = null;
  toast("Çıkış yapıldı");
  showGuest();
  setGuestTab("login");
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

if (els.year) els.year.textContent = String(new Date().getFullYear());

const params = new URLSearchParams(window.location.search);
const urlTab = params.get("tab");
if (urlTab === "kayit" || urlTab === "register") setGuestTab("register");
else if (urlTab === "giris" || urlTab === "login") setGuestTab("login");
function redirectAfterAuth() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("next") === "checkout") {
    window.location.href = "/?checkout=1";
  }
}

async function init() {
  await initAuth();
  try {
    const res = await fetch(apiUrl(`/api/settings?_=${Date.now()}`), { cache: "no-store" });
    if (res.ok) applySettings(await res.json());
  } catch {
    /* ignore */
  }

  try {
    const cfgRes = await fetch(apiUrl("/api/config"));
    if (cfgRes.ok) {
      const cfg = await cfgRes.json();
      if (cfg.authProvider !== "supabase" && els.loginError) {
        els.loginError.textContent =
          "Supabase bağlı değil. .env dosyasına SUPABASE_URL ve SUPABASE_ANON_KEY ekleyip sunucuyu yeniden başlatın.";
      }
    }
  } catch {
    /* ignore */
  }

  const user = await getMe();
  if (user) {
    showMember(user);
    if (params.get("orders") === "1" || urlTab === "siparisler") setMemberTab("orders");
    else setMemberTab("profile");
  } else {
    showGuest();
  }
}

init();
