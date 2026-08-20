(function () {
  "use strict";

  const navToggle = document.getElementById("navToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  const yearEl = document.getElementById("year");
  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const panels = Array.from(document.querySelectorAll(".menu-panel"));

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

  const activateTab = (key) => {
    tabs.forEach((tab) => {
      const on = tab.dataset.tab === key;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });

    panels.forEach((panel) => {
      const on = panel.dataset.panel === key;
      panel.classList.toggle("is-active", on);
      panel.hidden = !on;
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });

  contactForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(contactForm);
    const name = String(data.get("name") || "").trim();
    const shop = String(data.get("shop") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const plan = String(data.get("plan") || "").trim();

    if (!name || !shop || !phone) {
      if (formStatus) formStatus.textContent = "Please fill name, shop, and WhatsApp.";
      return;
    }

    const subject = encodeURIComponent(`NAM bill Kitchen — ${plan} — ${shop}`);
    const body = encodeURIComponent(`Name: ${name}\nShop: ${shop}\nPhone: ${phone}\nPlan: ${plan}`);
    if (formStatus) formStatus.textContent = "Opening your email…";
    window.location.href = `mailto:hello@nambill.app?subject=${subject}&body=${body}`;
  });
})();
