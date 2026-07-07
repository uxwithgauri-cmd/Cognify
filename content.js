const STORAGE_KEY = "cognifySettings";
const PROFILE_KEY = "cognifyProfile";
const STYLE_ID = "cognify-styles";
const SUMMARY_BOX_ID = "cognify-summary-box";
const COLOUR_STYLE_ID = "cognify-colour";
const FONT_STYLE_ID = "cognify-font";
const FONT_SELECTORS = "p, h1, h2, h3, h4, h5, li, span, a, td, div";
const LEXEND_FONT_URL = chrome.runtime.getURL('fonts/Lexend.woff2');

function applyFont(font) {
  let fontEl = document.getElementById(FONT_STYLE_ID);

  if (font === "default") {
    if (fontEl) {
      fontEl.remove();
    }
    return;
  }

  if (!fontEl) {
    fontEl = document.createElement("style");
    fontEl.id = FONT_STYLE_ID;
    document.head.appendChild(fontEl);
  }

  if (font === "dyslexia") {
    fontEl.textContent = "@font-face { font-family: Lexend; src: url('" + LEXEND_FONT_URL + "') format('woff2'); font-display: swap; } " + FONT_SELECTORS + " { font-family: 'Lexend', sans-serif !important; }";
  } else if (font === "serif") {
    fontEl.textContent = `
      ${FONT_SELECTORS} {
        font-family: Georgia, 'Times New Roman', serif !important;
      }
    `;
  }
}

function applyColourMode(mode) {
  let colourEl = document.getElementById(COLOUR_STYLE_ID);

  if (mode === "normal") {
    if (colourEl) {
      colourEl.remove();
    }
    return;
  }

  if (!colourEl) {
    colourEl = document.createElement("style");
    colourEl.id = COLOUR_STYLE_ID;
    document.head.appendChild(colourEl);
  }

  if (mode === "highcontrast") {
    colourEl.textContent =
      "html { filter: invert(1) hue-rotate(180deg) !important; }";
  } else if (mode === "warm") {
    colourEl.textContent =
      "html { filter: sepia(40%) brightness(105%) !important; }";
  }
}

let focusModeMouseHandler = null;

function setupFocusModeInteraction() {
  if (focusModeMouseHandler) return;

  const navEls = Array.from(document.querySelectorAll("nav, header, [role='navigation']"));
  navEls.forEach(el => {
    el.style.opacity = "0.12";
    el.style.transform = "scale(0.98)";
    el.style.transition = "all 0.3s ease";
    el.dataset.cognifyFocusManaged = "true";
  });

  window.cognifyFocusPeekHandler = (event) => {
    const els = document.querySelectorAll("[data-cognify-focus-managed]");
    if (event.clientY < 80) {
      els.forEach(el => { el.style.opacity = "1"; el.style.transform = "none"; });
    } else {
      els.forEach(el => { el.style.opacity = "0.12"; el.style.transform = "scale(0.98)"; });
    }
  };

  focusModeMouseHandler = window.cognifyFocusPeekHandler;
  document.addEventListener("mousemove", focusModeMouseHandler, { passive: true });
}

function teardownFocusModeInteraction() {
  if (focusModeMouseHandler) {
    document.removeEventListener("mousemove", focusModeMouseHandler);
    focusModeMouseHandler = null;
    window.cognifyFocusPeekHandler = null;
  }
  document.querySelectorAll("[data-cognify-focus-managed]").forEach(el => {
    el.style.opacity = "";
    el.style.transform = "";
    el.style.transition = "";
    delete el.dataset.cognifyFocusManaged;
  });
  document.body.classList.remove("cognify-focus-mode", "cognify-focus-reveal");
}

function applySettings(settings) {
  const {
    fontSize,
    lineHeight,
    letterSpacing,
    focusMode,
    colourMode = "normal",
  } = settings;

  let styleEl = document.getElementById(STYLE_ID);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }

  if (focusMode) {
    document.body.classList.add("cognify-focus-mode");
    setupFocusModeInteraction();
  } else {
    teardownFocusModeInteraction();
    restoreFocusModeElements();
  }

  const focusRules = focusMode
    ? `
      body.cognify-focus-mode nav,
      body.cognify-focus-mode header {
        opacity: 0.15 !important;
        transform: scale(0.98) !important;
        transition: opacity 0.3s ease, transform 0.3s ease !important;
      }
      body.cognify-focus-mode.cognify-focus-reveal nav,
      body.cognify-focus-mode.cognify-focus-reveal header {
        opacity: 1 !important;
        transform: none !important;
      }
      body.cognify-focus-mode aside,
      body.cognify-focus-mode footer,
      body.cognify-focus-mode [class*="ad"],
      body.cognify-focus-mode [class*="Ad"],
      body.cognify-focus-mode [id*="ad"],
      body.cognify-focus-mode [id*="Ad"],
      body.cognify-focus-mode iframe {
        display: none !important;
      }
      body.cognify-focus-mode main,
      body.cognify-focus-mode article,
      body.cognify-focus-mode [role="main"],
      body.cognify-focus-mode .content,
      body.cognify-focus-mode .main,
      body.cognify-focus-mode #content,
      body.cognify-focus-mode #main {
        background: #ffffff !important;
      }
    `
    : "";

  function sanitizeNumber(value, min, max, fallback) {
    const n = parseFloat(value);
    if (!isFinite(n) || n < min || n > max) return fallback;
    return n;
  }
  const safeFontSize = sanitizeNumber(fontSize, 8, 72, 16);
  const safeLineHeight = sanitizeNumber(lineHeight, 1, 4, 1.6);
  const safeLetterSpacing = sanitizeNumber(letterSpacing, 0, 10, 0);

  styleEl.textContent = `
    p, h1, h2, h3, h4, li, span {
      font-size: ${safeFontSize}px !important;
      line-height: ${safeLineHeight} !important;
      letter-spacing: ${safeLetterSpacing}px !important;
    }
    ${focusRules}
  `;

  applyColourMode(colourMode);
}

function restoreFocusModeElements() {
  const selectors = [
    "nav",
    "header",
    "aside",
    "footer",
    "[class*='ad']",
    "[class*='Ad']",
    "[id*='ad']",
    "[id*='Ad']",
    "iframe",
  ];

  selectors.forEach((selector) => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        if (el.style.display === "none") {
          el.style.display = "";
        }
      });
    } catch (e) {
      // ignore selector errors
    }
  });
}

function applyProfile(profileName) {
  const PROFILES = {
    "focused-reader": {
      fontSize: 20,
      lineHeight: 1.8,
      focusMode: true,
    },
    "calm-browser": {
      fontSize: 18,
      lineHeight: 2.0,
      colourMode: "warm",
    },
    "quick-scanner": {
      fontSize: 16,
      lineHeight: 1.4,
    },
    "deep-diver": {
      fontSize: 17,
      lineHeight: 1.7,
      focusMode: true,
    },
  };

  const profile = PROFILES[profileName];
  if (!profile) return;

  const settings = {
    fontSize: profile.fontSize,
    lineHeight: profile.lineHeight,
    letterSpacing: 0,
    focusMode: profile.focusMode || false,
    colourMode: profile.colourMode || "normal",
  };

  applySettings(settings);
}

function getTextParagraphs() {
  const paragraphs = document.querySelectorAll(
    'article p, main p, [data-component="text-block"] p'
  );
  return Array.from(paragraphs).filter(
    (p) => p.textContent.trim().length > 20
  );
}

function getUserProfile() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      resolve(result[STORAGE_KEY] || {});
    });
  });
}

function sendToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

function getArticleContainer() {
  return (
    document.querySelector("article") ||
    document.querySelector("main") ||
    document.body
  );
}

function adaptPage() {
  const paragraphs = document.querySelectorAll("p");
  let adaptedCount = 0;

  paragraphs.forEach((p) => {
    if (!p.innerText || p.innerText.trim().length < 60) return;

    const text = p.innerText.trim();
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const sentences = text.match(sentenceRegex) || [text];

    adaptedCount++;

    p.style.borderLeft = "3px solid #2563EB";
    p.style.paddingLeft = "12px";
    p.style.transition = "all 0.3s ease";
    p.style.marginBottom = "14px";

    if (sentences.length > 4) {
      p.innerHTML = "";
      p.style.lineHeight = "1.8";

      sentences.forEach((sentence, index) => {
        const span = document.createElement("span");
        span.textContent = sentence.trim() + " ";
        span.style.display = index % 2 === 0 ? "inline" : "inline";

        if (index === 0) {
          span.style.color = "#0f172a";
          span.style.fontWeight = "600";
        }

        p.appendChild(span);

        if ((index + 1) % 2 === 0 && index < sentences.length - 1) {
          const br = document.createElement("br");
          p.appendChild(br);
        }
      });
    } else if (sentences.length > 0) {
      p.textContent = "";
      sentences.forEach((sentence, index) => {
        if (index > 0) p.appendChild(document.createTextNode(" "));
        const span = document.createElement("span");
        span.textContent = sentence.trim();
        if (index === 0) {
          span.style.color = "#0f172a";
          span.style.fontWeight = "600";
        }
        p.appendChild(span);
      });
    }
  });

  if (adaptedCount > 0) {
    addAdaptedBadge();
  }

  return { success: true, message: `Page adapted - ${adaptedCount} paragraphs improved` };
}

function addAdaptedBadge() {
  let badge = document.getElementById("cognify-adapted-badge");
  if (badge) {
    badge.remove();
  }

  const article = getArticleContainer();
  badge = document.createElement("div");
  badge.id = "cognify-adapted-badge";
  badge.textContent = "✓ Adapted";
  badge.style.cssText = `
    position: absolute;
    top: 16px;
    right: 16px;
    background: #2563EB;
    color: #ffffff;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    animation: slideInRight 0.4s ease-out;
  `;

  if (article.style.position !== "relative" && article.style.position !== "absolute" && article.style.position !== "fixed") {
    article.style.position = "relative";
  }

  article.insertBefore(badge, article.firstChild);

  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `;
  document.head.appendChild(style);
}

async function getSummary() {
  try {
    const textParagraphs = getTextParagraphs();

    if (textParagraphs.length === 0) {
      throw new Error("No suitable paragraphs found on this page.");
    }

    const profile = await getUserProfile();
    const articleText = textParagraphs
      .map((p) => p.textContent.trim())
      .join("\n\n");

    const response = await sendToBackground({
      type: "GET_SUMMARY",
      text: articleText,
      profile,
    });

    if (!response?.success) {
      throw new Error(response?.error || "Summary failed.");
    }

    const summaryPoints = response.summary || [];

    let summaryBox = document.getElementById(SUMMARY_BOX_ID);
    if (summaryBox) {
      summaryBox.remove();
    }

    summaryBox = document.createElement("div");
    summaryBox.id = SUMMARY_BOX_ID;
    summaryBox.style.cssText =
      "margin:0 0 24px;padding:16px 20px;background:#eff6ff;border-left:4px solid #2563EB;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#1e3a8a;";

    const title = document.createElement("strong");
    title.textContent = "Key points";
    title.style.display = "block";
    title.style.marginBottom = "10px";
    summaryBox.appendChild(title);

    const list = document.createElement("ul");
    list.style.cssText = "margin:0;padding-left:20px;";

    summaryPoints
      .map((line) => line.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean)
      .forEach((point) => {
        const item = document.createElement("li");
        item.textContent = point;
        item.style.marginBottom = "6px";
        list.appendChild(item);
      });

    summaryBox.appendChild(list);

    const container = getArticleContainer();
    container.insertBefore(summaryBox, container.firstChild);

    return { success: true, message: "Summary added" };
  } catch (error) {
    return { success: false, error: error.message || "Summary failed." };
  }
}

// DEPRECATED — use showReadingTime instead
function addReadTime(enabled) {
  const id = "cognify-readtime";
  const subId = "cognify-readtime-sub";
  if (!enabled) {
    const el = document.getElementById(id); if (el) el.remove();
    const sub = document.getElementById(subId); if (sub) sub.remove();
    return;
  }
  if (document.getElementById(id)) return;
  const allWords = Array.from(document.querySelectorAll("p"))
    .flatMap(p => (p.textContent || "").split(/\s+/).filter(w => w.length > 0));
  if (allWords.length < 50) return;
  const minutes = Math.ceil(allWords.length / 225);
  const badge = document.createElement("div");
  badge.id = id;
  badge.style.cssText = "display:inline-flex;align-items:center;gap:6px;background:#EEF2FF;color:#1E3A8A;border:1px solid #BFDBFE;padding:6px 16px;border-radius:20px;font-size:14px;font-weight:500;margin:12px 0 16px;font-family:inherit;";
  badge.textContent = "⏱ About " + minutes + " min read";
  const sub = document.createElement("div");
  sub.id = subId;
  sub.style.cssText = "font-size:11px;color:#9CA3AF;margin-bottom:8px;font-family:inherit;";
  sub.textContent = "Scroll to read · Cognify estimate";
  const container = document.querySelector("article") || document.querySelector("main") || document.body;
  const firstP = container.querySelector("p");
  if (firstP) { container.insertBefore(sub, firstP); container.insertBefore(badge, sub); }
  else { container.insertBefore(sub, container.firstChild); container.insertBefore(badge, sub); }
}

function showReadingTime(enabled) {
  const id = "cognify-readtime";
  if (!enabled) { const el = document.getElementById(id); if (el) el.remove(); return; }
  if (document.getElementById(id)) return;
  const article = document.querySelector("article");
  const main = document.querySelector("main");
  let container = article || main;
  if (!container) {
    const allPs = Array.from(document.querySelectorAll("p"));
    const counts = new Map();
    allPs.forEach(p => {
      const parent = p.parentElement;
      if (parent) counts.set(parent, (counts.get(parent) || 0) + 1);
    });
    let best = null, bestCount = 0;
    counts.forEach((count, el) => { if (count > bestCount) { bestCount = count; best = el; } });
    container = best || document.body;
  }
  const allText = Array.from(container.querySelectorAll("p"))
    .map(p => (p.textContent || "").trim()).join(" ");
  const wordCount = allText.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount < 150) return;
  const minutes = Math.ceil(wordCount / 200);
  const badge = document.createElement("div");
  badge.id = id;
  badge.style.cssText = "position:fixed;top:16px;right:16px;background:#1E3A8A;color:white;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:500;z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,0.2);pointer-events:none;font-family:-apple-system,sans-serif;";
  badge.textContent = "⏱ About " + minutes + " min read";
  document.body.appendChild(badge);
}

function applyColourBlindFilter(type) {
  const svgId = "cognify-cbf-svg";
  const styleId = "cognify-cbf-style";
  if (type === "none") {
    const svg = document.getElementById(svgId); if (svg) svg.remove();
    const style = document.getElementById(styleId); if (style) style.remove();
    return;
  }
  const matrixValues = {
    deuteranopia: "0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0",
    protanopia: "0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0",
    tritanopia: "0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0",
  };
  let svg = document.getElementById(svgId);
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = svgId;
    svg.setAttribute("style", "position:absolute;width:0;height:0");
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    filter.id = "cognify-cb-filter";
    const colorMatrix = document.createElementNS("http://www.w3.org/2000/svg", "feColorMatrix");
    colorMatrix.setAttribute("type", "matrix");
    colorMatrix.setAttribute("values", matrixValues[type] || matrixValues.deuteranopia);
    filter.appendChild(colorMatrix);
    defs.appendChild(filter);
    svg.appendChild(defs);
    document.body.insertBefore(svg, document.body.firstChild);
  } else {
    const cm = svg.querySelector("feColorMatrix");
    if (cm) cm.setAttribute("values", matrixValues[type] || matrixValues.deuteranopia);
  }
  let style = document.getElementById(styleId);
  if (!style) { style = document.createElement("style"); style.id = styleId; document.head.appendChild(style); }
  style.textContent = "html { filter: url(#cognify-cb-filter) !important; }";
}

let readingRulerMouseHandler = null;
function toggleReadingRuler(enabled) {
  const rulerId = "cognify-ruler";
  if (enabled) {
    let ruler = document.getElementById(rulerId);
    if (!ruler) {
      ruler = document.createElement("div");
      ruler.id = rulerId;
      ruler.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:40px;background:rgba(255,220,100,0.3);pointer-events:none;z-index:999998;";
      document.body.appendChild(ruler);
    }
    if (!readingRulerMouseHandler) {
      readingRulerMouseHandler = (e) => { const r = document.getElementById(rulerId); if (r) r.style.top = Math.max(0, e.clientY - 20) + "px"; };
      document.addEventListener("mousemove", readingRulerMouseHandler, { passive: true });
    }
  } else {
    const ruler = document.getElementById(rulerId); if (ruler) ruler.remove();
    if (readingRulerMouseHandler) { document.removeEventListener("mousemove", readingRulerMouseHandler); readingRulerMouseHandler = null; }
  }
}

let lineFocusMouseHandler = null;
function toggleLineFocus(enabled) {
  const topId = "cognify-lf-top", bottomId = "cognify-lf-bottom";
  if (enabled) {
    if (!document.getElementById(topId)) {
      const top = document.createElement("div"); top.id = topId;
      top.style.cssText = "position:fixed;top:0;left:0;width:100vw;background:rgba(0,0,0,0.6);pointer-events:none;z-index:999997;height:0;";
      document.body.appendChild(top);
    }
    if (!document.getElementById(bottomId)) {
      const bot = document.createElement("div"); bot.id = bottomId;
      bot.style.cssText = "position:fixed;left:0;width:100vw;background:rgba(0,0,0,0.6);pointer-events:none;z-index:999997;";
      document.body.appendChild(bot);
    }
    if (!lineFocusMouseHandler) {
      lineFocusMouseHandler = (e) => {
        const t = document.getElementById(topId), b = document.getElementById(bottomId);
        if (t && b) {
          const topH = Math.max(0, e.clientY - 30);
          const botTop = e.clientY + 30;
          t.style.height = topH + "px";
          b.style.top = botTop + "px";
          b.style.height = Math.max(0, window.innerHeight - botTop) + "px";
        }
      };
      document.addEventListener("mousemove", lineFocusMouseHandler, { passive: true });
    }
  } else {
    const t = document.getElementById(topId); if (t) t.remove();
    const b = document.getElementById(bottomId); if (b) b.remove();
    if (lineFocusMouseHandler) { document.removeEventListener("mousemove", lineFocusMouseHandler); lineFocusMouseHandler = null; }
  }
}

function applyContrastBoost(enabled) {
  if (enabled) {
    applyDarkMode(false);
    chrome.storage.local.get(['visualSettings'], function(r) {
      const vs = r.visualSettings || {}; vs.darkMode = false;
      chrome.storage.local.set({ visualSettings: vs });
    });
    if (!document.getElementById("cognify-contrast")) {
      const s = document.createElement("style"); s.id = "cognify-contrast";
      s.textContent = "html body p, html body h1, html body h2, html body h3, html body h4, html body h5, html body h6, html body li, html body td, html body th, html body label, html body span { color: #1a1a1a !important; -webkit-font-smoothing: antialiased !important; } html body a { color: #0047CC !important; text-decoration: underline !important; } html body button, html body [role=button], html body input[type=button], html body input[type=submit] { filter: contrast(1.3) !important; outline: 1px solid rgba(0,0,0,0.3) !important; } html body img, html body video, html body picture { filter: contrast(1.15) saturate(1.1) brightness(1.02) !important; } html body { background-color: #fafafa !important; }";
      document.head.appendChild(s);
    }
  } else {
    const s = document.getElementById("cognify-contrast"); if (s) s.remove();
    const bg = document.getElementById("cognify-contrast-bg"); if (bg) bg.remove();
  }
}

function forceLinkUnderlines(enabled) {
  const styleId = "cognify-links";
  if (enabled) {
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style"); s.id = styleId;
      s.textContent = "a { text-decoration: underline !important; text-decoration-thickness: 2px !important; text-underline-offset: 3px !important; color: #0000EE !important; }";
      document.head.appendChild(s);
    }
  } else { const s = document.getElementById(styleId); if (s) s.remove(); }
}

function applyImageMuter(level) {
  const styleId = "cognify-imgmute";
  const opacity = Math.max(0, Math.min(100, level)) / 100;
  let s = document.getElementById(styleId);
  if (!s) { s = document.createElement("style"); s.id = styleId; document.head.appendChild(s); }
  s.textContent = "img, video, iframe, canvas, svg { opacity: " + opacity + " !important; transition: opacity 0.3s ease !important; }";
}

function enhanceFocusIndicators(enabled) {
  const styleId = "cognify-focus";
  if (enabled) {
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style"); s.id = styleId;
      s.textContent = "html body :focus-visible { outline: 5px solid #FF6B00 !important; outline-offset: 3px !important; box-shadow: 0 0 0 8px rgba(255,107,0,0.25) !important; }";
      document.head.appendChild(s);
    }
  } else { const s = document.getElementById(styleId); if (s) s.remove(); }
}

function applyDarkMode(enabled) {
  if (enabled) {
    applyContrastBoost(false);
    if (!document.getElementById("cognify-darkmode")) {
      const s = document.createElement("style"); s.id = "cognify-darkmode";
      s.textContent = "html, body { background-color: #1a1a1a !important; color: #e5e5e5 !important; } html body p, html body h1, html body h2, html body h3, html body h4, html body h5, html body h6, html body li, html body span, html body td, html body th, html body label, html body div { color: #e5e5e5 !important; background-color: transparent !important; } html body a { color: #93c5fd !important; } html body input, html body textarea, html body select { background-color: #2a2a2a !important; color: #e5e5e5 !important; border-color: #444 !important; }";
      document.head.appendChild(s);
    }
  } else { const s = document.getElementById("cognify-darkmode"); if (s) s.remove(); }
}

function applyTextOnly(enabled) {
  if (enabled) {
    if (!document.getElementById("cognify-textonly")) {
      const s = document.createElement("style"); s.id = "cognify-textonly";
      s.textContent = "html body img, html body video, html body iframe, html body canvas, html body svg, html body figure, html body picture, html body [class*='banner'], html body [class*='hero'], html body [class*='carousel'], html body [class*='slider'], html body [class*='gallery'] { display: none !important; } html body p, html body h1, html body h2, html body h3, html body li, html body article, html body main { max-width: 780px !important; margin-left: auto !important; margin-right: auto !important; }";
      document.head.appendChild(s);
    }
  } else { const s = document.getElementById("cognify-textonly"); if (s) s.remove(); }
}

function toggleDistractionRemoval(enabled) {
  const styleId = "cognify-distraction";
  if (enabled) {
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style"); s.id = styleId;
      s.textContent = ".advertisement, .ad, .ads, .sidebar, .widget, .social-share, .comments, #comments, .related-posts, .newsletter-signup, .cookie-banner, .promo, [class*='ad-'], iframe:not([title*='video']) { display: none !important; }";
      document.head.appendChild(s);
    }
  } else { const s = document.getElementById(styleId); if (s) s.remove(); }
}

function setReadingLevel(level) {
  const styleId = "cognify-reading";
  const existing = document.getElementById(styleId);
  if (level === "default" || level === "detailed") { if (existing) existing.remove(); return; }
  let s = existing;
  if (!s) { s = document.createElement("style"); s.id = styleId; document.head.appendChild(s); }
  if (level === "simple") {
    s.textContent = "article, main { max-width: 650px !important; margin: 0 auto !important; } p { font-size: 18px !important; line-height: 1.9 !important; }";
  } else if (level === "standard") {
    s.textContent = "article, main { max-width: 750px !important; margin: 0 auto !important; } p { font-size: 16px !important; line-height: 1.7 !important; }";
  }
}

function toggleBreakReminder(enabled, intervalMinutes) {
  if (window.cognifyBreakTimer) { clearInterval(window.cognifyBreakTimer); window.cognifyBreakTimer = null; }
  const badge = document.getElementById("cognify-timer-badge"); if (badge) badge.remove();
  const overlay = document.getElementById("cognify-break"); if (overlay) overlay.remove();
  if (!enabled) return;
  const mins = intervalMinutes || 20;
  let totalSec = mins * 60, remaining = totalSec, paused = false;
  function fmt(s) { return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0"); }
  function updateBadge() { const d = document.getElementById("cognify-timer-display"); if (d) d.textContent = fmt(remaining); }
  function showOverlay() {
    if (document.getElementById("cognify-break")) return;
    const ov = document.createElement("div"); ov.id = "cognify-break";
    ov.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border:3px solid #2563EB;border-radius:16px;padding:32px 40px;text-align:center;width:320px;z-index:2147483647;box-shadow:0 20px 60px rgba(0,0,0,0.25);font-family:inherit;";
    let secs = 30;
    ov.innerHTML = '<div style="font-size:36px;margin-bottom:8px">👁</div><div style="font-weight:600;font-size:18px;color:#111827;margin-bottom:6px">Time for a break</div><div style="font-size:14px;color:#6B7280;margin-bottom:16px">Rest your eyes for 30 seconds</div><div id="cognify-countdown" style="font-size:28px;font-weight:600;color:#2563EB;margin-bottom:16px">30</div><button id="cognify-break-dismiss" style="background:#2563EB;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer;">Dismiss</button>';
    document.body.appendChild(ov);
    const cdEl = document.getElementById("cognify-countdown");
    const cdInt = setInterval(function() { secs--; if (cdEl) cdEl.textContent = secs; if (secs <= 0) { clearInterval(cdInt); ov.remove(); remaining = totalSec; updateBadge(); } }, 1000);
    document.getElementById("cognify-break-dismiss").addEventListener("click", function() { clearInterval(cdInt); ov.remove(); remaining = totalSec; updateBadge(); });
  }
  function startTimer() {
    if (window.cognifyBreakTimer) clearInterval(window.cognifyBreakTimer);
    window.cognifyBreakTimer = setInterval(function() {
      if (paused) return; remaining--;
      updateBadge();
      if (remaining <= 0) { clearInterval(window.cognifyBreakTimer); window.cognifyBreakTimer = null; showOverlay(); }
    }, 1000);
  }
  const b = document.createElement("div"); b.id = "cognify-timer-badge";
  b.style.cssText = "position:fixed;bottom:20px;left:20px;z-index:9999998;background:#1E3A8A;color:white;border-radius:24px;padding:8px 16px;font-size:13px;display:flex;align-items:center;gap:8px;font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,0.2);";
  b.innerHTML = '<span>⏱</span><span id="cognify-timer-display">'+fmt(remaining)+'</span><button id="cognify-timer-pause" style="background:transparent;border:none;color:white;cursor:pointer;font-size:14px;padding:0;">⏸</button><button id="cognify-timer-reset" style="background:transparent;border:none;color:white;cursor:pointer;font-size:14px;padding:0;">↺</button>';
  document.body.appendChild(b);
  document.getElementById("cognify-timer-pause").addEventListener("click", function() { paused = !paused; this.textContent = paused ? "▶" : "⏸"; });
  document.getElementById("cognify-timer-reset").addEventListener("click", function() { remaining = totalSec; paused = false; document.getElementById("cognify-timer-pause").textContent = "⏸"; updateBadge(); startTimer(); });
  startTimer();
}

function toggleAutoChunking(enabled) {
  if (!enabled) {
    if (window.cognifyChunkMap) {
      window.cognifyChunkMap.forEach(function(data, firstInserted) {
        if (firstInserted && firstInserted.parentNode) {
          firstInserted.parentNode.insertBefore(data.original, firstInserted);
          data.inserted.forEach(function(np) { if (np.parentNode) np.parentNode.removeChild(np); });
        }
      });
      window.cognifyChunkMap = null;
    }
    return;
  }
  const container = document.querySelector("article") || document.querySelector("main") || document.body;
  const paragraphs = Array.from(container.querySelectorAll("p")).filter(function(p) {
    const text = p.innerText || "";
    if (text.length <= 200) return false;
    const matches = text.match(/\.\s+[A-Z]/g);
    return matches && matches.length >= 3;
  });
  if (!paragraphs.length) return;
  if (!window.cognifyChunkMap) window.cognifyChunkMap = new Map();
  paragraphs.forEach(function(p) {
    const text = p.innerText;
    const parent = p.parentNode;
    if (!parent) return;
    const raw = text.split(". ");
    const chunks = [];
    for (var i = 0; i < raw.length; i += 3) {
      chunks.push(raw.slice(i, i + 3));
    }
    if (chunks.length < 2) return;
    const className = p.className;
    const cssText = p.style.cssText;
    const insertedPs = [];
    chunks.forEach(function(chunk) {
      const np = document.createElement("p");
      np.className = className;
      if (cssText) np.style.cssText = cssText;
      const joined = chunk.join(". ");
      np.textContent = /[.!?]$/.test(joined.trimEnd()) ? joined : joined + ".";
      parent.insertBefore(np, p);
      insertedPs.push(np);
    });
    window.cognifyChunkMap.set(insertedPs[0], { original: p, inserted: insertedPs });
    parent.removeChild(p);
  });
}

function enlargeClickTargets(enabled) {
  const styleId = "cognify-targets";
  if (enabled) {
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style"); s.id = styleId;
      s.textContent = "a, button, input, select, textarea, [role='button'] { min-height: 44px !important; min-width: 44px !important; padding: 8px 12px !important; }";
      document.head.appendChild(s);
    }
  } else { const s = document.getElementById(styleId); if (s) s.remove(); }
}

function toggleStickyNav(enabled) {
  const nav = document.querySelector("nav") || document.querySelector("header");
  if (!nav) return;
  if (enabled) { nav.style.position = "sticky"; nav.style.top = "0"; nav.style.zIndex = "9999"; nav.style.background = "white"; nav.dataset.cognifySticky = "true"; }
  else if (nav.dataset.cognifySticky) { nav.style.position = ""; nav.style.top = ""; nav.style.zIndex = ""; nav.style.background = ""; delete nav.dataset.cognifySticky; }
}

function reduceMotion(enabled) {
  const styleId = "cognify-motion";
  if (enabled) {
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style"); s.id = styleId;
      s.textContent = "*, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; scroll-behavior: auto !important; }";
      document.head.appendChild(s);
    }
  } else { const s = document.getElementById(styleId); if (s) s.remove(); }
}

function blockInfiniteScroll(enabled) {
  const styleId = "cognify-scroll";
  if (enabled) {
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style"); s.id = styleId;
      document.head.appendChild(s);
    }
  } else { const s = document.getElementById(styleId); if (s) s.remove(); }
}

let autoplayObserver = null;
function blockAutoplay(enabled) {
  if (enabled) {
    document.querySelectorAll("video, audio").forEach(el => { el.pause(); el.removeAttribute("autoplay"); });
    autoplayObserver = new MutationObserver(mutations => {
      mutations.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.tagName === "VIDEO" || n.tagName === "AUDIO") { n.pause(); n.removeAttribute("autoplay"); }
        if (n.querySelectorAll) n.querySelectorAll("video, audio").forEach(el => { el.pause(); el.removeAttribute("autoplay"); });
      }));
    });
    autoplayObserver.observe(document.body, { childList: true, subtree: true });
  } else { if (autoplayObserver) { autoplayObserver.disconnect(); autoplayObserver = null; } }
}

function removeAnimations(enabled) {
  const styleId = "cognify-anim";
  if (enabled) {
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style"); s.id = styleId;
      s.textContent = "*, *::before, *::after { animation: none !important; transition: none !important; }";
      document.head.appendChild(s);
    }
  } else { const s = document.getElementById(styleId); if (s) s.remove(); }
}

let _urgencyHidden = [];
function blockUrgencyElements(enabled) {
  const styleId = "cognify-urgency";
  if (enabled) {
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style"); s.id = styleId;
      s.textContent = "[class*='countdown'], [class*='timer'], [class*='urgency'], [class*='scarcity'], [class*='flash'], [class*='promo-bar'] { display: none !important; }";
      document.head.appendChild(s);
    }
    _urgencyHidden = [];
    Array.from(document.querySelectorAll('[class*=countdown],[class*=timer],[class*=urgency],[class*=scarcity],[class*=flash],[class*=promo-bar],[class*=banner],[class*=notification]')).slice(0, 200).forEach(el => {
      const t = el.textContent.toLowerCase();
      if ((t.includes("limited time") || t.includes("expires") || / only \d+ left/.test(t)) && el.children.length < 5) {
        el.dataset.cognifyUrgencyHidden = "true"; el.style.display = "none"; _urgencyHidden.push(el);
      }
    });
  } else {
    const s = document.getElementById(styleId); if (s) s.remove();
    _urgencyHidden.forEach(el => { el.style.display = ""; delete el.dataset.cognifyUrgencyHidden; });
    _urgencyHidden = [];
  }
}

function toggleSensoryMode(enabled) {
  blockAutoplay(enabled);
  removeAnimations(enabled);
  blockUrgencyElements(enabled);
}

function dimBrightImages(enabled, level) {
  const styleId = "cognify-bright";
  if (enabled) {
    const brightness = Math.max(40, Math.min(100, level || 70));
    let s = document.getElementById(styleId);
    if (!s) { s = document.createElement("style"); s.id = styleId; document.head.appendChild(s); }
    s.textContent = "img { filter: brightness(" + (brightness/100) + ") !important; }";
  } else { const s = document.getElementById(styleId); if (s) s.remove(); }
}

function setLanguageSimplification(level) {
  if (level === 0 || level === "off") {
    if (window._cognifySimplifiedNodes) {
      window._cognifySimplifiedNodes.forEach(function(item) { item.node.textContent = item.originalText; });
      window._cognifySimplifiedNodes = null;
    }
    return;
  }
  const lightWords = { utilise:"use", subsequently:"then", approximately:"about", commence:"start", endeavour:"try", furthermore:"also", nevertheless:"still", indicate:"show", demonstrate:"show", sufficient:"enough", additional:"more", require:"need", significant:"major", numerous:"many", assist:"help", however:"but", therefore:"so", implement:"do", facilitate:"help", leverage:"use", methodology:"method", functionality:"features", prioritize:"rank", stakeholder:"person involved", possess:"have", purchase:"buy", inquire:"ask", respond:"reply", construct:"build", evaluate:"judge" };
  const heavyExtra = { comprehend:"understand", ascertain:"find out", constitute:"make up", formulate:"create", incorporate:"include", modification:"change", proportion:"amount", subsequent:"next", initial:"first", primary:"main", secondary:"second", fundamental:"basic", alternative:"other choice", objective:"goal", component:"part", mechanism:"way it works", criteria:"rules", indication:"sign", outcome:"result" };
  const words = (level === 2 || level === "heavy") ? Object.assign({}, lightWords, heavyExtra) : lightWords;
  const escapeRegex = function(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  const compiledWords = Object.entries(words).map(([w, s]) => ({ re: new RegExp('\\b' + escapeRegex(w) + '\\b', 'gi'), replacement: s }));
  setTimeout(function() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement; if (!parent) continue;
      const tag = parent.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "CODE" || tag === "PRE" || tag === "NOSCRIPT") continue;
      let text = node.textContent;
      compiledWords.forEach(({re, replacement}) => { re.lastIndex = 0; text = text.replace(re, replacement); });
      if (text !== node.textContent) {
        if (!window._cognifySimplifiedNodes) window._cognifySimplifiedNodes = [];
        window._cognifySimplifiedNodes.push({ node: node, originalText: node.textContent });
        node.textContent = text;
      }
    }
  }, 600);
}

function toggleTooltips(enabled) {
  if (enabled) {
    const existing = document.getElementById("cognify-tt");
    if (existing) existing.remove();
    const tt = document.createElement("div");
    tt.id = "cognify-tt";
    tt.style.position = "fixed";
    tt.style.background = "#1E3A8A";
    tt.style.color = "white";
    tt.style.padding = "10px 14px";
    tt.style.borderRadius = "8px";
    tt.style.fontSize = "13px";
    tt.style.zIndex = "9999999";
    tt.style.pointerEvents = "none";
    tt.style.maxWidth = "260px";
    tt.style.lineHeight = "1.5";
    tt.style.display = "none";
    tt.style.fontFamily = "inherit";
    tt.style.boxShadow = "0 4px 16px rgba(0,0,0,0.25)";
    tt.style.transition = "opacity 0.15s";
    document.body.appendChild(tt);

    window.cognifyDefCache = window.cognifyDefCache || {};
    window.cognifyTTTimer = null;

    function showTooltip(tt, word, data, e) {
      tt.innerHTML = "<span style=\"font-weight:600;font-size:14px;display:block;margin-bottom:2px;color:white\">" + word + "</span><span style=\"color:rgba(255,255,255,0.75);font-size:11px;font-style:italic;display:block;margin-bottom:4px\">" + data.pos + "</span><span style=\"font-size:12px;color:rgba(255,255,255,0.92);line-height:1.5\">" + data.def + "</span>";
      tt.style.left = Math.min(e.clientX + 14, window.innerWidth - 280) + "px";
      tt.style.top = Math.min(e.clientY + 18, window.innerHeight - 120) + "px";
      tt.style.display = "block";
    }

    window.cognifyTTHandler = function(e) {
      window.cognifyLastMouseEvent = e;
      clearTimeout(window.cognifyTTTimer);
      window.cognifyTTTimer = setTimeout(function() {
        const tt = document.getElementById("cognify-tt");
        if (!tt) return;
        let word = null;
        if (document.caretRangeFromPoint) {
          const range = document.caretRangeFromPoint(e.clientX, e.clientY);
          if (range && range.startContainer && range.startContainer.nodeType === 3) {
            const nodeText = range.startContainer.textContent;
            const offset = range.startOffset;
            let start = offset;
            let end = offset;
            while (start > 0 && /[a-zA-Z]/.test(nodeText[start - 1])) start--;
            while (end < nodeText.length && /[a-zA-Z]/.test(nodeText[end])) end++;
            word = nodeText.slice(start, end).toLowerCase().replace(/[^a-zA-Z]/g, "");
          }
        }
        if (!word || word.length < 4) { tt.style.display = "none"; return; }
        if (window.cognifyDefCache[word] === null) { tt.style.display = "none"; return; }
        if (window.cognifyDefCache[word]) { showTooltip(tt, word, window.cognifyDefCache[word], e); return; }
        tt.innerHTML = "<span style=\"opacity:0.7;font-size:12px\">Looking up " + word + "...</span>";
        tt.style.left = Math.min(e.clientX + 14, window.innerWidth - 280) + "px";
        tt.style.top = Math.min(e.clientY + 18, window.innerHeight - 100) + "px";
        tt.style.display = "block";
        chrome.runtime.sendMessage({ type: 'FETCH_DEFINITION', word: word }, function(response) {
          if (chrome.runtime.lastError || !response || !response.definition) {
            window.cognifyDefCache[word] = null; tt.style.display = "none"; return;
          }
          window.cognifyDefCache[word] = { pos: response.pos, def: response.definition };
          showTooltip(tt, word, window.cognifyDefCache[word], window.cognifyLastMouseEvent);
        });
      }, 400);
    };

    document.removeEventListener("mousemove", window.cognifyTTHandler);
    document.addEventListener("mousemove", window.cognifyTTHandler);
  } else {
    document.removeEventListener("mousemove", window.cognifyTTHandler);
    window.cognifyTTHandler = null;
    clearTimeout(window.cognifyTTTimer);
    const tt = document.getElementById("cognify-tt");
    if (tt) tt.remove();
    window.cognifyDefCache = {};
  }
}

let _highlightObserver = null;
function _runHighlight() {
  document.querySelectorAll("article p, main p, p").forEach(p => {
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    const textNodes = []; let node;
    while ((node = walker.nextNode())) textNodes.push(node);
    textNodes.forEach(tn => {
      if (tn.parentNode.classList && tn.parentNode.classList.contains("cognify-complex")) return;
      const newHtml = tn.textContent.replace(/\b([a-zA-Z]{10,})\b/g, m => '<span class="cognify-complex" style="background:rgba(255,200,0,0.3);border-bottom:1px dotted #b45309;">'+m+"</span>");
      if (newHtml !== tn.textContent) { const sp = document.createElement("span"); sp.innerHTML = newHtml; tn.parentNode.replaceChild(sp, tn); }
    });
  });
}
function highlightComplexWords(enabled) {
  if (enabled) {
    window.cognifyHighlightActive = true;
    _runHighlight();
    if (!_highlightObserver) {
      _highlightObserver = new MutationObserver(function(mutations) {
        if (!window.cognifyHighlightActive) return;
        mutations.forEach(function(m) { m.addedNodes.forEach(function(n) { if (n.nodeType === 1 && (n.tagName === "P" || n.querySelector("p"))) _runHighlight(); }); });
      });
      _highlightObserver.observe(document.body, { childList: true, subtree: true });
    }
  } else {
    window.cognifyHighlightActive = false;
    if (_highlightObserver) { _highlightObserver.disconnect(); _highlightObserver = null; }
    document.querySelectorAll(".cognify-complex").forEach(span => { if (span.parentNode) span.parentNode.replaceChild(document.createTextNode(span.textContent), span); });
  }
}

function addTranslationButton(enabled) {
  console.log("[Cognify] addTranslationButton called, enabled:", enabled);
  const btnId = "cognify-translate-btn";
  const styleId = "cognify-translate-style";
  if (enabled) {
    if (!document.getElementById(btnId)) {
      if (!document.getElementById(styleId)) {
        const s = document.createElement("style"); s.id = styleId;
        s.textContent = "#cognify-translate-btn { position: fixed !important; bottom: 80px !important; right: 20px !important; z-index: 2147483647 !important; }";
        document.head.appendChild(s);
      }
      const btn = document.createElement("button"); btn.id = btnId;
      btn.style.background = "#2563EB";
      btn.style.color = "white";
      btn.style.border = "none";
      btn.style.borderRadius = "8px";
      btn.style.padding = "8px 14px";
      btn.style.fontSize = "13px";
      btn.style.cursor = "pointer";
      btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      btn.style.fontFamily = "-apple-system, sans-serif";
      btn.textContent = "🌐 Translate page";
      btn.addEventListener("click", function() {
        window.open("https://translate.google.com/translate?sl=auto&tl=en&u=" + encodeURIComponent(window.location.href), "_blank", "noopener,noreferrer");
      });
      document.body.appendChild(btn);
    }
  } else {
    const btn = document.getElementById(btnId); if (btn) btn.remove();
    const s = document.getElementById(styleId); if (s) s.remove();
  }
}

function toggleTextToSpeech(enabled) {
  const barId = "cognify-tts-bar";
  if (!enabled) { if (window.speechSynthesis) window.speechSynthesis.cancel(); const bar = document.getElementById(barId); if (bar) bar.remove(); return; }
  if (document.getElementById(barId)) return;
  const bar = document.createElement("div"); bar.id = barId;
  bar.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:9999998;background:#1E3A8A;color:white;border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:10px;font-size:13px;font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,0.2);";
  const playBtn = document.createElement("button"); playBtn.id = "cognify-tts-play"; playBtn.textContent = "▶ Read page"; playBtn.style.cssText = "background:transparent;border:none;color:white;cursor:pointer;font-size:13px;font-family:inherit;padding:0;white-space:nowrap;";
  const stopBtn = document.createElement("button"); stopBtn.textContent = "⏹"; stopBtn.style.cssText = "background:transparent;border:none;color:white;cursor:pointer;font-size:15px;padding:0;";
  bar.appendChild(playBtn); bar.appendChild(stopBtn);
  document.body.appendChild(bar);
  playBtn.addEventListener("click", function() {
    const ss = window.speechSynthesis;
    if (ss.speaking && !ss.paused) { ss.pause(); playBtn.textContent = "▶ Resume"; }
    else if (ss.paused) { ss.resume(); playBtn.textContent = "⏸ Pause"; }
    else {
      const text = Array.from(document.querySelectorAll("p, h1, h2, h3, li")).map(el => el.textContent.trim()).filter(t => t).join(" ");
      const utt = new SpeechSynthesisUtterance(text); utt.rate = 0.9; utt.pitch = 1.0; utt.lang = "en";
      utt.onend = function() { playBtn.textContent = "▶ Read page"; };
      ss.speak(utt); playBtn.textContent = "⏸ Pause";
    }
  });
  stopBtn.addEventListener("click", function() { window.speechSynthesis.cancel(); playBtn.textContent = "▶ Read page"; });
}

globalThis.adaptPage = adaptPage;
globalThis.getSummary = getSummary;
globalThis.applyProfile = applyProfile;
globalThis.applyFont = applyFont;
globalThis.addReadTime = addReadTime;
globalThis.applyColourBlindFilter = applyColourBlindFilter;
globalThis.toggleReadingRuler = toggleReadingRuler;
globalThis.toggleLineFocus = toggleLineFocus;
globalThis.applyContrastBoost = applyContrastBoost;
globalThis.forceLinkUnderlines = forceLinkUnderlines;
globalThis.applyImageMuter = applyImageMuter;
globalThis.enhanceFocusIndicators = enhanceFocusIndicators;
globalThis.applyDarkMode = applyDarkMode;
globalThis.applyTextOnly = applyTextOnly;
globalThis.toggleDistractionRemoval = toggleDistractionRemoval;
globalThis.setReadingLevel = setReadingLevel;
globalThis.toggleBreakReminder = toggleBreakReminder;
globalThis.toggleAutoChunking = toggleAutoChunking;
globalThis.enlargeClickTargets = enlargeClickTargets;
globalThis.toggleStickyNav = toggleStickyNav;
globalThis.reduceMotion = reduceMotion;
globalThis.blockInfiniteScroll = blockInfiniteScroll;
globalThis.blockAutoplay = blockAutoplay;
globalThis.removeAnimations = removeAnimations;
globalThis.blockUrgencyElements = blockUrgencyElements;
globalThis.dimBrightImages = dimBrightImages;
globalThis.toggleSensoryMode = toggleSensoryMode;
globalThis.setLanguageSimplification = setLanguageSimplification;
globalThis.toggleTooltips = toggleTooltips;
globalThis.highlightComplexWords = highlightComplexWords;
globalThis.addTranslationButton = addTranslationButton;
globalThis.toggleTextToSpeech = toggleTextToSpeech;
globalThis.showReadingTime = showReadingTime;

function toggleSentenceHighlight(enabled) {
  if (!enabled) {
    if (window.cognifySentenceHandler) {
      document.body.removeEventListener("click", window.cognifySentenceHandler);
      window.cognifySentenceHandler = null;
    }
    if (window._cognifySHOriginals) {
      window._cognifySHOriginals.forEach(function(clone, el) {
        if (el.parentNode) el.parentNode.replaceChild(clone.cloneNode(true), el);
      });
      window._cognifySHOriginals = null;
    }
    return;
  }
  window._cognifySHOriginals = new Map();
  const candidates = Array.from(document.querySelectorAll('p, [data-component=text-block], article p, main p, .article p, .story p, .content p, [class*=Paragraph], [class*=paragraph]')).filter(function(el) {
    return el.innerText && el.innerText.trim().length > 50 && el.offsetParent !== null && !el.querySelector('p');
  });
  candidates.forEach(function(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: function(n) {
        return n.textContent.trim().length > 10 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }, false);
    const nodes = []; let n;
    while ((n = walker.nextNode())) nodes.push(n);
    const anySplittable = nodes.some(function(node) {
      return node.textContent.split(/(?<=[.!?])\s+(?=[A-Z"'])/).length > 1;
    });
    if (!anySplittable) return;
    window._cognifySHOriginals.set(el, el.cloneNode(true));
    nodes.forEach(function(node) {
      const parts = node.textContent.split(/(?<=[.!?])\s+(?=[A-Z"'])/);
      if (parts.length < 2) return;
      const fragment = document.createDocumentFragment();
      parts.forEach(function(part, i) {
        const span = document.createElement("span");
        span.className = "cognify-sentence";
        span.textContent = part.trim();
        span.style.cssText = "cursor:pointer;border-radius:3px;padding:1px 0;display:inline;transition:background 0.15s;";
        fragment.appendChild(span);
        if (i < parts.length - 1) fragment.appendChild(document.createTextNode(" "));
      });
      node.parentNode.replaceChild(fragment, node);
    });
  });
  window.cognifySentenceHandler = function(e) {
    const s = e.target.closest(".cognify-sentence");
    if (!s) return;
    document.querySelectorAll(".cognify-sentence.active").forEach(function(el) {
      el.classList.remove("active"); el.style.background = ""; el.style.outline = "";
    });
    s.classList.add("active");
    s.style.background = "#FEF3C7";
    s.style.outline = "2px solid #F59E0B";
    s.style.borderRadius = "3px";
  };
  document.body.addEventListener("click", window.cognifySentenceHandler);
}
globalThis.toggleSentenceHighlight = toggleSentenceHighlight;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;
  if (message.type === "COGNIFY_UPDATE" && message.settings) {
    applySettings(message.settings);
    sendResponse({ ok: true });
  }
  return true;
});

(function () {
  const bar = document.createElement("div");
  bar.id = "cognify-progress-bar";
  bar.style.cssText =
    "position:fixed;top:0;left:0;width:0%;height:4px;background:#2563EB;z-index:2147483647;transition:width 0.1s;pointer-events:none;";
  document.documentElement.appendChild(bar);

  window.addEventListener("scroll", function () {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = Math.min(progress, 100) + "%";
  });
})();

chrome.storage.local.get(null, function(result) {
  if (chrome.runtime.lastError) return;
  try {
    const hostname = window.location.hostname;
    const siteKey = 'site_' + hostname;
    const src = result[siteKey] || result;
    const vis = src.visualSettings || {};
    const cog = src.cognitiveSettings || {};
    const mot = src.motorSettings || {};
    const sen = src.sensorySettings || {};
    const lan = src.languageSettings || {};
    const disp = src.cognifySettings || {};
    if (vis.darkMode === true) applyDarkMode(true);
    if (vis.textOnly === true) applyTextOnly(true);
    if (vis.contrastBoost === true) applyContrastBoost(true);
    if (vis.forceLinkUnderlines === true) forceLinkUnderlines(true);
    if (vis.readingRuler === true) toggleReadingRuler(true);
    if (vis.lineFocus === true) toggleLineFocus(true);
    if (vis.enhanceFocusIndicators === true) enhanceFocusIndicators(true);
    if (vis.imageOpacity !== undefined && vis.imageOpacity !== 100) applyImageMuter(vis.imageOpacity);
    if (vis.colourBlindFilter && vis.colourBlindFilter !== 'none') applyColourBlindFilter(vis.colourBlindFilter);
    if (cog.distractionRemoval === true) toggleDistractionRemoval(true);
    if (cog.breakReminder === true) { const mins = parseInt(cog.breakInterval) || 20; toggleBreakReminder(true, mins); }
    if (cog.autoChunking === true) toggleAutoChunking(true);
    if (cog.sentenceHighlight === true) toggleSentenceHighlight(true);
    if (cog.readTime === true) showReadingTime(true);
    if (mot.enlargeClickTargets === true) enlargeClickTargets(true);
    if (mot.toggleStickyNav === true) toggleStickyNav(true);
    if (mot.reduceMotion === true) reduceMotion(true);
    if (sen.sensoryMode === true) toggleSensoryMode(true);
    if (sen.blockAutoplay === true) blockAutoplay(true);
    if (sen.removeAnimations === true) removeAnimations(true);
    if (sen.blockUrgency === true) blockUrgencyElements(true);
    if (sen.imageBrightness !== undefined && sen.imageBrightness !== 100) dimBrightImages(sen.imageBrightness);
    if (lan.tooltips === true) toggleTooltips(true);
    if (lan.complexWords === true) highlightComplexWords(true);
    if (lan.tts === true) toggleTextToSpeech(true);
    if (lan.translation === true) addTranslationButton(true);
    if (lan.simplification && lan.simplification !== 'off') setLanguageSimplification(lan.simplification);
    if (disp.fontFamily && disp.fontFamily !== 'default') applyFont(disp.fontFamily);
    const fs = parseFloat(disp.fontSize) || 16;
    const lh = parseFloat(disp.lineHeight) || 1.6;
    const ls = parseFloat(disp.letterSpacing) || 0;
    if (fs !== 16 || lh !== 1.6 || ls !== 0) applySettings({ fontSize: fs, lineHeight: lh, letterSpacing: ls });
  } catch(e) { console.error('Equols boot error:', e); }
});
