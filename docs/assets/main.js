(function () {
  "use strict";

  var header = document.querySelector("[data-site-header]");
  var navToggle = document.querySelector("[data-nav-toggle]");
  var navMenu = document.querySelector("[data-nav-menu]");
  var yearNodes = document.querySelectorAll("[data-current-year]");
  var revealNodes = document.querySelectorAll(".reveal");
  var cardLinkNodes = document.querySelectorAll("[data-card-link]");
  var auroraCanvas = document.querySelector("[data-aurora]");
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var compactQuery = window.matchMedia("(max-width: 760px)");
  var coarseQuery = window.matchMedia("(pointer: coarse)");
  var tabletQuery = window.matchMedia("(max-width: 1024px)");
  var richViewportQuery = window.matchMedia("(min-width: 1440px)");
  var touchQuery = window.matchMedia("(pointer: coarse), (max-width: 760px)");
  var tierQueries = [motionQuery, compactQuery, coarseQuery, tabletQuery, richViewportQuery];
  var isLegalPage = Boolean(document.querySelector(".legal-background"));
  var visualTier = "static";
  var root = document.documentElement;
  var pointer = {
    x: 0.56,
    y: 0.34
  };

  function hasCanvasSupport() {
    return Boolean(auroraCanvas && auroraCanvas.getContext && window.requestAnimationFrame);
  }

  function isLowCapability() {
    var cores = navigator.hardwareConcurrency || 0;
    var memory = typeof navigator.deviceMemory === "number" ? navigator.deviceMemory : 4;

    return !hasCanvasSupport() || memory <= 2 || (cores > 0 && cores <= 4);
  }

  function isHighCapability() {
    var cores = navigator.hardwareConcurrency || 0;
    var memory = typeof navigator.deviceMemory === "number" ? navigator.deviceMemory : 4;
    var pixelRatio = window.devicePixelRatio || 1;

    return richViewportQuery.matches && cores >= 8 && memory >= 4 && pixelRatio <= 2.25;
  }

  function chooseVisualTier() {
    if (motionQuery.matches || isLegalPage || compactQuery.matches || coarseQuery.matches || !hasCanvasSupport()) {
      return "static";
    }

    if (tabletQuery.matches || isLowCapability()) {
      return "balanced";
    }

    return isHighCapability() ? "rich" : "balanced";
  }

  function applyVisualTier() {
    var nextTier = chooseVisualTier();

    if (nextTier === visualTier && document.body.classList.contains("visual-tier-" + nextTier)) {
      return false;
    }

    document.body.classList.remove("visual-tier-static", "visual-tier-balanced", "visual-tier-rich");
    document.body.classList.add("visual-tier-" + nextTier);
    visualTier = nextTier;

    return true;
  }

  function isVisualTier(tier) {
    return visualTier === tier;
  }

  function addTierChangeListener(callback) {
    tierQueries.forEach(function (query) {
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", callback);
      } else if (typeof query.addListener === "function") {
        query.addListener(callback);
      }
    });
  }

  applyVisualTier();

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
    document.body.classList.remove("nav-open");
  }

  function toggleNav() {
    if (!navToggle || !navMenu) {
      return;
    }

    var isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    navMenu.classList.toggle("is-open", !isOpen);
    document.body.classList.toggle("nav-open", !isOpen);
  }

  function setYear() {
    var year = String(new Date().getFullYear());
    yearNodes.forEach(function (node) {
      node.textContent = year;
    });
  }

  function setPointerGlow(event) {
    if (!event || typeof event.clientX !== "number" || typeof event.clientY !== "number") {
      return;
    }

    pointer.x = Math.max(0, Math.min(1, event.clientX / Math.max(1, window.innerWidth)));
    pointer.y = Math.max(0, Math.min(1, event.clientY / Math.max(1, window.innerHeight)));
    root.style.setProperty("--pointer-x", (pointer.x * 100).toFixed(2) + "%");
    root.style.setProperty("--pointer-y", (pointer.y * 100).toFixed(2) + "%");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function isNestedInteractiveElement(card, element) {
    var interactive = element.closest("a, button, input, textarea, select, summary, [role='button'], [role='link']");
    return Boolean(interactive && interactive !== card && card.contains(interactive));
  }

  function openCardLink(card) {
    var href = card.getAttribute("data-card-link");

    if (href) {
      window.location.href = href;
    }
  }

  function initCardLinks() {
    if (!cardLinkNodes.length) {
      return;
    }

    cardLinkNodes.forEach(function (card) {
      card.addEventListener("click", function (event) {
        if (event.target instanceof Element && isNestedInteractiveElement(card, event.target)) {
          return;
        }

        openCardLink(card);
      });
    });
  }

  function revealContent() {
    if (!revealNodes.length) {
      return;
    }

    if (touchQuery.matches) {
      revealNodes.forEach(function (node) {
        node.classList.add("is-visible");
      });
      return;
    }

    if (!("IntersectionObserver" in window)) {
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

  function initAurora() {
    if (!auroraCanvas) {
      return;
    }

    if (isVisualTier("static")) {
      auroraCanvas.setAttribute("data-visual-tier", "static");
    }

    var context = auroraCanvas.getContext("2d", { alpha: true });

    if (!context) {
      return;
    }

    var isLegal = Boolean(auroraCanvas.closest(".legal-background"));
    var width = 0;
    var height = 0;
    var dpr = 1;
    var frameId = 0;
    var particles = [];
    var staticFrameDrawn = false;
    var lastFrameTime = 0;
    var frameInterval = 1000 / 24;

    function shouldDisableAurora() {
      return isVisualTier("static");
    }

    function shouldUseStaticAurora() {
      return !isVisualTier("rich") || motionQuery.matches;
    }

    function particleCount() {
      var area = width * height;
      var divisor = isLegal ? 76000 : (isVisualTier("rich") ? 78000 : 92000);
      var min = isLegal ? 12 : (isVisualTier("rich") ? 18 : 14);
      var max = isLegal ? 22 : (isVisualTier("rich") ? 42 : 26);

      return Math.max(min, Math.min(max, Math.floor(area / divisor)));
    }

    function createParticle(index) {
      var phase = Math.random() * Math.PI * 2;

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (isLegal ? 0.11 : 0.2),
        vy: (Math.random() - 0.5) * (isLegal ? 0.08 : 0.16),
        phase: phase + index * 0.09,
        length: 12 + Math.random() * (isLegal ? 12 : 26),
        speed: 0.00022 + Math.random() * 0.00038,
        alpha: 0.18 + Math.random() * (isLegal ? 0.12 : 0.28)
      };
    }

    function resetParticles() {
      var count = particleCount();
      particles = [];

      for (var index = 0; index < count; index += 1) {
        particles.push(createParticle(index));
      }
    }

    function resizeCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, isVisualTier("rich") ? 1.35 : 1.15);
      width = Math.max(1, auroraCanvas.clientWidth || window.innerWidth);
      height = Math.max(1, auroraCanvas.clientHeight || window.innerHeight);
      auroraCanvas.width = Math.floor(width * dpr);
      auroraCanvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      resetParticles();
      staticFrameDrawn = false;
    }

    function clearCanvas() {
      context.clearRect(0, 0, width, height);
      staticFrameDrawn = false;
    }

    function drawBand(time, bandIndex, bandCount) {
      var baseY = height * (0.12 + bandIndex * (0.72 / Math.max(1, bandCount - 1)));
      var amplitude = height * (isLegal ? 0.028 : 0.052);
      var drift = (pointer.y - 0.5) * height * (isLegal ? 0.018 : 0.038);
      var gradient = context.createLinearGradient(0, 0, width, height);

      gradient.addColorStop(0, "rgba(120, 242, 211, 0)");
      gradient.addColorStop(0.18, "rgba(120, 242, 211, " + (isLegal ? 0.1 : 0.24) + ")");
      gradient.addColorStop(0.5, "rgba(124, 200, 255, " + (isLegal ? 0.08 : 0.22) + ")");
      gradient.addColorStop(0.76, "rgba(255, 230, 160, " + (isLegal ? 0.08 : 0.2) + ")");
      gradient.addColorStop(1, "rgba(120, 242, 211, 0)");

      context.beginPath();

      for (var x = -width * 0.12; x <= width * 1.12; x += Math.max(24, width / 32)) {
        var wave =
          Math.sin(x * 0.006 + time * (0.00032 + bandIndex * 0.000035) + bandIndex) * amplitude +
          Math.cos(x * 0.0022 - time * 0.00018 + bandIndex * 1.7) * amplitude * 0.62;
        var pointerPull = (pointer.x - 0.5) * Math.sin(x / Math.max(1, width) * Math.PI) * width * 0.018;
        var y = baseY + wave + drift + pointerPull;

        if (x <= -width * 0.11) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      context.strokeStyle = gradient;
      context.lineWidth = (isLegal ? 24 : 42) + bandIndex * (isLegal ? 1.4 : 2.8);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.filter = "blur(" + (isLegal ? 8 : (isVisualTier("rich") ? 12 : 9)) + "px)";
      context.globalAlpha = isLegal ? 0.34 : (isVisualTier("rich") ? 0.64 : 0.46);
      context.stroke();

      context.filter = "none";
      context.lineWidth = isLegal ? 0.55 : 0.9;
      context.globalAlpha = isLegal ? 0.16 : 0.32;
      context.strokeStyle = "rgba(226, 255, 248, 0.72)";
      context.stroke();
    }

    function drawParticles(time) {
      context.save();
      context.globalCompositeOperation = "screen";
      context.lineCap = "round";

      particles.forEach(function (particle) {
        var angle = Math.sin(time * particle.speed + particle.phase) * Math.PI;
        var px = particle.x + Math.cos(angle) * particle.length;
        var py = particle.y + Math.sin(angle) * particle.length * 0.36;

        particle.x += particle.vx + Math.cos(time * particle.speed + particle.phase) * 0.08;
        particle.y += particle.vy + Math.sin(time * particle.speed + particle.phase) * 0.05;

        if (particle.x < -40) {
          particle.x = width + 40;
        } else if (particle.x > width + 40) {
          particle.x = -40;
        }

        if (particle.y < -40) {
          particle.y = height + 40;
        } else if (particle.y > height + 40) {
          particle.y = -40;
        }

        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(px, py);
        context.strokeStyle = "rgba(190, 255, 238, " + particle.alpha + ")";
        context.lineWidth = isLegal ? 0.55 : 0.8;
        context.stroke();
      });

      context.restore();
    }

    function drawFrame(time) {
      context.clearRect(0, 0, width, height);
      context.save();
      context.globalCompositeOperation = "screen";

      var bandCount = isLegal ? 3 : (isVisualTier("rich") ? 5 : 4);
      for (var band = 0; band < bandCount; band += 1) {
        drawBand(time, band, bandCount);
      }

      drawParticles(time);
      context.restore();
    }

    function render(time) {
      if (document.hidden || shouldDisableAurora() || shouldUseStaticAurora()) {
        frameId = 0;
        return;
      }

      if (time - lastFrameTime >= frameInterval) {
        drawFrame(time);
        lastFrameTime = time;
      }

      frameId = window.requestAnimationFrame(render);
    }

    function drawStaticFrame() {
      if (staticFrameDrawn) {
        return;
      }

      drawFrame(1800);
      staticFrameDrawn = true;
    }

    function start() {
      if (shouldDisableAurora()) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
        clearCanvas();
        return;
      }

      if (shouldUseStaticAurora()) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
        drawStaticFrame();
        return;
      }

      if (!frameId && !document.hidden) {
        lastFrameTime = 0;
        frameId = window.requestAnimationFrame(render);
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      } else {
        start();
      }
    }

    function handleMotionChange() {
      applyVisualTier();
      staticFrameDrawn = false;
      auroraCanvas.setAttribute("data-visual-tier", visualTier);

      if (shouldDisableAurora()) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
        clearCanvas();
      } else if (shouldUseStaticAurora()) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
        drawStaticFrame();
      } else {
        start();
      }
    }

    resizeCanvas();
    auroraCanvas.setAttribute("data-visual-tier", visualTier);
    start();

    window.addEventListener("resize", function () {
      resizeCanvas();
      start();
    }, { passive: true });

    document.addEventListener("visibilitychange", handleVisibilityChange);

    addTierChangeListener(handleMotionChange);
  }

  function initScrollCinema() {
    if (!document.body.hasAttribute("data-art-page")) {
      return;
    }

    var scenes = Array.prototype.slice.call(document.querySelectorAll("[data-scene]"));
    var ticking = false;

    function setCinemaVariables(values) {
      Object.keys(values).forEach(function (name) {
        root.style.setProperty(name, values[name]);
      });
    }

    function setStaticCinema() {
      setCinemaVariables({
        "--scroll-progress": "0",
        "--scene-progress": "0",
        "--depth-shift": "0px",
        "--depth-reverse": "0px",
        "--scene-opacity": "0.54",
        "--scene-soft-opacity": "0.38",
        "--scene-plane-opacity": "0.28",
        "--scene-faint-opacity": "0.16",
        "--scene-curtain-opacity": "0.18",
        "--scene-curtain-soft-opacity": "0.12",
        "--cinema-scale": "1",
        "--card-drift": "0px",
        "--footer-glow": "0"
      });
    }

    function focusedSceneProgress() {
      if (!scenes.length) {
        return 0;
      }

      var viewportMidpoint = window.innerHeight * 0.52;
      var closestDistance = Infinity;
      var focus = 0;

      scenes.forEach(function (scene) {
        var rect = scene.getBoundingClientRect();
        var center = rect.top + rect.height * 0.5;
        var distance = Math.abs(center - viewportMidpoint);

        if (distance < closestDistance) {
          closestDistance = distance;
          focus = clamp(1 - distance / Math.max(1, window.innerHeight * 0.86), 0, 1);
        }
      });

      return focus;
    }

    function updateCinema() {
      ticking = false;

      if (motionQuery.matches || !isVisualTier("rich")) {
        setStaticCinema();
        return;
      }

      var documentRoot = document.documentElement;
      var documentBody = document.body;
      var scrollTop = window.pageYOffset || documentRoot.scrollTop || documentBody.scrollTop || 0;
      var scrollHeight = Math.max(documentRoot.scrollHeight, documentBody.scrollHeight);
      var maxScroll = Math.max(1, scrollHeight - window.innerHeight);
      var progress = clamp(scrollTop / maxScroll, 0, 1);
      var focus = focusedSceneProgress();
      var wave = Math.sin(progress * Math.PI);
      var isTouch = touchQuery.matches;
      var intensity = isTouch ? 0.48 : 1;
      var sceneOpacity = isTouch ? 0.5 + wave * 0.12 : 0.62 + wave * 0.24;
      var depth = Math.round((progress * 122 + wave * 42) * intensity);
      var reverseDepth = Math.round((-progress * 92 - wave * 28) * intensity);
      var cardDrift = Math.round((1 - focus) * 18 * intensity);
      var footerGlow = progress > 0.68 ? clamp((progress - 0.68) / 0.32, 0, 1) * (isTouch ? 0.58 : 1) : 0;

      setCinemaVariables({
        "--scroll-progress": progress.toFixed(4),
        "--scene-progress": focus.toFixed(4),
        "--depth-shift": depth + "px",
        "--depth-reverse": reverseDepth + "px",
        "--scene-opacity": sceneOpacity.toFixed(3),
        "--scene-soft-opacity": (sceneOpacity * 0.72).toFixed(3),
        "--scene-plane-opacity": (sceneOpacity * 0.62).toFixed(3),
        "--scene-faint-opacity": (sceneOpacity * 0.36).toFixed(3),
        "--scene-curtain-opacity": (sceneOpacity * 0.5).toFixed(3),
        "--scene-curtain-soft-opacity": (sceneOpacity * 0.32).toFixed(3),
        "--cinema-scale": (1 + wave * 0.025 * intensity).toFixed(4),
        "--card-drift": cardDrift + "px",
        "--footer-glow": footerGlow.toFixed(3)
      });
    }

    function requestCinemaUpdate() {
      if (document.hidden) {
        updateCinema();
        return;
      }

      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateCinema);
      }
    }

    var scrollCinemaActive = false;

    function enableCinema() {
      if (scrollCinemaActive) {
        requestCinemaUpdate();
        return;
      }

      scrollCinemaActive = true;
      document.body.classList.add("is-scroll-cinema");
      updateCinema();
      window.addEventListener("scroll", requestCinemaUpdate, { passive: true });
      window.addEventListener("resize", requestCinemaUpdate, { passive: true });
    }

    function disableCinema() {
      if (scrollCinemaActive) {
        window.removeEventListener("scroll", requestCinemaUpdate);
        window.removeEventListener("resize", requestCinemaUpdate);
      }

      scrollCinemaActive = false;
      ticking = false;
      document.body.classList.remove("is-scroll-cinema");
      setStaticCinema();
    }

    function syncCinemaTier() {
      applyVisualTier();

      if (isVisualTier("rich")) {
        enableCinema();
      } else {
        disableCinema();
      }
    }

    syncCinemaTier();
    addTierChangeListener(syncCinemaTier);
  }

  setYear();
  setHeaderState();
  initCardLinks();
  revealContent();
  initAurora();
  initScrollCinema();

  window.addEventListener("scroll", requestHeaderState, { passive: true });
  window.addEventListener("pointermove", function (event) {
    if (isVisualTier("rich")) {
      setPointerGlow(event);
    }
  }, { passive: true });

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
