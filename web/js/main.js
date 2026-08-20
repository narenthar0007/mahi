(function () {
  "use strict";

  const navWrap = document.getElementById("navWrap");
  const navToggle = document.getElementById("navToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  const yearEl = document.getElementById("year");
  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* Sticky nav state */
  const onScroll = () => {
    if (!navWrap) return;
    navWrap.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile menu */
  const setMenuOpen = (open) => {
    if (!mobileMenu || !navToggle) return;
    mobileMenu.classList.toggle("is-open", open);
    mobileMenu.hidden = !open;
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  };

  navToggle?.addEventListener("click", () => {
    const open = navToggle.getAttribute("aria-expanded") !== "true";
    setMenuOpen(open);
  });

  mobileMenu?.addEventListener("click", (e) => {
    const target = e.target;
    if (target === mobileMenu) setMenuOpen(false);
    if (target instanceof HTMLAnchorElement) setMenuOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenuOpen(false);
  });

  /* FAQ accordion */
  document.querySelectorAll(".faq-item").forEach((item) => {
    const btn = item.querySelector("button");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const willOpen = !item.classList.contains("is-open");
      document.querySelectorAll(".faq-item.is-open").forEach((openItem) => {
        if (openItem !== item) {
          openItem.classList.remove("is-open");
          openItem.querySelector("button")?.setAttribute("aria-expanded", "false");
        }
      });
      item.classList.toggle("is-open", willOpen);
      btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
  });

  /* Scroll reveal */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* Contact form → mailto */
  contactForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(contactForm);
    const name = String(data.get("name") || "").trim();
    const shop = String(data.get("shop") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const plan = String(data.get("plan") || "").trim();
    const message = String(data.get("message") || "").trim();

    if (!name || !shop || !phone) {
      if (formStatus) formStatus.textContent = "Please fill in name, shop, and phone.";
      return;
    }

    const subject = encodeURIComponent(`NAM bill license — ${plan} — ${shop}`);
    const body = encodeURIComponent(
      [
        `Name: ${name}`,
        `Shop: ${shop}`,
        `Phone: ${phone}`,
        `Plan: ${plan}`,
        message ? `Message: ${message}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );

    if (formStatus) {
      formStatus.textContent = "Opening your email app…";
    }

    window.location.href = `mailto:hello@nambill.app?subject=${subject}&body=${body}`;

    window.setTimeout(() => {
      if (formStatus) {
        formStatus.textContent = "If email didn’t open, write to hello@nambill.app.";
      }
    }, 1200);
  });
})();
