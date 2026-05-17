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
  var mailLinkNodes = document.querySelectorAll("a[href^='mailto:']");
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

  function getMailAddress(link) {
    var href = link.getAttribute("href") || "";
    var rawAddress = href.replace(/^mailto:/i, "").split("?")[0].trim();

    try {
      return decodeURIComponent(rawAddress);
    } catch (error) {
      return rawAddress;
    }
  }

  function shouldCopyMailLink(link, email) {
    if (!email || link.dataset.copyEnhanced === "true") {
      return false;
    }

    return link.classList.contains("contact-row") || (link.textContent || "").indexOf("@") !== -1;
  }

  function canUseClipboardApi() {
    return Boolean(
      window.navigator &&
        window.navigator.clipboard &&
        typeof window.navigator.clipboard.writeText === "function"
    );
  }

  function copyWithTextarea(text) {
    if (typeof document.execCommand !== "function") {
      return false;
    }

    var input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.setAttribute("aria-hidden", "true");
    input.style.position = "fixed";
    input.style.left = "0";
    input.style.top = "0";
    input.style.width = "1px";
    input.style.height = "1px";
    input.style.padding = "0";
    input.style.border = "0";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";
    input.style.fontSize = "16px";
    body.appendChild(input);
    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);

    try {
      return document.execCommand("copy");
    } catch (error) {
      return false;
    } finally {
      body.removeChild(input);
    }
  }

  function copyWithSelection(text) {
    if (typeof document.execCommand !== "function" || typeof window.getSelection !== "function") {
      return false;
    }

    var selection = window.getSelection();
    var range = document.createRange();
    var node = document.createElement("span");
    node.textContent = text;
    node.setAttribute("aria-hidden", "true");
    node.style.position = "fixed";
    node.style.left = "0";
    node.style.top = "0";
    node.style.opacity = "0";
    node.style.pointerEvents = "none";
    body.appendChild(node);
    range.selectNodeContents(node);

    try {
      selection.removeAllRanges();
      selection.addRange(range);
      return document.execCommand("copy");
    } catch (error) {
      return false;
    } finally {
      selection.removeAllRanges();
      body.removeChild(node);
    }
  }

  function writeClipboardText(text) {
    if (copyWithTextarea(text) || copyWithSelection(text)) {
      return Promise.resolve();
    }

    if (canUseClipboardApi()) {
      return window.navigator.clipboard.writeText(text);
    }

    return Promise.reject(new Error("copy unavailable"));
  }

  function selectTextNode(node) {
    if (typeof window.getSelection !== "function") {
      return;
    }

    var selection = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  var copyResetTimer = 0;
  var toastResetTimer = 0;
  var activeCopyLink = null;
  var copyToast = null;

  function getCopyToast() {
    if (copyToast) {
      return copyToast;
    }

    copyToast = document.createElement("div");
    copyToast.className = "email-copy-toast";
    copyToast.setAttribute("role", "status");
    copyToast.setAttribute("aria-live", "polite");
    body.appendChild(copyToast);

    return copyToast;
  }

  function showCopyToast(target, message) {
    var toast = getCopyToast();
    var targetRect = target.getBoundingClientRect();

    toast.textContent = message;
    toast.classList.add("is-visible");

    var toastRect = toast.getBoundingClientRect();
    var left = targetRect.left + targetRect.width / 2 - toastRect.width / 2;
    var top = targetRect.top - toastRect.height - 10;

    left = Math.max(12, Math.min(window.innerWidth - toastRect.width - 12, left));

    if (top < 12) {
      top = targetRect.bottom + 10;
    }

    toast.style.left = left + "px";
    toast.style.top = Math.max(12, top) + "px";

    window.clearTimeout(toastResetTimer);
    toastResetTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 1600);
  }

  function initMailCopy() {
    mailLinkNodes.forEach(function (link) {
      var email = getMailAddress(link);

      if (!shouldCopyMailLink(link, email)) {
        return;
      }

      link.dataset.copyEnhanced = "true";

      var copyTarget = document.createElement("button");
      copyTarget.type = "button";
      copyTarget.className = (link.className ? link.className + " " : "") + "email-copy-link";
      copyTarget.innerHTML = link.innerHTML;
      copyTarget.setAttribute("aria-label", "Copy " + email);
      copyTarget.setAttribute("title", "Copy email address");
      link.parentNode.replaceChild(copyTarget, link);

      var copyStartedAt = 0;

      function copyEmail(event) {
        event.preventDefault();
        copyStartedAt = Date.now();

        writeClipboardText(email)
          .then(function () {
            window.clearTimeout(copyResetTimer);
            if (activeCopyLink && activeCopyLink !== copyTarget) {
              activeCopyLink.classList.remove("is-copied");
            }
            activeCopyLink = copyTarget;
            copyTarget.classList.add("is-copied");
            showCopyToast(copyTarget, "Email copied");
            copyResetTimer = window.setTimeout(function () {
              copyTarget.classList.remove("is-copied");
              if (activeCopyLink === copyTarget) {
                activeCopyLink = null;
              }
            }, 1600);
          })
          .catch(function () {
            selectTextNode(copyTarget);
            showCopyToast(copyTarget, "Press Ctrl+C to copy");
          });
      }

      copyTarget.addEventListener("pointerdown", function (event) {
        if (typeof event.button === "number" && event.button !== 0) {
          return;
        }

        copyEmail(event);
      });

      copyTarget.addEventListener("click", function (event) {
        event.preventDefault();

        if (Date.now() - copyStartedAt > 600) {
          copyEmail(event);
        }
      });

      copyTarget.addEventListener("keydown", function (event) {
        if (event.key === " " || event.key === "Enter") {
          copyEmail(event);
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
  initMailCopy();
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
