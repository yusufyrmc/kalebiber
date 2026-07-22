import { apiUrl } from "./api-base.js";
import { getMe, updateHeaderAccountLink, initAuth } from "./auth-client.js";

const STATUS_TR = {
  yeni: "Yeni sipariş",
  hazirlaniyor: "Hazırlanıyor",
  kargoda: "Kargoda",
  teslim_edildi: "Teslim edildi",
  iptal: "İptal",
};

const els = {
  siteBrandName: document.getElementById("site-brand-name"),
  siteLogoImg: document.getElementById("site-logo-img"),
  footerBrand: document.getElementById("footer-brand"),
  footerAddress: document.getElementById("footer-address"),
  announcementBar: document.getElementById("announcement-bar"),
  announcementText: document.getElementById("announcement-text"),
  trackForm: document.getElementById("track-form"),
  trackId: document.getElementById("track-id"),
  trackResult: document.getElementById("track-result"),
  year: document.getElementById("year"),
  navToggle: document.querySelector(".nav-toggle"),
  navMenu: document.getElementById("nav-menu"),
};

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function formatMoney(n) {
  return `${Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
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
    document.title = `Sipariş Takip | ${s.storeName}`;
  }
  if (els.footerAddress && s.address) els.footerAddress.textContent = s.address;
  if (s.announcement && els.announcementText) {
    els.announcementText.textContent = s.announcement;
    els.announcementBar?.removeAttribute("hidden");
  }
  const logoUrl = s.navbar?.logoUrl;
  if (els.siteLogoImg && logoUrl) {
    els.siteLogoImg.src = logoUrl;
    els.siteLogoImg.alt = s.storeName || "Yarımca Kale Bibercisi";
  }
}

async function runTrack(id) {
  if (!id || !els.trackResult) return;
  els.trackResult.hidden = false;
  els.trackResult.innerHTML = "Sorgulanıyor…";
  try {
    const res = await fetch(apiUrl(`/api/orders/track?id=${encodeURIComponent(id)}`));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Bulunamadı");
    const items = (data.items || [])
      .map((i) => `<li>${escapeHtml(i.name)} × ${i.quantity} ${escapeHtml(i.unit)}</li>`)
      .join("");
    els.trackResult.innerHTML = `
      <div class="track-result-card card">
        <p><strong>${escapeHtml(data.id)}</strong> — ${escapeHtml(STATUS_TR[data.status] || data.status)}</p>
        <p class="fineprint">${new Date(data.createdAt).toLocaleString("tr-TR")}</p>
        ${data.trackingCode ? `<p>Kargo takip no: <strong>${escapeHtml(data.trackingCode)}</strong></p>` : ""}
        <p>Toplam: <strong>${formatMoney(data.total)}</strong></p>
        <ul>${items}</ul>
      </div>`;
  } catch (err) {
    els.trackResult.innerHTML = `<p class="checkout-error">${escapeHtml(err.message)}</p>`;
  }
}

els.trackForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = els.trackId?.value.trim();
  if (!id) return;
  history.replaceState(null, "", `?id=${encodeURIComponent(id)}`);
  await runTrack(id);
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

initAuth()
  .then(() => getMe())
  .then(updateHeaderAccountLink)
  .catch(() => {});

if (window.__KALE_SETTINGS__) {
  applySettings(window.__KALE_SETTINGS__);
  delete window.__KALE_SETTINGS__;
} else {
  fetch(apiUrl(`/api/settings?_=${Date.now()}`), { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then(applySettings)
    .catch(() => {});
}

const params = new URLSearchParams(window.location.search);
const prefill = params.get("id");
if (prefill && els.trackId) {
  els.trackId.value = prefill;
  runTrack(prefill);
}
