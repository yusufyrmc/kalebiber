/** @deprecated Hesap sayfasını kullanın: /hesap.html?tab=giris */
import { initAuth, login } from "./auth-client.js";

await initAuth();

const form = document.getElementById("login-form");
const errEl = document.getElementById("login-error");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (errEl) errEl.textContent = "";
  try {
    await login(
      document.getElementById("login-email")?.value.trim(),
      document.getElementById("login-password")?.value
    );
    const next = new URLSearchParams(location.search).get("next");
    location.href = next === "checkout" ? "/?checkout=1" : "/hesap.html";
  } catch (err) {
    if (errEl) errEl.textContent = err.message;
  }
});
