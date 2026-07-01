(function () {
  function revealOnScroll() {
    const targets = document.querySelectorAll(".card, .module-card, .hero, .grid > *");
    let delay = 0;
    targets.forEach((el) => {
      if (el.classList.contains("reveal")) return;
      el.classList.add("reveal");
      el.style.transitionDelay = `${Math.min(delay, 8) * 60}ms`;
      delay++;
    });

    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("in-view"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    targets.forEach((el) => observer.observe(el));
  }

  document.addEventListener("DOMContentLoaded", () => {
    requestAnimationFrame(() => document.body.classList.add("loaded"));
    revealOnScroll();
  });

  window.refreshMotion = revealOnScroll;
})();
