(function () {
  "use strict";

  const navToggle = document.getElementById("navToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  const yearEl = document.getElementById("year");
  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const setMenuOpen = (open) => {
    if (!mobileMenu || !navToggle) return;
    mobileMenu.classList.toggle("is-open", open);
    mobileMenu.hidden = !open;
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  };

  navToggle?.addEventListener("click", () => {
    setMenuOpen(navToggle.getAttribute("aria-expanded") !== "true");
  });

  mobileMenu?.addEventListener("click", (e) => {
    if (e.target instanceof HTMLAnchorElement) setMenuOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenuOpen(false);
  });

  contactForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(contactForm);
    const name = String(data.get("name") || "").trim();
    const shop = String(data.get("shop") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const plan = String(data.get("plan") || "").trim();

    if (!name || !shop || !phone) {
      if (formStatus) formStatus.textContent = "Fill name, shop, and phone fr.";
      return;
    }

    const subject = encodeURIComponent(`NAM bill funky — ${plan} — ${shop}`);
    const body = encodeURIComponent(`Name: ${name}\nShop: ${shop}\nPhone: ${phone}\nPlan: ${plan}`);
    if (formStatus) formStatus.textContent = "Opening email…";
    window.location.href = `mailto:hello@nambill.app?subject=${subject}&body=${body}`;
  });
})();
