(() => {
  const form = document.querySelector("form[data-signup]");
  const done = document.querySelector(".join__done");
  if (!form) return;

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (form.classList.contains("is-busy")) return;
    form.parentNode.querySelector(".signup__error")?.remove();
    form.classList.add("is-busy");
    try {
      const res = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(String(res.status));
      form.hidden = true;
      done.hidden = false;
      done.focus({ preventScroll: true });
      if (window.fbq) fbq("track", "Lead");
      if (window.gtag) gtag("event", "generate_lead", { form_location: "Squeeze page" });
    } catch (err) {
      const p = document.createElement("p");
      p.className = "signup__error";
      p.setAttribute("role", "alert");
      p.textContent = "That didn't go through. Please check your connection and try again.";
      form.after(p);
    } finally {
      form.classList.remove("is-busy");
    }
  });
})();
