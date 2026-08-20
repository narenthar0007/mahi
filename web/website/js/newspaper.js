(function () {
  "use strict";

  const yearEl = document.getElementById("year");
  const dateline = document.getElementById("dateline");
  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  if (dateline) {
    dateline.textContent = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  contactForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(contactForm);
    const name = String(data.get("name") || "").trim();
    const shop = String(data.get("shop") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const plan = String(data.get("plan") || "").trim();

    if (!name || !shop || !phone) {
      if (formStatus) formStatus.textContent = "Please complete all required fields.";
      return;
    }

    const subject = encodeURIComponent(`NAM bill Chronicle — ${plan} — ${shop}`);
    const body = encodeURIComponent(`Name: ${name}\nShop: ${shop}\nPhone: ${phone}\nPlan: ${plan}`);
    if (formStatus) formStatus.textContent = "Opening your email client…";
    window.location.href = `mailto:hello@nambill.app?subject=${subject}&body=${body}`;
  });
})();
