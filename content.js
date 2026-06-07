const STORAGE_KEY = "cognifySettings";
const PROFILE_KEY = "cognifyProfile";
const STYLE_ID = "cognify-styles";
const SUMMARY_BOX_ID = "cognify-summary-box";
const COLOUR_STYLE_ID = "cognify-colour";
const FONT_STYLE_ID = "cognify-font";
const FONT_SELECTORS = "p, h1, h2, h3, h4, h5, li, span, a, td, div";
const LEXEND_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Lexend:wght@400;500&display=swap";

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
    fontEl.textContent = `
      @import url('${LEXEND_FONT_URL}');
      ${FONT_SELECTORS} {
        font-family: 'Lexend', sans-serif !important;
      }
    `;
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

  focusModeMouseHandler = (event) => {
    if (event.clientY <= 80) {
      document.body.classList.add("cognify-focus-reveal");
    } else {
      document.body.classList.remove("cognify-focus-reveal");
    }
  };

  document.addEventListener("mousemove", focusModeMouseHandler, {
    passive: true,
  });
}

function teardownFocusModeInteraction() {
  if (focusModeMouseHandler) {
    document.removeEventListener("mousemove", focusModeMouseHandler);
    focusModeMouseHandler = null;
  }
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

  styleEl.textContent = `
    p, h1, h2, h3, h4, li, span {
      font-size: ${fontSize}px !important;
      line-height: ${lineHeight} !important;
      letter-spacing: ${letterSpacing}px !important;
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
      const newHTML = sentences
        .map((sentence, index) => {
          const trimmed = sentence.trim();
          if (index === 0) {
            return `<span style="color: #0f172a; font-weight: 600;">${trimmed}</span>`;
          }
          return trimmed;
        })
        .join(" ");
      p.innerHTML = newHTML;
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

globalThis.adaptPage = adaptPage;
globalThis.getSummary = getSummary;
globalThis.applyProfile = applyProfile;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
