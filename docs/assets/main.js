(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var header = document.querySelector("[data-site-header]");
  var navToggle = document.querySelector("[data-nav-toggle]");
  var navMenu = document.querySelector("[data-nav-menu]");
  var yearNodes = document.querySelectorAll("[data-current-year]");
  var revealNodes = document.querySelectorAll(".reveal");
  var cardLinkNodes = document.querySelectorAll("[data-card-link]");
  var pageLoader = document.querySelector("[data-page-loader]");
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var compactQuery = window.matchMedia("(max-width: 760px)");
  var coarseQuery = window.matchMedia("(pointer: coarse)");
  var loaderStartedAt = Date.now();

  function chooseVisualMode() {
    if (motionQuery.matches || compactQuery.matches || coarseQuery.matches || document.querySelector(".legal-background")) {
      return "static";
    }

    return "balanced";
  }

  function applyVisualMode() {
    var visualMode = chooseVisualMode();

    body.classList.remove("visual-tier-static", "visual-tier-balanced");
    body.classList.add("visual-tier-" + visualMode);
  }

  function addModeChangeListener(callback) {
    [motionQuery, compactQuery, coarseQuery].forEach(function (query) {
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", callback);
      } else if (typeof query.addListener === "function") {
        query.addListener(callback);
      }
    });
  }

  function initPageLoader() {
    if (!pageLoader || !root.classList.contains("has-js")) {
      return;
    }

    var isFinished = false;
    var minVisibleTime = motionQuery.matches ? 80 : 450;
    var removeDelay = motionQuery.matches ? 140 : 560;

    function finishLoader() {
      if (isFinished) {
        return;
      }

      isFinished = true;
      root.classList.add("is-loaded");

      window.setTimeout(function () {
        root.classList.add("loader-done");

        if (pageLoader.parentNode) {
          pageLoader.parentNode.removeChild(pageLoader);
        }
      }, removeDelay);
    }

    function requestFinish() {
      var elapsed = Date.now() - loaderStartedAt;
      var delay = Math.max(0, minVisibleTime - elapsed);

      window.setTimeout(finishLoader, delay);
    }

    if (document.readyState === "complete") {
      requestFinish();
    } else {
      window.addEventListener("load", requestFinish, { once: true });
    }

    window.setTimeout(requestFinish, 1400);
  }

  function setHeaderState() {
    if (!header) {
      return;
    }

    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  var headerTicking = false;

  function requestHeaderState() {
    if (headerTicking) {
      return;
    }

    headerTicking = true;
    window.requestAnimationFrame(function () {
      headerTicking = false;
      setHeaderState();
    });
  }

  function closeNav() {
    if (!navToggle || !navMenu) {
      return;
    }

    navToggle.setAttribute("aria-expanded", "false");
    navMenu.classList.remove("is-open");
    body.classList.remove("nav-open");
  }

  function toggleNav() {
    if (!navToggle || !navMenu) {
      return;
    }

    var isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    navMenu.classList.toggle("is-open", !isOpen);
    body.classList.toggle("nav-open", !isOpen);
  }

  function setYear() {
    var year = String(new Date().getFullYear());

    yearNodes.forEach(function (node) {
      node.textContent = year;
    });
  }

  function isNestedInteractiveElement(card, element) {
    var interactive = element.closest("a, button, input, textarea, select, summary, [role='button'], [role='link']");

    return Boolean(interactive && interactive !== card && card.contains(interactive));
  }

  function initCardLinks() {
    cardLinkNodes.forEach(function (card) {
      card.addEventListener("click", function (event) {
        if (event.target instanceof Element && isNestedInteractiveElement(card, event.target)) {
          return;
        }

        var href = card.getAttribute("data-card-link");

        if (href) {
          window.location.href = href;
        }
      });
    });
  }

  function revealContent() {
    if (!revealNodes.length) {
      return;
    }

    if (compactQuery.matches || coarseQuery.matches || !("IntersectionObserver" in window)) {
      revealNodes.forEach(function (node) {
        node.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );

    revealNodes.forEach(function (node) {
      observer.observe(node);
    });
  }

  applyVisualMode();
  initPageLoader();
  setYear();
  setHeaderState();
  initCardLinks();
  revealContent();
  addModeChangeListener(applyVisualMode);

  window.addEventListener("scroll", requestHeaderState, { passive: true });

  if (navToggle) {
    navToggle.addEventListener("click", toggleNav);
  }

  if (navMenu) {
    navMenu.addEventListener("click", function (event) {
      if (event.target instanceof HTMLAnchorElement) {
        closeNav();
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeNav();
    }
  });
})();
