/* =======================================
   Stootap Frontend Enhancements — app.js
   ======================================= */

(function () {
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

  // -----------------------------
  // Sticky header shadow on scroll
  // -----------------------------
  const header = qs("header.sticky");
  const setHeaderShade = () => {
    if (!header) return;
    const scrolled = window.scrollY > 6;
    header.style.boxShadow = scrolled ? "0 6px 24px rgba(0,0,0,.06)" : "none";
    header.style.background = scrolled ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.80)";
  };
  setHeaderShade();
  window.addEventListener("scroll", setHeaderShade, { passive: true });

  // -----------------------------
  // Scroll reveal (IntersectionObserver)
  // -----------------------------
  const revealTargets = [
    ...qsa("section > *"),
    ...qsa("details"),
    ...qsa(".p-4.rounded-xl.border.bg-white"),
    ...qsa(".cta-gradient, .rounded-3xl"),
  ];

  revealTargets.forEach((el) => el.classList?.add("reveal"));

  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              obs.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.15 }
      )
    : null;

  if (io) revealTargets.forEach((el) => io.observe(el));
  else revealTargets.forEach((el) => el.classList.add("is-visible"));

  // -----------------------------
  // Utility: inert background toggling
  // -----------------------------
  const setPageInert = (inert) => {
    const main = qs("body");
    if (!main) return;
    if (inert) {
      main.dataset.scrollLock = "1";
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      delete main.dataset.scrollLock;
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
  };

  // -----------------------------
  // Modal handling for :target overlays
  // (works with anchor-based navigation)
  // - Focus trap
  // - ESC to close
  // - Click outside to close
  // -----------------------------
  let activeModal = null;
  let lastFocused = null;

  const getModalFromHash = () => {
    const id = location.hash || "";
    if (!id || id.length < 2) return null;
    const el = qs(id);
    return el && el.classList.contains("overlay") ? el : null;
  };

  const focusable = (root) =>
    qsa(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      root
    ).filter((el) => !el.hasAttribute("disabled"));

  const openModal = (modal) => {
    if (!modal) return;
    // store last focus
    lastFocused = document.activeElement;
    activeModal = modal;
    setPageInert(true);
    // focus first control
    const f = focusable(modal);
    if (f.length) f[0].focus();
  };

  const closeModal = () => {
    if (!activeModal) return;
    // remove hash without adding history entry
    if (location.hash) history.pushState("", document.title, window.location.pathname + window.location.search);
    setPageInert(false);
    // restore focus
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
    activeModal = null;
  };

  // Trap focus within modal
  document.addEventListener("keydown", (e) => {
    if (!activeModal) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
      return;
    }
    if (e.key === "Tab") {
      const items = focusable(activeModal);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Click outside to close
  qsa(".overlay").forEach((ov) => {
    ov.addEventListener("click", (e) => {
      if (e.target === ov) closeModal();
    });
  });

  // Handle hash changes (open/close modal)
  const syncModalWithHash = () => {
    const modal = getModalFromHash();
    if (modal) openModal(modal);
    else {
      // closing
      if (activeModal) closeModal();
    }
  };
  window.addEventListener("hashchange", syncModalWithHash);
  // On load, if URL already has #login-modal etc.
  syncModalWithHash();

  // -----------------------------
  // Mobile menu: close when clicking any link
  // -----------------------------
  const mobileMenu = qs("#mobile-menu");
  if (mobileMenu) {
    mobileMenu.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      // close the target menu if navigating within page
      if (href.startsWith("#") && href !== "#mobile-menu") {
        setTimeout(() => {
          if (location.hash === "#mobile-menu") closeModal();
        }, 0);
      }
    });
  }

  // -----------------------------
  // Forms: basic UX (prevent empty submit,
  // mock success feedback for demo)
  // -----------------------------
  const forms = qsa("form");
  forms.forEach((form) => {
    form.addEventListener("submit", (e) => {
      // rudimentary check for required fields
      const requires = qsa("[required]", form);
      const invalid = requires.find((el) => !el.value || !String(el.value).trim());
      if (invalid) {
        e.preventDefault();
        invalid.focus();
        flashToast("Please complete all required fields.");
        return;
      }

      // Demo: prevent actual navigation if action="#"
      const action = (form.getAttribute("action") || "").trim();
      if (action === "#" || action.startsWith("#")) {
        e.preventDefault();
        flashToast("Thanks! We’ll reach out shortly.");
        // Close modal if inside one
        const withinOverlay = form.closest(".overlay");
        if (withinOverlay) {
          setTimeout(() => closeModal(), 400);
        }
      }
    });
  });

  // -----------------------------
  // Toast utility
  // -----------------------------
  let toastTimer = null;
  const flashToast = (message = "Done", timeout = 2200) => {
    let toast = qs("#stootap-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "stootap-toast";
      toast.setAttribute(
        "style",
        [
          "position:fixed",
          "left:50%",
          "bottom:28px",
          "transform:translateX(-50%)",
          "background:#0f172a",
          "color:#fff",
          "padding:12px 16px",
          "border-radius:14px",
          "box-shadow:0 10px 30px rgba(0,0,0,.15)",
          "font:500 14px/1.2 Inter,system-ui,sans-serif",
          "z-index:999",
          "opacity:0",
          "transition:opacity .2s ease, transform .2s ease",
          "pointer-events:none",
          "max-width:90%",
          "text-align:center",
        ].join(";")
      );
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(-50%) translateY(-4px)";
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(0)";
    }, timeout);
  };

  // -----------------------------
  // Accordions: optional behavior
  // (open one at a time for cleaner UI on desktop)
  // -----------------------------
  const accordions = qsa("section#services details");
  accordions.forEach((d) => {
    d.addEventListener("toggle", () => {
      if (d.open) {
        accordions.forEach((other) => {
          if (other !== d && other.open) other.open = false;
        });
        // smooth scroll to opened one (if off-screen)
        const rect = d.getBoundingClientRect();
        if (rect.top < 0 || rect.top > window.innerHeight * 0.6) {
          d.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  });

  // -----------------------------
  // Micro-interactions: press effects, hover lift
  // -----------------------------
  qsa('a, button, [role="button"]').forEach((el) => {
    el.classList.add("btn-press");
  });
  qsa(".p-4.rounded-xl.border.bg-white").forEach((el) => {
    el.classList.add("hover-lift");
  });

  // -----------------------------
  // Progressive enhancement: hero emoji float
  // -----------------------------
  const heroEmoji = qs(".aspect-[4/3] .text-7xl");
  if (heroEmoji) heroEmoji.classList.add("hero-emoji");

  // -----------------------------
  // Quality-of-life: keyboard "Enter" opens focused <summary>
  // -----------------------------
  qsa("summary").forEach((sum) => {
    sum.setAttribute("tabindex", "0");
    sum.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        sum.click();
      }
    });
  });

  // -----------------------------
  // Ensure external links open in new tab (safety)
  // -----------------------------
  qsa('a[href^="http"]').forEach((a) => {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
  });
})();
