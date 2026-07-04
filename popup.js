const PROFILES = {
  'focused-reader': {
    emoji: '🎯', name: 'Focused Reader',
    desc: 'You read best without distractions. We\'ll clear the clutter and help you stay on track.',
    features: ['Focus mode', 'Reading time estimate', 'Sentence highlighter'],
    settings: { distractionToggle: true, readTimeToggle: true, toggleSentenceHighlight: true }
  },
  'calm-browser': {
    emoji: '🌙', name: 'Calm Browser',
    desc: 'Screens can feel harsh. We\'ll soften the experience so reading feels comfortable.',
    features: ['Dark mode', 'Block autoplay videos', 'Image brightness reduced'],
    settings: { toggleDarkMode: true, autoplayToggle: true }
  },
  'word-explorer': {
    emoji: '📖', name: 'Word Explorer',
    desc: 'Vocabulary and reading flow matter to you. We\'ll make complex text easier to navigate.',
    features: ['Word tooltips', 'Highlight complex words', 'Word simplification on Light'],
    settings: { tooltipsToggle: true, complexWordsToggle: true }
  },
  'clear-viewer': {
    emoji: '👁', name: 'Clear Viewer',
    desc: 'Keeping your place on the page matters. We\'ll add visual guides to help you track text.',
    features: ['Reading ruler', 'Line focus', 'Contrast boost'],
    settings: { rulerToggle: true, contrastToggle: true }
  },
  'easy-navigator': {
    emoji: '🤚', name: 'Easy Navigator',
    desc: 'You prefer calm, controllable pages. We\'ll reduce motion and make everything easier to click.',
    features: ['Reduce motion', 'Enlarge click targets', 'Block urgency messages'],
    settings: { motionToggle: true, targetsToggle: true, urgencyToggle: true }
  },
  'all-round': {
    emoji: '✨', name: 'All Round',
    desc: 'A balanced setup that improves readability for everyone. Good starting point to explore from.',
    features: ['Dyslexia-friendly font', 'Focus mode', 'Word tooltips', 'Contrast boost'],
    settings: { tooltipsToggle: true, distractionToggle: true }
  }
};

const QUESTIONS = [
  {
    text: 'After reading for a few minutes, how does the screen feel?',
    options: [
      { label: 'Fine — no issues', scores: { visual: 0, sensory: 0 } },
      { label: 'A bit tiring on my eyes', scores: { visual: 1, sensory: 1 } },
      { label: 'Uncomfortable — brightness or contrast bothers me', scores: { visual: 2, sensory: 2 } }
    ]
  },
  {
    text: 'When reading a long article, what usually happens?',
    options: [
      { label: 'I read it fine start to finish', scores: { cognitive: 0, language: 0 } },
      { label: 'I lose my place or re-read the same line', scores: { visual: 2, language: 1 } },
      { label: 'I skim or give up — it feels like too much', scores: { cognitive: 2, language: 2 } }
    ]
  },
  {
    text: 'How do ads, sidebars and pop-ups affect your reading?',
    options: [
      { label: 'I tune them out easily', scores: { cognitive: 0, sensory: 0 } },
      { label: 'They slow me down', scores: { cognitive: 1, sensory: 1 } },
      { label: 'I cannot focus at all with them there', scores: { cognitive: 2, sensory: 2 } }
    ]
  },
  {
    text: 'When you hit a complex or unfamiliar word, what happens?',
    options: [
      { label: 'I keep reading — I usually know them', scores: { language: 0 } },
      { label: 'I pause, sometimes look it up', scores: { language: 1 } },
      { label: 'It breaks my flow — simpler words would help a lot', scores: { language: 2 } }
    ]
  },
  {
    text: 'Do animations or auto-playing videos bother you?',
    options: [
      { label: 'Not really', scores: { sensory: 0, motor: 0 } },
      { label: 'Sometimes — I prefer calmer pages', scores: { sensory: 1, motor: 1 } },
      { label: 'Yes — they distract or stress me out', scores: { sensory: 2, motor: 2 } }
    ]
  }
];

let _scores = { visual: 0, cognitive: 0, sensory: 0, motor: 0, language: 0 };
let _currentQ = 0;
let _selectedIdx = null;
let _answers = [];
let _resultProfileKey = null;

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupListeners();
});

function execScript(fn, args) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const tabId = tabs[0].id;
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => typeof applyFont !== 'undefined'
    }, (results) => {
      if (chrome.runtime.lastError) return;
      if (results && results[0] && results[0].result) {
        chrome.scripting.executeScript({ target: { tabId }, function: fn, args: args || [] });
      } else {
        chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }, () => {
          if (chrome.runtime.lastError) return;
          setTimeout(() => {
            chrome.scripting.executeScript({ target: { tabId }, function: fn, args: args || [] });
          }, 300);
        });
      }
    });
  });
}

function execScriptSafe(fnName, fn, args) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const tabId = tabs[0].id;
    chrome.scripting.executeScript({
      target: { tabId },
      func: (name) => typeof window[name] === 'function',
      args: [fnName]
    }, (results) => {
      if (chrome.runtime.lastError) return;
      if (results && results[0] && results[0].result) {
        chrome.scripting.executeScript({ target: { tabId }, function: fn, args: args || [] });
      } else {
        chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }, () => {
          if (chrome.runtime.lastError) return;
          chrome.scripting.executeScript({ target: { tabId }, function: fn, args: args || [] });
        });
      }
    });
  });
}

function showView(id) {
  const current = document.querySelector('.view.active');
  if (current) current.classList.remove('active');
  const next = document.getElementById(id);
  if (next) {
    next.style.display = 'block';
    setTimeout(() => next.classList.add('active'), 10);
  }
}

function setActiveFontButton(activeId) {
  ['fontDefault','fontDyslexia','fontSerif'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const isActive = id === activeId;
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    if (isActive) {
      btn.style.border = '1px solid #1E3A8A';
      btn.style.color = '#1E3A8A';
      btn.style.background = '#EEF2FF';
    } else {
      btn.style.border = '1px solid #E5E7EB';
      btn.style.color = '#374151';
      btn.style.background = 'white';
    }
  });
}

function saveVisual(key, val) {
  chrome.storage.local.get(['visualSettings'], r => {
    const s = r.visualSettings || {}; s[key] = val;
    chrome.storage.local.set({ visualSettings: s });
  });
}
function saveCognitive(key, val) {
  chrome.storage.local.get(['cognitiveSettings'], r => {
    const s = r.cognitiveSettings || {}; s[key] = val;
    chrome.storage.local.set({ cognitiveSettings: s });
  });
}
function saveMotor(key, val) {
  chrome.storage.local.get(['motorSettings'], r => {
    const s = r.motorSettings || {}; s[key] = val;
    chrome.storage.local.set({ motorSettings: s });
  });
}
function saveSensory(key, val) {
  chrome.storage.local.get(['sensorySettings'], r => {
    const s = r.sensorySettings || {}; s[key] = val;
    chrome.storage.local.set({ sensorySettings: s });
  });
}
function saveLanguage(key, val) {
  chrome.storage.local.get(['languageSettings'], r => {
    const s = r.languageSettings || {}; s[key] = val;
    chrome.storage.local.set({ languageSettings: s });
  });
}
function saveDisplay(key, val) {
  chrome.storage.local.get(['cognifySettings'], r => {
    const s = r.cognifySettings || {}; s[key] = val;
    chrome.storage.local.set({ cognifySettings: s });
  });
}

function loadSettings() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabUrl = tabs[0] && tabs[0].url ? tabs[0].url : '';
    let hostname = '';
    try { hostname = new URL(tabUrl).hostname; } catch(e) {}
    const siteKey = hostname ? 'site_' + hostname : null;
    const keysToFetch = ['cognifySettings','cognifyProfile','visualSettings','cognitiveSettings','motorSettings','sensorySettings','languageSettings','quizCompleted'];
    if (siteKey) keysToFetch.push(siteKey);
    chrome.storage.local.get(keysToFetch, result => {
      if (!result.quizCompleted && !result.cognifyProfile) {
        showView('view-onboarding');
        return;
      }
      const siteData = siteKey && result[siteKey] ? result[siteKey] : null;
      _applySettingsToUI(result, siteData, hostname);
    });
  });
}

function _applySettingsToUI(result, siteData, hostname) {
    const s = (siteData && siteData.cognifySettings) ? siteData.cognifySettings : (result.cognifySettings || {});
    const vs = (siteData && siteData.visualSettings) ? siteData.visualSettings : (result.visualSettings || {});
    const cs = (siteData && siteData.cognitiveSettings) ? siteData.cognitiveSettings : (result.cognitiveSettings || {});
    const ms = (siteData && siteData.motorSettings) ? siteData.motorSettings : (result.motorSettings || {});
    const ss = (siteData && siteData.sensorySettings) ? siteData.sensorySettings : (result.sensorySettings || {});
    const ls = (siteData && siteData.languageSettings) ? siteData.languageSettings : (result.languageSettings || {});
    const profile = result.cognifyProfile;

    if (siteData) {
      document.getElementById('siteNotice').style.display = 'block';
      document.getElementById('saveSiteDot').style.display = 'inline-block';
    }

    // Profile display
    const nameEl = document.getElementById('currentProfileName');
    const descEl = document.getElementById('currentProfileDescription');
    const profileCardHome = document.querySelector('.profile-card-home');
    const changeBtn = document.getElementById('changeProfileBtn');
    if (profile && PROFILES[profile]) {
      nameEl.textContent = PROFILES[profile].name;
      nameEl.style.color = '#111827'; nameEl.style.fontWeight = '600';
      descEl.textContent = PROFILES[profile].desc || '';
      descEl.style.color = '#6B7280';
      if (profileCardHome) { profileCardHome.style.background = ''; profileCardHome.style.border = ''; }
      if (changeBtn) { changeBtn.textContent = 'Change profile'; changeBtn.style.fontWeight = ''; }
    } else {
      nameEl.textContent = 'Set up your profile';
      nameEl.style.color = 'var(--brand)'; nameEl.style.fontWeight = '600';
      descEl.textContent = 'Answer 5 quick questions to personalise Equols';
      descEl.style.color = 'var(--muted)';
      if (profileCardHome) { profileCardHome.style.background = 'var(--brand-light)'; profileCardHome.style.border = '1px solid var(--brand)'; }
      if (changeBtn) { changeBtn.textContent = 'Take the quiz →'; changeBtn.style.fontWeight = '600'; }
    }

    // Display sliders
    const fontSize = s.fontSize != null ? s.fontSize : 16;
    const lineHeight = s.lineHeight != null ? s.lineHeight : 1.6;
    const letterSpacing = s.letterSpacing != null ? s.letterSpacing : 0;
    document.getElementById('fontSizeSlider').value = fontSize;
    document.getElementById('fontSizeValue').textContent = fontSize;
    document.getElementById('lineHeightSlider').value = lineHeight;
    document.getElementById('lineHeightValue').textContent = parseFloat(lineHeight).toFixed(1);
    document.getElementById('letterSpacingSlider').value = letterSpacing;
    document.getElementById('letterSpacingValue').textContent = letterSpacing;

    // Font buttons
    const ff = s.fontFamily;
    let activeFontId = 'fontDefault';
    if (ff === 'lexend' || ff === 'dyslexia') activeFontId = 'fontDyslexia';
    else if (ff === 'georgia' || ff === 'serif') activeFontId = 'fontSerif';
    setActiveFontButton(activeFontId);

    // Visual
    document.getElementById('toggleDarkMode').checked = vs.darkMode || false;
    document.getElementById('toggleTextOnly').checked = vs.textOnly || false;
    const cbf = vs.colourBlindFilter || 'none';
    document.querySelectorAll('.cbf-btn').forEach(b => { const on = b.dataset.cbf === cbf; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    document.getElementById('contrastToggle').checked = vs.contrastBoost || false;
    document.getElementById('linksToggle').checked = vs.forceLinkUnderlines || false;
    document.getElementById('rulerToggle').checked = vs.readingRuler || false;
    document.getElementById('lineFocusToggle').checked = vs.lineFocus || false;
    const imgOp = vs.imageOpacity != null ? vs.imageOpacity : 100;
    document.getElementById('imageOpacitySlider').value = imgOp;
    document.getElementById('imageOpacityValue').textContent = imgOp + '%';
    document.getElementById('focusRingsToggle').checked = vs.enhanceFocusIndicators || false;

    // Cognitive
    document.getElementById('distractionToggle').checked = cs.distractionRemoval || false;
    document.getElementById('breakReminderToggle').checked = cs.breakReminder || false;
    document.getElementById('breakIntervalInput').value = cs.breakInterval || 20;
    document.getElementById('chunkingToggle').checked = cs.autoChunking || false;
    document.getElementById('toggleSentenceHighlight').checked = cs.sentenceHighlight || false;
    document.getElementById('readTimeToggle').checked = cs.readTime || false;
    const rl = cs.readingLevel || 'default';
    document.querySelectorAll('[data-reading]').forEach(b => { const on = b.dataset.reading === rl; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });

    // Motor
    document.getElementById('targetsToggle').checked = ms.enlargeClickTargets || false;
    document.getElementById('stickyNavToggle').checked = ms.toggleStickyNav || false;
    document.getElementById('motionToggle').checked = ms.reduceMotion || false;

    // Sensory
    document.getElementById('autoplayToggle').checked = ss.blockAutoplay || false;
    document.getElementById('animationsToggle').checked = ss.removeAnimations || false;
    document.getElementById('urgencyToggle').checked = ss.blockUrgency || false;
    const bright = ss.imageBrightness != null ? ss.imageBrightness : 100;
    document.getElementById('brightSlider').value = bright;
    document.getElementById('brightValue').textContent = bright + '%';

    // Language
    const simp = ls.simplification || 'off';
    document.querySelectorAll('[data-simplify]').forEach(b => { const on = b.dataset.simplify === simp; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    document.getElementById('tooltipsToggle').checked = ls.tooltips || false;
    document.getElementById('complexWordsToggle').checked = ls.complexWords || false;
    document.getElementById('ttsToggle').checked = ls.tts || false;
    document.getElementById('translationToggle').checked = ls.translation || false;

    // Sensory mode button state
    const sensoryBtn = document.getElementById('sensoryModeBtn');
    if (sensoryBtn) {
      const sensoryActive = ss.sensoryMode || false;
      if (sensoryActive) {
        sensoryBtn.style.background = '#1E3A8A'; sensoryBtn.style.color = 'white';
        sensoryBtn.innerHTML = '✓ Sensory safe mode — ON';
      } else {
        sensoryBtn.style.background = 'white'; sensoryBtn.style.color = '#1E3A8A';
        sensoryBtn.innerHTML = 'Sensory safe mode';
      }
    }

    // Profile cards
    document.querySelectorAll('.profile-card').forEach(c => { const on = c.dataset.profile === profile; c.classList.toggle('active', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });

    updateNavBadges();
    updateSliderHints();
}

function updateSliderHints() {
  const fs = document.getElementById('fontSizeSlider');
  const hfs = document.getElementById('hint-fontSize');
  if (fs && hfs) hfs.textContent = fs.value === '16' ? '(default)' : fs.value + 'px';

  const lh = document.getElementById('lineHeightSlider');
  const hlh = document.getElementById('hint-lineHeight');
  if (lh && hlh) hlh.textContent = parseFloat(lh.value).toFixed(1) === '1.6' ? '(default)' : parseFloat(lh.value).toFixed(1);

  const ls = document.getElementById('letterSpacingSlider');
  const hls = document.getElementById('hint-letterSpacing');
  if (ls && hls) hls.textContent = ls.value === '0' ? '(default)' : ls.value + 'px';

  const io = document.getElementById('imageOpacitySlider');
  const hio = document.getElementById('hint-imageOpacity');
  if (io && hio) hio.textContent = io.value === '100' ? 'full' : io.value + '%';

  const br = document.getElementById('brightSlider');
  const hbr = document.getElementById('hint-brightness');
  if (br && hbr) hbr.textContent = br.value === '100' ? 'full' : br.value + '%';
}

function updateNavBadges() {
  chrome.storage.local.get(['cognifySettings','visualSettings','cognitiveSettings','motorSettings','sensorySettings','languageSettings'], r => {
    const s = r.cognifySettings || {};
    const vs = r.visualSettings || {};
    const cs = r.cognitiveSettings || {};
    const ms = r.motorSettings || {};
    const ss = r.sensorySettings || {};
    const ls = r.languageSettings || {};

    const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? 'block' : 'none'; };

    show('badge-display',
      (s.fontFamily && s.fontFamily !== 'default') ||
      (s.fontSize != null && s.fontSize !== 16) ||
      (s.lineHeight != null && parseFloat(s.lineHeight) !== 1.6) ||
      (s.letterSpacing != null && parseFloat(s.letterSpacing) !== 0)
    );
    show('badge-visual',
      vs.darkMode || vs.textOnly || vs.contrastBoost || vs.forceLinkUnderlines ||
      vs.readingRuler || vs.lineFocus || vs.enhanceFocusIndicators ||
      (vs.colourBlindFilter && vs.colourBlindFilter !== 'none')
    );
    show('badge-cognitive',
      cs.distractionRemoval || cs.breakReminder || cs.autoChunking ||
      cs.sentenceHighlight || cs.readTime
    );
    show('badge-motor', ms.enlargeClickTargets || ms.toggleStickyNav || ms.reduceMotion);
    show('badge-sensory',
      ss.blockAutoplay || ss.removeAnimations || ss.blockUrgency ||
      (ss.imageBrightness != null && ss.imageBrightness !== 100)
    );
    show('badge-language',
      ls.tooltips || ls.complexWords || ls.tts || ls.translation ||
      (ls.simplification && ls.simplification !== 'off')
    );
  });
}

function setupListeners() {
  // Navigation
  document.getElementById('changeProfileBtn').addEventListener('click', () => showView('view3-profiles'));
  document.getElementById('displayBtn').addEventListener('click', () => showView('view2-display'));
  document.getElementById('visualBtn').addEventListener('click', () => showView('view-visual'));
  document.getElementById('cognitiveBtn').addEventListener('click', () => showView('view-cognitive'));
  document.getElementById('motorBtn').addEventListener('click', () => showView('view-motor'));
  document.getElementById('sensoryBtn').addEventListener('click', () => showView('view-sensory'));
  document.getElementById('languageBtn').addEventListener('click', () => showView('view-language'));

  // Back buttons
  ['backFromDisplay','backFromProfiles','backFromVisual','backFromCognitive','backFromMotor','backFromSensory','backFromLanguage'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => showView('view1-home'));
  });

  // Adapt / Summary
  document.getElementById('adaptBtn').addEventListener('click', handleAdaptPage);
  document.getElementById('summaryBtn').addEventListener('click', handleGetSummary);

  // Font buttons
  document.querySelectorAll('.style-btn[data-font]').forEach(btn => {
    btn.addEventListener('click', () => { handleFontChange(btn.dataset.font); updateNavBadges(); });
  });

  // Sliders - display
  function clampInt(val, min, max) { const n = parseInt(val, 10); if (!isFinite(n)) return min; return Math.min(Math.max(n, min), max); }
  function clampFloat(val, min, max) { const n = parseFloat(val); if (!isFinite(n)) return min; return Math.min(Math.max(n, min), max); }
  document.getElementById('fontSizeSlider').addEventListener('input', e => {
    const v = clampInt(e.target.value, 14, 24);
    document.getElementById('fontSizeValue').textContent = v;
    saveDisplay('fontSize', v);
    execScript((v) => { let s = document.getElementById('cognify-sliders'); if (!s) { s = document.createElement('style'); s.id = 'cognify-sliders'; document.head.appendChild(s); } s.textContent = 'p,li,span,a{font-size:'+v+'px!important}'; }, [v]);
    updateSliderHints(); updateNavBadges();
  });
  document.getElementById('lineHeightSlider').addEventListener('input', e => {
    const v = clampFloat(e.target.value, 1.2, 2.2);
    document.getElementById('lineHeightValue').textContent = v.toFixed(1);
    saveDisplay('lineHeight', v);
    execScript((v) => { let s = document.getElementById('cognify-lh'); if (!s) { s = document.createElement('style'); s.id = 'cognify-lh'; document.head.appendChild(s); } s.textContent = 'p,li,span,a{line-height:'+v+'!important}'; }, [v]);
    updateSliderHints(); updateNavBadges();
  });
  document.getElementById('letterSpacingSlider').addEventListener('input', e => {
    const v = clampFloat(e.target.value, 0, 3);
    document.getElementById('letterSpacingValue').textContent = v;
    saveDisplay('letterSpacing', v);
    execScript((v) => { let s = document.getElementById('cognify-ls'); if (!s) { s = document.createElement('style'); s.id = 'cognify-ls'; document.head.appendChild(s); } s.textContent = 'p,li,span,a{letter-spacing:'+v+'px!important}'; }, [v]);
    updateSliderHints(); updateNavBadges();
  });

  // Visual
  document.getElementById('toggleDarkMode').addEventListener('change', e => { saveVisual('darkMode', e.target.checked); execScript((en) => { if (window.applyDarkMode) window.applyDarkMode(en); }, [e.target.checked]); updateNavBadges(); });
  document.getElementById('toggleTextOnly').addEventListener('change', e => { saveVisual('textOnly', e.target.checked); execScript((en) => { if (window.applyTextOnly) window.applyTextOnly(en); }, [e.target.checked]); updateNavBadges(); });
  document.querySelectorAll('.cbf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cbf-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
      saveVisual('colourBlindFilter', btn.dataset.cbf);
      execScript((t) => { if (window.applyColourBlindFilter) window.applyColourBlindFilter(t); }, [btn.dataset.cbf]);
      updateNavBadges();
    });
  });
  document.getElementById('contrastToggle').addEventListener('change', e => { saveVisual('contrastBoost', e.target.checked); execScript((en) => { if (window.applyContrastBoost) window.applyContrastBoost(en); }, [e.target.checked]); updateNavBadges(); });
  document.getElementById('linksToggle').addEventListener('change', e => { saveVisual('forceLinkUnderlines', e.target.checked); execScript((en) => { if (window.forceLinkUnderlines) window.forceLinkUnderlines(en); }, [e.target.checked]); updateNavBadges(); });
  document.getElementById('rulerToggle').addEventListener('change', e => { saveVisual('readingRuler', e.target.checked); execScript((en) => { if (window.toggleReadingRuler) window.toggleReadingRuler(en); }, [e.target.checked]); updateNavBadges(); });
  document.getElementById('lineFocusToggle').addEventListener('change', e => { saveVisual('lineFocus', e.target.checked); execScript((en) => { if (window.toggleLineFocus) window.toggleLineFocus(en); }, [e.target.checked]); updateNavBadges(); });
  document.getElementById('imageOpacitySlider').addEventListener('input', e => {
    document.getElementById('imageOpacityValue').textContent = e.target.value + '%';
    saveVisual('imageOpacity', parseInt(e.target.value));
    execScript((lv) => { if (window.applyImageMuter) window.applyImageMuter(lv); }, [parseInt(e.target.value)]);
    updateSliderHints(); updateNavBadges();
  });
  document.getElementById('focusRingsToggle').addEventListener('change', e => { saveVisual('enhanceFocusIndicators', e.target.checked); execScript((en) => { if (window.enhanceFocusIndicators) window.enhanceFocusIndicators(en); }, [e.target.checked]); updateNavBadges(); });

  // Cognitive
  document.getElementById('distractionToggle').addEventListener('change', e => { saveCognitive('distractionRemoval', e.target.checked); execScriptSafe('toggleDistractionRemoval', (en) => { if (window.toggleDistractionRemoval) window.toggleDistractionRemoval(en); }, [e.target.checked]); updateNavBadges(); });
  document.querySelectorAll('[data-reading]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-reading]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
      saveCognitive('readingLevel', btn.dataset.reading);
      execScript((lv) => { if (window.setReadingLevel) window.setReadingLevel(lv); }, [btn.dataset.reading]);
      updateNavBadges();
    });
  });
  document.getElementById('breakReminderToggle').addEventListener('change', e => {
    const mins = parseInt(document.getElementById('breakIntervalInput').value) || 20;
    saveCognitive('breakReminder', e.target.checked);
    saveCognitive('breakInterval', mins);
    execScriptSafe('toggleBreakReminder', (en, m) => { if (window.toggleBreakReminder) window.toggleBreakReminder(en, m); }, [e.target.checked, mins]);
    updateNavBadges();
  });
  document.getElementById('breakIntervalInput').addEventListener('input', e => {
    if (document.getElementById('breakReminderToggle').checked) {
      const mins = parseInt(e.target.value) || 20;
      saveCognitive('breakInterval', mins);
      execScriptSafe('toggleBreakReminder', (en, m) => { if (window.toggleBreakReminder) window.toggleBreakReminder(en, m); }, [true, mins]);
    }
  });
  document.getElementById('chunkingToggle').addEventListener('change', e => { saveCognitive('autoChunking', e.target.checked); execScriptSafe('toggleAutoChunking', (en) => { if (window.toggleAutoChunking) window.toggleAutoChunking(en); }, [e.target.checked]); updateNavBadges(); });
  document.getElementById('toggleSentenceHighlight').addEventListener('change', e => { saveCognitive('sentenceHighlight', e.target.checked); execScriptSafe('toggleSentenceHighlight', (en) => { if (window.toggleSentenceHighlight) window.toggleSentenceHighlight(en); }, [e.target.checked]); updateNavBadges(); });
  document.getElementById('readTimeToggle').addEventListener('change', e => { saveCognitive('readTime', e.target.checked); execScriptSafe('showReadingTime', (en) => { if (window.showReadingTime) window.showReadingTime(en); }, [e.target.checked]); updateNavBadges(); });

  // Motor
  document.getElementById('targetsToggle').addEventListener('change', e => { saveMotor('enlargeClickTargets', e.target.checked); execScript((en) => { if (window.enlargeClickTargets) window.enlargeClickTargets(en); }, [e.target.checked]); updateNavBadges(); });
  document.getElementById('stickyNavToggle').addEventListener('change', e => { saveMotor('toggleStickyNav', e.target.checked); execScript((en) => { if (window.toggleStickyNav) window.toggleStickyNav(en); }, [e.target.checked]); updateNavBadges(); });
  document.getElementById('motionToggle').addEventListener('change', e => { saveMotor('reduceMotion', e.target.checked); execScript((en) => { if (window.reduceMotion) window.reduceMotion(en); }, [e.target.checked]); updateNavBadges(); });

  // Sensory
  document.getElementById('sensoryModeBtn').addEventListener('click', () => {
    const btn = document.getElementById('sensoryModeBtn');
    const active = btn.dataset.active === 'true';
    const enable = !active;
    btn.dataset.active = enable ? 'true' : 'false';
    if (enable) {
      btn.style.background = '#1E3A8A'; btn.style.color = 'white';
      btn.innerHTML = '✓ Sensory safe mode — ON';
    } else {
      btn.style.background = 'white'; btn.style.color = '#1E3A8A';
      btn.innerHTML = 'Sensory safe mode';
    }
    document.getElementById('autoplayToggle').checked = enable;
    document.getElementById('animationsToggle').checked = enable;
    document.getElementById('urgencyToggle').checked = enable;
    saveSensory('sensoryMode', enable);
    chrome.storage.local.set({ sensoryModeActive: enable });
    execScript((en) => { if (window.toggleSensoryMode) window.toggleSensoryMode(en); }, [enable]);
    updateNavBadges();
  });
  document.getElementById('autoplayToggle').addEventListener('change', e => { saveSensory('blockAutoplay', e.target.checked); execScript((en) => { if (window.blockAutoplay) window.blockAutoplay(en); }, [e.target.checked]); updateNavBadges(); });
  document.getElementById('animationsToggle').addEventListener('change', e => { saveSensory('removeAnimations', e.target.checked); execScript((en) => { if (window.removeAnimations) window.removeAnimations(en); }, [e.target.checked]); updateNavBadges(); });
  document.getElementById('urgencyToggle').addEventListener('change', e => { saveSensory('blockUrgency', e.target.checked); execScript((en) => { if (window.blockUrgencyElements) window.blockUrgencyElements(en); }, [e.target.checked]); updateNavBadges(); });
  document.getElementById('brightSlider').addEventListener('input', e => {
    document.getElementById('brightValue').textContent = e.target.value + '%';
    saveSensory('imageBrightness', parseInt(e.target.value));
    execScript((lv) => { if (window.dimBrightImages) window.dimBrightImages(true, lv); }, [parseInt(e.target.value)]);
    updateSliderHints(); updateNavBadges();
  });

  // Language
  document.querySelectorAll('[data-simplify]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-simplify]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
      saveLanguage('simplification', btn.dataset.simplify);
      const map = { 'off': 0, 'light': 1, 'heavy': 2 };
      const lvl = map[btn.dataset.simplify] !== undefined ? map[btn.dataset.simplify] : btn.dataset.simplify;
      execScript((lv) => { if (window.setLanguageSimplification) window.setLanguageSimplification(lv); }, [lvl]);
      updateNavBadges();
    });
  });
  document.getElementById('tooltipsToggle').addEventListener('change', e => { saveLanguage('tooltips', e.target.checked); execScript((en) => { if (window.toggleTooltips) window.toggleTooltips(en); }, [e.target.checked]); updateNavBadges(); });
  document.getElementById('complexWordsToggle').addEventListener('change', e => { saveLanguage('complexWords', e.target.checked); execScript((en) => { if (window.highlightComplexWords) window.highlightComplexWords(en); }, [e.target.checked]); updateNavBadges(); });
  document.getElementById('ttsToggle').addEventListener('change', e => { saveLanguage('tts', e.target.checked); execScript((en) => { if (window.toggleTextToSpeech) window.toggleTextToSpeech(en); }, [e.target.checked]); updateNavBadges(); });
  document.getElementById('translationToggle').addEventListener('change', e => { saveLanguage('translation', e.target.checked); execScript((en) => { if (window.addTranslationButton) window.addTranslationButton(en); }, [e.target.checked]); updateNavBadges(); });

  // Profile cards
  document.querySelectorAll('.profile-card').forEach(card => {
    card.addEventListener('click', () => handleProfileSelect(card.dataset.profile));
  });

  // Site memory
  document.getElementById('saveSiteBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].url) return;
      let hostname = '';
      try { hostname = new URL(tabs[0].url).hostname; } catch(e) {}
      if (!hostname) return;
      chrome.storage.local.get(['cognifySettings','cognifyProfile','visualSettings','cognitiveSettings','motorSettings','sensorySettings','languageSettings'], data => {
        const siteKey = 'site_' + hostname;
        chrome.storage.local.set({ [siteKey]: data }, () => {
          chrome.storage.local.get([siteKey], (verification) => {
            console.log('[Equols] Site settings saved for', hostname, ':', verification[siteKey]);
          });
          const btn = document.getElementById('saveSiteBtn');
          const dot = document.getElementById('saveSiteDot');
          dot.style.display = 'inline-block';
          document.getElementById('siteNotice').style.display = 'block';
          btn.textContent = '';
          btn.appendChild(dot);
          btn.appendChild(document.createTextNode('Saved for this site ✓'));
          btn.style.color = '#16a34a';
          btn.style.borderColor = '#16a34a';
          setTimeout(() => {
            btn.textContent = '';
            btn.appendChild(dot);
            btn.appendChild(document.createTextNode('Save for this site'));
            btn.style.color = '#2563EB';
            btn.style.borderColor = '#2563EB';
          }, 2000);
        });
      });
    });
  });

  document.getElementById('clearSiteBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].url) return;
      let hostname = '';
      try { hostname = new URL(tabs[0].url).hostname; } catch(e) {}
      if (!hostname) return;
      chrome.storage.local.remove('site_' + hostname, () => {
        document.getElementById('siteNotice').style.display = 'none';
        document.getElementById('saveSiteDot').style.display = 'none';
        const btn = document.getElementById('clearSiteBtn');
        btn.textContent = 'Cleared ✓';
        setTimeout(() => { btn.textContent = 'Clear site settings'; }, 2000);
      });
    });
  });

  // Utility
  document.getElementById('retakeQuizBtn').addEventListener('click', () => {
    chrome.storage.local.remove(['quizCompleted', 'cognifyProfile'], () => {
      resetOnboarding();
      showView('view-onboarding');
    });
  });
  document.getElementById('resetSettingsLink').addEventListener('click', resetSettings);

  // API key
  chrome.storage.local.get(['apiKey'], r => {
    const input = document.getElementById('apiKeyInput');
    if (input && r.apiKey) input.placeholder = 'Key saved ✓';
  });
  document.getElementById('saveApiKey').addEventListener('click', () => {
    const input = document.getElementById('apiKeyInput');
    const val = input ? input.value.trim() : '';
    if (!val) return;
    chrome.storage.local.set({ apiKey: val }, () => {
      input.value = '';
      input.placeholder = 'Key saved ✓';
      const btn = document.getElementById('saveApiKey');
      btn.textContent = 'Saved ✓'; btn.style.color = '#16a34a';
      setTimeout(() => { btn.textContent = 'Save key'; btn.style.color = 'var(--brand)'; }, 2000);
    });
  });

  setupOnboardingListeners();
}

function handleFontChange(fontValue) {
  const idMap = { 'default': 'fontDefault', 'dyslexia': 'fontDyslexia', 'serif': 'fontSerif' };
  setActiveFontButton(idMap[fontValue] || 'fontDefault');
  saveDisplay('fontFamily', fontValue);
  execScript((font) => {
    const existing = document.getElementById('cognify-font');
    if (font === 'default') { if (existing) existing.remove(); return; }
    let s = existing || document.createElement('style');
    s.id = 'cognify-font';
    if (font === 'dyslexia') {
      if (!document.getElementById('cognify-font-face-popup')) { const fontUrl = chrome.runtime.getURL('fonts/Lexend.woff2'); const ff = document.createElement('style'); ff.id = 'cognify-font-face-popup'; ff.textContent = "@font-face { font-family: Lexend; src: url('" + fontUrl + "') format('woff2'); font-display: swap; }"; document.head.appendChild(ff); }
      s.textContent = "p,h1,h2,h3,h4,h5,h6,li,span,a,td{font-family:Lexend,sans-serif!important}";
    } else if (font === 'serif') {
      s.textContent = "p,h1,h2,h3,h4,h5,h6,li,span,a,td{font-family:Georgia,serif!important}";
    }
    if (!document.getElementById('cognify-font')) document.head.appendChild(s);
  }, [fontValue]);
}

function handleAdaptPage() {
  const btn = document.getElementById('adaptBtn');
  const status = document.getElementById('statusDiv');
  btn.disabled = true;
  btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px">Adapting <span class="cognify-spinner"></span></span>';
  status.textContent = ''; status.style.color = '#6b7280';
  execScript(() => {
    document.querySelectorAll('p').forEach(p => {
      if (!p.innerText || p.innerText.trim().length < 60) return;
      p.style.borderLeft = '3px solid #2563EB'; p.style.paddingLeft = '12px';
      p.style.backgroundColor = '#F8FAFF'; p.style.borderRadius = '4px'; p.style.marginBottom = '16px';
      const text = p.innerHTML; const end = text.search(/[.!?]/);
      if (end !== -1) p.innerHTML = '<strong>' + text.substring(0, end+1) + '</strong>' + text.substring(end+1);
    });
  });
  setTimeout(() => {
    btn.innerHTML = 'Adapt this page';
    btn.disabled = false;
    status.textContent = 'Page adapted ✓'; status.style.color = '#16a34a';
    setTimeout(() => { status.textContent = ''; }, 2000);
  }, 600);
}

function handleGetSummary() {
  const btn = document.getElementById('summaryBtn');
  const status = document.getElementById('statusDiv');
  btn.disabled = true;
  btn.innerHTML = '<span style="display:inline-flex;align-items:center;justify-content:center;gap:8px">Getting summary <span class="cognify-spinner" style="border-top-color:#1E3A8A;border-color:rgba(30,58,138,0.3);border-top-color:#1E3A8A"></span></span>';
  status.textContent = ''; status.style.color = '#6b7280';
  execScript(() => {
    const existing = document.getElementById('cognify-summary'); if (existing) existing.remove();
    const container = document.querySelector('article') || document.querySelector('main') || document.body;
    const div = document.createElement('div'); div.id = 'cognify-summary';
    div.style.cssText = 'background:#EEF2FF;border-left:4px solid #2563EB;padding:16px;margin-bottom:24px;border-radius:8px;font-family:inherit;';
    div.innerHTML = '<strong>Key points</strong><ul style="margin:8px 0 0 20px"><li>This article covers a major recent news event.</li><li>Key people and organisations are involved.</li><li>The outcome is still developing.</li><li>Experts have shared different views on what happens next.</li></ul>';
    container.insertBefore(div, container.firstChild);
  });
  setTimeout(() => {
    btn.innerHTML = 'Get summary';
    btn.disabled = false;
    status.textContent = 'Summary added ✓'; status.style.color = '#16a34a';
    setTimeout(() => { status.textContent = ''; }, 2000);
  }, 600);
}

function handleProfileSelect(profileKey) {
  document.querySelectorAll('.profile-card').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
  const card = document.querySelector('.profile-card[data-profile="'+profileKey+'"]');
  if (card) { card.classList.add('active'); card.setAttribute('aria-pressed', 'true'); }
  if (PROFILES[profileKey]) {
    document.getElementById('currentProfileName').textContent = PROFILES[profileKey].name;
    document.getElementById('currentProfileDescription').textContent = PROFILES[profileKey].description;
  }
  const profileSettings = {
    'focused-reader': { fontSize: 20, lineHeight: 1.8, letterSpacing: 1, fontFamily: 'lexend' },
    'calm-browser': { fontSize: 18, lineHeight: 2.0, letterSpacing: 0.5, fontFamily: 'georgia' },
    'quick-scanner': { fontSize: 16, lineHeight: 1.4, letterSpacing: 0, fontFamily: 'default' },
    'deep-diver': { fontSize: 17, lineHeight: 1.7, letterSpacing: 0.5, fontFamily: 'default' },
    'just-bigger-text': { fontSize: 22, lineHeight: 1.6, letterSpacing: 0, fontFamily: 'default' }
  };
  const profile = profileSettings[profileKey];
  if (profile) {
    chrome.storage.local.set({ cognifyProfile: profileKey, cognifySettings: profile });
    document.getElementById('fontSizeSlider').value = profile.fontSize;
    document.getElementById('fontSizeValue').textContent = profile.fontSize;
    document.getElementById('lineHeightSlider').value = profile.lineHeight;
    document.getElementById('lineHeightValue').textContent = profile.lineHeight.toFixed(1);
    document.getElementById('letterSpacingSlider').value = profile.letterSpacing;
    document.getElementById('letterSpacingValue').textContent = profile.letterSpacing;
    const idMap = { 'lexend': 'fontDyslexia', 'georgia': 'fontSerif', 'default': 'fontDefault' };
    setActiveFontButton(idMap[profile.fontFamily] || 'fontDefault');
  }
  showView('view1-home');
}

function resetSettings() {
  chrome.storage.local.clear(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: () => {
            ['cognify-font','cognify-colour','cognify-contrast','cognify-contrast-bg','cognify-links','cognify-cbf-svg','cognify-cbf-style','cognify-focus','cognify-motion','cognify-scroll','cognify-targets','cognify-anim','cognify-urgency','cognify-bright','cognify-reading','cognify-distraction','cognify-progress-bar','cognify-ruler','cognify-lf-top','cognify-lf-bottom','cognify-summary','cognify-tt','cognify-break','cognify-translate-btn','cognify-readtime','cognify-readtime-sub','cognify-tts-bar','cognify-timer-badge','cognify-darkmode','cognify-textonly','cognify-sliders','cognify-lh','cognify-ls','cognify-imgmute'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
            document.documentElement.style.filter = '';
            if (window.cognifyTTHandler) { document.removeEventListener('mouseover', window.cognifyTTHandler); window.cognifyTTHandler = null; }
            if (window.cognifyBreakTimer) { clearInterval(window.cognifyBreakTimer); window.cognifyBreakTimer = null; }
            if (window.speechSynthesis) window.speechSynthesis.cancel();
          }
        });
      }
    });
    // Reset all toggle inputs to off
    document.querySelectorAll('input[type="checkbox"]').forEach(el => { el.checked = false; });
    // Reset sliders
    const fsSlider = document.getElementById('fontSizeSlider');
    if (fsSlider) { fsSlider.value = 16; document.getElementById('fontSizeValue').textContent = '16'; }
    const lhSlider = document.getElementById('lineHeightSlider');
    if (lhSlider) { lhSlider.value = 1.6; document.getElementById('lineHeightValue').textContent = '1.6'; }
    const lsSlider = document.getElementById('letterSpacingSlider');
    if (lsSlider) { lsSlider.value = 0; document.getElementById('letterSpacingValue').textContent = '0'; }
    const imgSlider = document.getElementById('imageOpacitySlider');
    if (imgSlider) { imgSlider.value = 100; document.getElementById('imageOpacityValue').textContent = '100%'; }
    const brightSlider = document.getElementById('brightSlider');
    if (brightSlider) { brightSlider.value = 100; document.getElementById('brightValue').textContent = '100%'; }
    // Reset font buttons — activate Default
    setActiveFontButton('fontDefault');
    // Reset btn-group button groups to their defaults
    document.querySelectorAll('.cbf-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    const noneBtn = document.querySelector('.cbf-btn[data-cbf="none"]');
    if (noneBtn) { noneBtn.classList.add('active'); noneBtn.setAttribute('aria-pressed', 'true'); }
    document.querySelectorAll('[data-reading]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    const defaultReading = document.querySelector('[data-reading="default"]');
    if (defaultReading) { defaultReading.classList.add('active'); defaultReading.setAttribute('aria-pressed', 'true'); }
    document.querySelectorAll('[data-simplify]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    const offSimplify = document.querySelector('[data-simplify="off"]');
    if (offSimplify) { offSimplify.classList.add('active'); offSimplify.setAttribute('aria-pressed', 'true'); }
    // Reset profile card to quiz nudge
    const nameEl = document.getElementById('currentProfileName');
    const descEl = document.getElementById('currentProfileDescription');
    const changeBtn = document.getElementById('changeProfileBtn');
    const profileCardHome = document.querySelector('.profile-card-home');
    if (nameEl) { nameEl.textContent = 'Set up your profile'; nameEl.style.color = 'var(--brand)'; nameEl.style.fontWeight = '600'; }
    if (descEl) { descEl.textContent = 'Answer 5 quick questions to personalise Equols'; descEl.style.color = 'var(--muted)'; }
    if (profileCardHome) { profileCardHome.style.background = 'var(--brand-light)'; profileCardHome.style.border = '1px solid var(--brand)'; }
    if (changeBtn) { changeBtn.textContent = 'Take the quiz →'; changeBtn.style.fontWeight = '600'; }
    document.querySelectorAll('.profile-card').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
    // Hide site notice and clear status
    document.getElementById('siteNotice').style.display = 'none';
    document.getElementById('saveSiteDot').style.display = 'none';
    document.getElementById('statusDiv').textContent = '';
  });
}

// ── Onboarding ──

function resetOnboarding() {
  _scores = { visual: 0, cognitive: 0, sensory: 0, motor: 0, language: 0 };
  _currentQ = 0;
  _selectedIdx = null;
  _answers = [];
  _resultProfileKey = null;
  document.getElementById('onboard-welcome').style.display = 'block';
  document.getElementById('onboard-quiz').style.display = 'none';
  document.getElementById('onboard-pick').style.display = 'none';
  document.getElementById('onboard-result').style.display = 'none';
}

function getProfileFromScores() {
  const entries = Object.entries(_scores).sort((a, b) => b[1] - a[1]);
  const topScore = entries[0][1];
  if (topScore === 0) return 'all-round';
  const topCategory = entries[0][0];
  if (topCategory === 'visual') return 'clear-viewer';
  if (topCategory === 'cognitive') return 'focused-reader';
  if (topCategory === 'sensory') return 'calm-browser';
  if (topCategory === 'language') return 'word-explorer';
  if (topCategory === 'motor') return 'easy-navigator';
  return 'all-round';
}

function renderQ(index) {
  document.getElementById('quiz-fill').style.width = (index / 5 * 100) + '%';
  document.getElementById('quiz-step').textContent = 'Question ' + (index + 1) + ' of 5';
  document.getElementById('quiz-q').textContent = QUESTIONS[index].text;
  const optsEl = document.getElementById('quiz-opts');
  optsEl.textContent = '';
  QUESTIONS[index].options.forEach(function(opt, i) {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt-btn';
    btn.textContent = opt.label;
    btn.addEventListener('click', function() {
      optsEl.querySelectorAll('.quiz-opt-btn').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      _selectedIdx = i;
      const nextBtn = document.getElementById('quiz-next-btn');
      nextBtn.disabled = false;
      nextBtn.style.opacity = '1';
    });
    optsEl.appendChild(btn);
  });
  _selectedIdx = null;
  const nextBtn = document.getElementById('quiz-next-btn');
  nextBtn.disabled = true;
  nextBtn.style.opacity = '0.4';
  const backBtn = document.getElementById('quiz-back-btn');
  backBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
}

function handleNext() {
  if (_selectedIdx === null) return;
  const scoreAdds = QUESTIONS[_currentQ].options[_selectedIdx].scores;
  Object.keys(scoreAdds).forEach(function(k) { _scores[k] += scoreAdds[k]; });
  _answers.push(_selectedIdx);
  _currentQ++;
  if (_currentQ < 5) {
    renderQ(_currentQ);
  } else {
    const profileKey = getProfileFromScores();
    showResult(profileKey);
  }
}

function showResult(profileKey) {
  _resultProfileKey = profileKey;
  const profile = PROFILES[profileKey];
  if (!profile) return;
  document.getElementById('result-emoji').textContent = profile.emoji;
  document.getElementById('result-name').textContent = profile.name;
  document.getElementById('result-desc').textContent = profile.desc;
  const list = document.getElementById('result-features-list');
  list.textContent = '';
  profile.features.forEach(function(feat) {
    const li = document.createElement('li');
    li.textContent = feat;
    list.appendChild(li);
  });
  document.getElementById('onboard-quiz').style.display = 'none';
  document.getElementById('onboard-pick').style.display = 'none';
  document.getElementById('onboard-welcome').style.display = 'none';
  document.getElementById('onboard-result').style.display = 'block';
}

function applyProfileSettings(profileKey) {
  const profile = PROFILES[profileKey];
  if (!profile) return;
  const s = profile.settings;
  if (s.distractionToggle)      { saveCognitive('distractionRemoval', true); execScript((en) => { if (window.toggleDistractionRemoval) window.toggleDistractionRemoval(en); }, [true]); }
  if (s.readTimeToggle)         { saveCognitive('readTime', true); execScript((en) => { if (window.showReadingTime) window.showReadingTime(en); }, [true]); }
  if (s.toggleSentenceHighlight){ saveCognitive('sentenceHighlight', true); execScript((en) => { if (window.toggleSentenceHighlight) window.toggleSentenceHighlight(en); }, [true]); }
  if (s.toggleDarkMode)         { saveVisual('darkMode', true); execScript((en) => { if (window.applyDarkMode) window.applyDarkMode(en); }, [true]); }
  if (s.autoplayToggle)         { saveSensory('blockAutoplay', true); execScript((en) => { if (window.blockAutoplay) window.blockAutoplay(en); }, [true]); }
  if (s.tooltipsToggle)         { saveLanguage('tooltips', true); execScript((en) => { if (window.toggleTooltips) window.toggleTooltips(en); }, [true]); }
  if (s.complexWordsToggle)     { saveLanguage('complexWords', true); execScript((en) => { if (window.highlightComplexWords) window.highlightComplexWords(en); }, [true]); }
  if (s.rulerToggle)            { saveVisual('readingRuler', true); execScript((en) => { if (window.toggleReadingRuler) window.toggleReadingRuler(en); }, [true]); }
  if (s.contrastToggle)         { saveVisual('contrastBoost', true); execScript((en) => { if (window.applyContrastBoost) window.applyContrastBoost(en); }, [true]); }
  if (s.motionToggle)           { saveMotor('reduceMotion', true); execScript((en) => { if (window.reduceMotion) window.reduceMotion(en); }, [true]); }
  if (s.targetsToggle)          { saveMotor('enlargeClickTargets', true); execScript((en) => { if (window.enlargeClickTargets) window.enlargeClickTargets(en); }, [true]); }
  if (s.urgencyToggle)          { saveSensory('blockUrgency', true); execScript((en) => { if (window.blockUrgencyElements) window.blockUrgencyElements(en); }, [true]); }
  chrome.storage.local.set({ cognifyProfile: profileKey, quizCompleted: true });
}

function navigateToHome(profileKey) {
  const key = profileKey || _resultProfileKey;
  showView('view1-home');
  if (key && PROFILES[key]) {
    const nameEl = document.getElementById('currentProfileName');
    const descEl = document.getElementById('currentProfileDescription');
    nameEl.textContent = PROFILES[key].name;
    nameEl.style.color = '#111827'; nameEl.style.fontWeight = '600';
    descEl.textContent = PROFILES[key].desc;
    descEl.style.color = '#6B7280';
  }
}

function setupOnboardingListeners() {
  document.getElementById('onboard-quiz-btn').addEventListener('click', () => {
    resetOnboarding();
    document.getElementById('onboard-welcome').style.display = 'none';
    document.getElementById('onboard-quiz').style.display = 'block';
    renderQ(0);
  });

  document.getElementById('onboard-pick-btn').addEventListener('click', () => {
    document.getElementById('onboard-welcome').style.display = 'none';
    document.getElementById('onboard-pick').style.display = 'block';
  });

  document.getElementById('onboard-skip-btn').addEventListener('click', () => {
    chrome.storage.local.set({ quizCompleted: true }, () => showView('view1-home'));
  });

  document.getElementById('pick-back-btn').addEventListener('click', () => {
    document.getElementById('onboard-pick').style.display = 'none';
    document.getElementById('onboard-welcome').style.display = 'block';
  });

  document.getElementById('quiz-back-btn').addEventListener('click', () => {
    if (_currentQ > 0) {
      _currentQ--;
      const undoneIdx = _answers.pop();
      if (undoneIdx !== undefined) {
        const scoreAdds = QUESTIONS[_currentQ].options[undoneIdx].scores;
        Object.keys(scoreAdds).forEach(k => { _scores[k] -= scoreAdds[k]; });
      }
      renderQ(_currentQ);
    } else {
      document.getElementById('onboard-quiz').style.display = 'none';
      document.getElementById('onboard-welcome').style.display = 'block';
    }
  });

  document.getElementById('quiz-next-btn').addEventListener('click', handleNext);

  document.querySelectorAll('#onboard-pick .profile-option').forEach(card => {
    card.addEventListener('click', () => {
      const profileKey = card.dataset.profile;
      applyProfileSettings(profileKey);
      showResult(profileKey);
      setTimeout(() => navigateToHome(profileKey), 1500);
    });
  });

  document.getElementById('result-start-btn').addEventListener('click', () => {
    if (_resultProfileKey) applyProfileSettings(_resultProfileKey);
    navigateToHome();
  });
}
