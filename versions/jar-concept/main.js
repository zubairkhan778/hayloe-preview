(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Nav picks up a hairline once the page moves */
  const nav = document.getElementById("nav");
  const bar = document.getElementById("nav-bar");
  const halo = nav.querySelector(".nav__halo");

  /* Mobile menu */
  const burger = nav.querySelector(".nav__burger");
  const menu = document.getElementById("nav-menu");
  const mobile = window.matchMedia("(max-width: 900px)");
  const setMenu = (open) => {
    menu.hidden = !open;
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  burger.addEventListener("click", () => {
    const open = menu.hidden;
    setMenu(open);
    if (open) { openedAt = window.scrollY; menu.querySelector("a").focus({ preventScroll: true }); }
  });
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("click", (e) => { if (!menu.hidden && !nav.contains(e.target)) setMenu(false); });
  mobile.addEventListener("change", () => setMenu(false));

  const TOP = 160;          // above this the full bar always shows
  const RETUCK = 90;        // after opening it from the halo, tuck away again after this much scrolling
  let collapsed = false, openedAt = null, lastY = window.scrollY;

  const setCollapsed = (on) => {
    if (on === collapsed) return;
    collapsed = on;
    nav.classList.toggle("is-collapsed", on);
    halo.setAttribute("aria-expanded", String(!on));
    halo.tabIndex = on ? 0 : -1;
    bar.inert = on;
    if (on) { openedAt = null; if (menu && !menu.hidden) setMenu(false); }
  };

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("is-stuck", y > 8);
    if (y < TOP) { setCollapsed(false); openedAt = null; }
    else if (openedAt !== null) { if (Math.abs(y - openedAt) > RETUCK) setCollapsed(true); }
    else if (y - lastY > 4) setCollapsed(true);
    lastY = y;
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });


  halo.addEventListener("click", () => {
    setCollapsed(false);
    openedAt = window.scrollY;
    if (mobile.matches) { setMenu(true); menu.querySelector("a").focus({ preventScroll: true }); }
    else bar.querySelector("a").focus({ preventScroll: true });
  });
  bar.addEventListener("click", (e) => {
    if (e.target.closest("a") && window.scrollY >= TOP) openedAt = window.scrollY;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!menu.hidden) { setMenu(false); burger.focus(); }
    else if (openedAt !== null && window.scrollY >= TOP) { setCollapsed(true); halo.focus(); }
  });

  /* Keep the halo over the nav link for the section in view */
  const links = [...document.querySelectorAll(".nav__links a, .nav__menu nav a")];
  const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const mine = links.filter((a) => a.getAttribute("href") === "#" + e.target.id);
        if (e.isIntersecting) { links.forEach((a) => a.removeAttribute("aria-current")); mine.forEach((a) => a.setAttribute("aria-current", "true")); }
        else mine.forEach((a) => a.removeAttribute("aria-current"));
      }
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  /* Reveal on scroll, staggered within each group */
  const groups = [
    ".hero__copy > *",
    ".inside__copy > *",
    ".benefits li",
    ".label__copy > *, .panel",
    ".story__copy > .h2, .story__copy > .body-lg, .value",
    ".joy__title, .ph",
    ".faq__head, details",
    ".join__inner > *",
  ];
  if (!reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    for (const sel of groups) {
      document.querySelectorAll(sel).forEach((el, i) => {
        el.setAttribute("data-reveal", "");
        el.style.setProperty("--d", `${Math.min(i, 6) * 0.07}s`);
        io.observe(el);
      });
    }
  }

  /* The label ribbon: the tagline drifts along the wave, a touch faster while scrolling */
  const tp = document.getElementById("ribbon-tp");
  if (tp && !reduceMotion) {
    const text = tp.parentNode;
    let loop = 0, offset = 0, boost = 0, lastY = window.scrollY, visible = true;
    const measure = () => { loop = text.getComputedTextLength() / 3; };
    document.fonts ? document.fonts.ready.then(measure) : measure();
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(text.closest(".ribbon"));
    window.addEventListener("scroll", () => {
      boost = Math.min(boost + Math.abs(window.scrollY - lastY) * 0.04, 6);
      lastY = window.scrollY;
    }, { passive: true });
    const tick = () => {
      if (visible && loop) {
        offset -= 0.6 + boost;
        if (offset < -loop) offset += loop;
        tp.setAttribute("startOffset", offset.toFixed(1));
      }
      boost *= 0.92;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* Early access forms (Formspree) */
  document.querySelectorAll("form[data-signup]").forEach((form) => {
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (form.classList.contains("is-busy")) return;
      form.querySelector(".signup__error")?.remove();
      form.classList.add("is-busy");
      try {
        const res = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(String(res.status));
        form.classList.add("is-done");
        const done = form.querySelector(".signup__done");
        done.hidden = false;
        done.setAttribute("tabindex", "-1");
        done.focus({ preventScroll: true });
        if (window.fbq) fbq("track", "Lead");
        if (window.gtag) gtag("event", "generate_lead", { form_location: form.querySelector('[name="Source"]')?.value });
      } catch (err) {
        const p = document.createElement("p");
        p.className = "signup__error";
        p.setAttribute("role", "alert");
        p.textContent = "That didn't go through. Please check your connection and try again.";
        form.querySelector(".signup__note").before(p);
      } finally {
        form.classList.remove("is-busy");
      }
    });
  });
})();
