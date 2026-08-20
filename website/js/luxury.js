(function () {
  "use strict";

  const navWrap = document.getElementById("navWrap");
  const navToggle = document.getElementById("navToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  const yearEl = document.getElementById("year");
  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");
  const frames = Array.from(document.querySelectorAll(".phone-frame"));
  const dots = Array.from(document.querySelectorAll(".shot-dot"));
  const keys = ["billing", "inventory", "history"];
  const layouts = {
    billing: { billing: "main", inventory: "left", history: "right" },
    inventory: { inventory: "main", history: "left", billing: "right" },
    history: { history: "main", billing: "left", inventory: "right" },
  };

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const onScroll = () => {
    navWrap?.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

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
    if (e.target === mobileMenu || e.target instanceof HTMLAnchorElement) setMenuOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenuOpen(false);
  });

  const activateShot = (key) => {
    const layout = layouts[key];
    if (!layout) return;

    frames.forEach((frame) => {
      const role = layout[frame.dataset.shot];
      frame.classList.remove(
        "phone-main",
        "phone-side",
        "phone-left",
        "phone-right",
        "is-active",
        "is-dim"
      );
      if (role === "main") {
        frame.classList.add("phone-main", "is-active");
      } else {
        frame.classList.add("phone-side", "is-dim", role === "left" ? "phone-left" : "phone-right");
      }
    });

    dots.forEach((dot) => {
      const on = dot.dataset.target === key;
      dot.classList.toggle("is-active", on);
      dot.setAttribute("aria-selected", on ? "true" : "false");
    });
  };

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      activateShot(dot.dataset.target);
      autoIndex = keys.indexOf(dot.dataset.target);
    });
  });

  frames.forEach((frame) => {
    frame.style.cursor = "pointer";
    frame.addEventListener("click", () => {
      activateShot(frame.dataset.shot);
      autoIndex = keys.indexOf(frame.dataset.shot);
    });
  });

  let autoIndex = 0;
  let timer = null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const startAuto = () => {
    if (reduceMotion) return;
    stopAuto();
    timer = window.setInterval(() => {
      autoIndex = (autoIndex + 1) % keys.length;
      activateShot(keys[autoIndex]);
    }, 4200);
  };

  const stopAuto = () => {
    if (timer) window.clearInterval(timer);
    timer = null;
  };

  const showcase = document.querySelector(".hero-showcase");
  showcase?.addEventListener("mouseenter", stopAuto);
  showcase?.addEventListener("mouseleave", startAuto);
  startAuto();

  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
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

  contactForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(contactForm);
    const name = String(data.get("name") || "").trim();
    const shop = String(data.get("shop") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const plan = String(data.get("plan") || "").trim();

    if (!name || !shop || !phone) {
      if (formStatus) formStatus.textContent = "Please complete name, shop, and phone.";
      return;
    }

    const subject = encodeURIComponent(`NAM bill Lux — ${plan} — ${shop}`);
    const body = encodeURIComponent(`Name: ${name}\nShop: ${shop}\nPhone: ${phone}\nPlan: ${plan}`);
    if (formStatus) formStatus.textContent = "Opening your email app…";
    window.location.href = `mailto:hello@nambill.app?subject=${subject}&body=${body}`;
  });
})();
