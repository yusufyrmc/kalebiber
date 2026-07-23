/* Scroll-reveal + subtle pointer parallax — progressive enhancement.
   No-JS or reduced-motion users always see full content. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Enable reveal styling only when JS runs (avoids hidden content without JS).
  root.classList.add("reveal-on");
  if (reduce) {
    root.classList.add("reveal-off");
    return;
  }

  // Selectors that become reveal targets. Items inside the same parent are
  // staggered by their index via the --reveal-i custom property.
  var GROUPS = [
    ".section-head",
    ".features-grid > .feature-card",
    ".product-grid > .product-card",
    ".reviews-list > .review-card",
    ".review-form-card",
    ".about-text",
    ".about-gallery > .about-photo",
    ".faq-list > .faq-item",
    ".contact-grid > *",
    ".contact-signature-block",
    ".steps > li"
  ];

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  function tag(el, index) {
    if (el.classList.contains("reveal")) return;
    el.classList.add("reveal");
    el.style.setProperty("--reveal-i", index % 8);
    // Elements already in view on load reveal immediately (no wait for scroll).
    var r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.classList.add("is-in");
        });
      });
    } else {
      io.observe(el);
    }
  }

  function scan(scope) {
    GROUPS.forEach(function (sel) {
      (scope || document).querySelectorAll(sel).forEach(function (el, i) {
        tag(el, i);
      });
    });
  }

  // Re-scan containers whose children are injected by main.js after fetch.
  var dynamic = ["#product-grid", "#reviews-list", "#about-gallery"];
  function watch() {
    dynamic.forEach(function (id) {
      var node = document.querySelector(id);
      if (!node) return;
      new MutationObserver(function () {
        scan(node.parentElement || document);
      }).observe(node, { childList: true });
    });
  }

  function boot() {
    scan(document);
    watch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Pointer-reactive hero glow: expose cursor position as CSS vars.
  var hero = document.querySelector(".hero--pro");
  if (hero && window.matchMedia("(pointer:fine)").matches) {
    hero.addEventListener("pointermove", function (e) {
      var b = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", ((e.clientX - b.left) / b.width).toFixed(3));
      hero.style.setProperty("--my", ((e.clientY - b.top) / b.height).toFixed(3));
    });
  }
})();
