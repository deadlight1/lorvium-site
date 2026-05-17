const root = document.documentElement;
const body = document.body;
const header = document.querySelector("[data-site-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navMenu = document.querySelector("[data-nav-menu]");
const yearNodes = document.querySelectorAll("[data-current-year]");
const revealNodes = document.querySelectorAll(".reveal");
const cardLinkNodes = document.querySelectorAll("[data-card-link]");
const mailLinkNodes = document.querySelectorAll("a[href^='mailto:']");
const pageLoader = document.querySelector("[data-page-loader]");
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const compactQuery = window.matchMedia("(max-width: 760px)");
const coarseQuery = window.matchMedia("(pointer: coarse)");
const loaderStartedAt = Date.now();

function chooseVisualMode() {
  if (motionQuery.matches || compactQuery.matches || coarseQuery.matches || document.querySelector(".legal-background")) {
    return "static";
  }

  return "balanced";
}

function applyVisualMode() {
  const visualMode = chooseVisualMode();

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

// === wow loader (canvas) ===

const LOADER_SEEN_KEY = "lorvium-loader-v1";

function readToken(name, fallback) {
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  return raw || fallback;
}

function hasSeenLoader() {
  try {
    return window.sessionStorage.getItem(LOADER_SEEN_KEY) === "1";
  } catch (error) {
    return false;
  }
}

function markLoaderSeen() {
  try {
    window.sessionStorage.setItem(LOADER_SEEN_KEY, "1");
  } catch (error) {
    /* privacy mode — ignore */
  }
}

function dismissLoader(holdMs) {
  root.classList.add("is-loaded");
  window.setTimeout(function () {
    root.classList.add("loader-done");
    if (pageLoader && pageLoader.parentNode) {
      pageLoader.parentNode.removeChild(pageLoader);
    }
  }, holdMs);
}

const BRAND_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' +
  '<path d="M173 126h62v199h126v58H173z" fill="#fff"/>' +
  '<path d="M282 126h84L282 232z" fill="#fff"/>' +
  "</svg>";

function fallbackBrandTargets() {
  const pts = [];
  for (let y = 126; y <= 384; y += 7) {
    for (let x = 173; x <= 366; x += 7) {
      const inLBody = x >= 173 && x <= 235 && y >= 126 && y <= 384;
      const inLFoot = x >= 235 && x <= 361 && y >= 325 && y <= 384;
      const inTri = x >= 282 && x <= 366 && y >= 126 && y <= 232 - ((x - 282) * (232 - 126)) / 84;
      if (inLBody || inLFoot || inTri) {
        pts.push({ x: x / 512 - 0.5, y: y / 512 - 0.5 });
      }
    }
  }
  return pts;
}

function sampleBrandTargets(size) {
  return new Promise(function (resolve) {
    const url = "data:image/svg+xml;base64," + window.btoa(BRAND_SVG);
    const img = new Image();
    const fail = function () {
      resolve(fallbackBrandTargets());
    };
    img.onload = function () {
      try {
        const off = document.createElement("canvas");
        off.width = size;
        off.height = size;
        const ctx = off.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const points = [];
        const stride = 5;
        for (let y = 0; y < size; y += stride) {
          for (let x = 0; x < size; x += stride) {
            if (data[(y * size + x) * 4 + 3] > 200) {
              points.push({ x: x / size - 0.5, y: y / size - 0.5 });
            }
          }
        }
        resolve(points.length ? points : fallbackBrandTargets());
      } catch (error) {
        fail();
      }
    };
    img.onerror = fail;
    img.src = url;
  });
}

function makeParticleSprite(color, baseSize) {
  const radius = Math.ceil(baseSize * 6);
  const sprite = document.createElement("canvas");
  sprite.width = radius * 2;
  sprite.height = radius * 2;
  const ctx = sprite.getContext("2d");
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = radius * 0.75;
  ctx.beginPath();
  ctx.arc(radius, radius, baseSize, 0, Math.PI * 2);
  ctx.fill();
  return sprite;
}

function runWowLoader(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.resolve();
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  ctx.scale(dpr, dpr);

  const centerX = cssW / 2;
  const centerY = cssH / 2;
  const markSize = Math.min(420, cssW * 0.6, cssH * 0.7);
  const count = compactQuery.matches ? 180 : 320;

  const palette = [
    readToken("--accent-cool", "#78f2d3"),
    readToken("--accent", "#d9c47a"),
    readToken("--accent-strong", "#ffe6a0"),
    readToken("--accent-blue", "#7cc8ff"),
  ];

  const sprites = palette.map(function (c) {
    return makeParticleSprite(c, 1.8);
  });

  return sampleBrandTargets(220).then(function (points) {
    if (!points.length) {
      points = fallbackBrandTargets();
    }

    const particles = [];
    const startR = Math.hypot(cssW, cssH) * 0.55;
    for (let i = 0; i < count; i++) {
      const target = points[Math.floor(Math.random() * points.length)];
      const angle = Math.random() * Math.PI * 2;
      const r = startR * (0.85 + Math.random() * 0.4);
      const roll = Math.random();
      let palIdx;
      if (roll < 0.55) palIdx = 0;
      else if (roll < 0.8) palIdx = 1;
      else if (roll < 0.92) palIdx = 2;
      else palIdx = 3;

      const tx = centerX + target.x * markSize;
      const ty = centerY + target.y * markSize;
      const dx = tx - centerX;
      const dy = ty - centerY;
      const d = Math.hypot(dx, dy) || 1;

      particles.push({
        ox: centerX + Math.cos(angle) * r,
        oy: centerY + Math.sin(angle) * r,
        tx: tx,
        ty: ty,
        x: 0,
        y: 0,
        scale: 0.65 + Math.random() * 0.95,
        palIdx: palIdx,
        delay: Math.random() * 220,
        phase: Math.random() * Math.PI * 2,
        bdx: dx / d,
        bdy: dy / d,
      });
    }

    const BUILD_END = 700;
    const HOLD_END = 1100;
    const BLOOM_END = 1400;

    return new Promise(function (resolve) {
      const startedAt = performance.now();

      function frame(now) {
        const t = now - startedAt;

        // trail fade
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fillRect(0, 0, cssW, cssH);
        ctx.globalCompositeOperation = "lighter";

        let bloomT = 0;
        if (t > HOLD_END) {
          bloomT = Math.min(1, (t - HOLD_END) / (BLOOM_END - HOLD_END));
        }

        // expanding glow rings (build-end through bloom)
        if (t > BUILD_END - 200 && t < BLOOM_END) {
          for (let r = 0; r < 3; r++) {
            const phase = ((t - (BUILD_END - 200)) / 520 + r / 3) % 1;
            const radius = markSize * 0.18 + phase * markSize * 0.7;
            const alpha = (1 - phase) * 0.32 * (1 - bloomT * 0.6);
            if (alpha <= 0) continue;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = palette[0];
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }

        // particles
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const local = Math.max(0, t - p.delay);
          let x;
          let y;
          let alpha;

          if (local < BUILD_END && t < BUILD_END) {
            const k = Math.min(1, local / (BUILD_END - 80));
            const e = 1 - Math.pow(1 - k, 3);
            x = p.ox + (p.tx - p.ox) * e;
            y = p.oy + (p.ty - p.oy) * e;
            alpha = Math.min(1, k * 1.8);
          } else if (t < HOLD_END) {
            const drift = Math.sin(t / 220 + p.phase) * 1.4;
            const drift2 = Math.cos(t / 280 + p.phase * 1.3) * 1.4;
            x = p.tx + drift;
            y = p.ty + drift2;
            alpha = 1;
          } else {
            const burst = Math.pow(bloomT, 1.4) * 220;
            x = p.tx + p.bdx * burst;
            y = p.ty + p.bdy * burst;
            alpha = Math.max(0, 1 - bloomT * 1.1);
          }

          p.x = x;
          p.y = y;

          if (alpha <= 0) continue;
          const sprite = sprites[p.palIdx];
          const sw = sprite.width * p.scale;
          const sh = sprite.height * p.scale;
          ctx.globalAlpha = alpha;
          ctx.drawImage(sprite, x - sw / 2, y - sh / 2, sw, sh);
        }
        ctx.globalAlpha = 1;

        // proximity lines during HOLD
        if (t >= BUILD_END && t < HOLD_END + 80) {
          const maxDist = 28;
          const cellSize = maxDist;
          const grid = new Map();
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const cx = Math.floor(p.x / cellSize);
            const cy = Math.floor(p.y / cellSize);
            const key = cx * 8192 + cy;
            const arr = grid.get(key);
            if (arr) arr.push(i);
            else grid.set(key, [i]);
          }
          ctx.strokeStyle = palette[0];
          ctx.lineWidth = 0.5;
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const cx = Math.floor(p.x / cellSize);
            const cy = Math.floor(p.y / cellSize);
            for (let dxg = -1; dxg <= 1; dxg++) {
              for (let dyg = -1; dyg <= 1; dyg++) {
                const arr = grid.get((cx + dxg) * 8192 + (cy + dyg));
                if (!arr) continue;
                for (let j = 0; j < arr.length; j++) {
                  const k = arr[j];
                  if (k <= i) continue;
                  const q = particles[k];
                  const ddx = p.x - q.x;
                  const ddy = p.y - q.y;
                  const dist = Math.hypot(ddx, ddy);
                  if (dist < maxDist) {
                    ctx.globalAlpha = (1 - dist / maxDist) * 0.35;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    ctx.stroke();
                  }
                }
              }
            }
          }
          ctx.globalAlpha = 1;
        }

        if (t < BLOOM_END) {
          window.requestAnimationFrame(frame);
        } else {
          resolve();
        }
      }

      window.requestAnimationFrame(frame);
    });
  });
}

function initPageLoader() {
  if (!pageLoader || !root.classList.contains("has-js")) {
    return;
  }

  const canvas = pageLoader.querySelector("[data-loader-canvas]");
  const skipWow = motionQuery.matches || hasSeenLoader() || !canvas || !canvas.getContext;

  if (skipWow) {
    const minVisible = motionQuery.matches ? 80 : 200;
    let fired = false;
    function startFade() {
      if (fired) return;
      fired = true;
      const elapsed = Date.now() - loaderStartedAt;
      window.setTimeout(function () {
        dismissLoader(motionQuery.matches ? 140 : 320);
      }, Math.max(0, minVisible - elapsed));
    }
    if (document.readyState === "complete") {
      startFade();
    } else {
      window.addEventListener("load", startFade, { once: true });
    }
    window.setTimeout(startFade, 600);
    return;
  }

  let done = false;
  function finish() {
    if (done) return;
    done = true;
    markLoaderSeen();
    dismissLoader(520);
  }

  runWowLoader(canvas).then(finish, finish);
  // safety net in case the scene gets stuck
  window.setTimeout(finish, 3200);
}

function setHeaderState() {
  if (!header) {
    return;
  }

  header.classList.toggle("is-scrolled", window.scrollY > 8);
}

let headerTicking = false;

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

  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!isOpen));
  navMenu.classList.toggle("is-open", !isOpen);
  body.classList.toggle("nav-open", !isOpen);
}

function setYear() {
  const year = String(new Date().getFullYear());

  yearNodes.forEach(function (node) {
    node.textContent = year;
  });
}

function isNestedInteractiveElement(card, element) {
  const interactive = element.closest("a, button, input, textarea, select, summary, [role='button'], [role='link']");

  return Boolean(interactive && interactive !== card && card.contains(interactive));
}

function initCardLinks() {
  cardLinkNodes.forEach(function (card) {
    card.addEventListener("click", function (event) {
      if (event.target instanceof Element && isNestedInteractiveElement(card, event.target)) {
        return;
      }

      const href = card.getAttribute("data-card-link");

      if (href) {
        window.location.href = href;
      }
    });
  });
}

function getMailAddress(link) {
  const href = link.getAttribute("href") || "";
  const rawAddress = href.replace(/^mailto:/i, "").split("?")[0].trim();

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

  const input = document.createElement("textarea");
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

  const selection = window.getSelection();
  const range = document.createRange();
  const node = document.createElement("span");
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

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

let copyResetTimer = 0;
let toastResetTimer = 0;
let activeCopyLink = null;
let copyToast = null;

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
  const toast = getCopyToast();
  const targetRect = target.getBoundingClientRect();

  toast.textContent = message;
  toast.classList.add("is-visible");

  const toastRect = toast.getBoundingClientRect();
  let left = targetRect.left + targetRect.width / 2 - toastRect.width / 2;
  let top = targetRect.top - toastRect.height - 10;

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
    const email = getMailAddress(link);

    if (!shouldCopyMailLink(link, email)) {
      return;
    }

    link.dataset.copyEnhanced = "true";

    const copyTarget = document.createElement("button");
    copyTarget.type = "button";
    copyTarget.className = (link.className ? link.className + " " : "") + "email-copy-link";
    copyTarget.innerHTML = link.innerHTML;
    copyTarget.setAttribute("aria-label", "Copy " + email);
    copyTarget.setAttribute("title", "Copy email address");
    link.parentNode.replaceChild(copyTarget, link);

    let copyStartedAt = 0;

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

  const observer = new IntersectionObserver(
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
