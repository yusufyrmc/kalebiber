/** @deprecated Hesap sayfasını kullanın: /hesap.html?tab=kayit */
import { initAuth, register } from "./auth-client.js";

await initAuth();

const form = document.getElementById("register-form");
const errEl = document.getElementById("register-error");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (errEl) errEl.textContent = "";
  const p1 = document.getElementById("reg-password")?.value;
  const p2 = document.getElementById("reg-password2")?.value;
  if (p1 !== p2) {
    if (errEl) errEl.textContent = "Şifreler eşleşmiyor";
    return;
  }
  try {
    await register({
      name: document.getElementById("reg-name")?.value.trim(),
      email: document.getElementById("reg-email")?.value.trim(),
      phone: document.getElementById("reg-phone")?.value.trim(),
      password: p1,
    });
    location.href = "/hesap.html";
  } catch (err) {
    if (errEl) errEl.textContent = err.message;
  }
});
