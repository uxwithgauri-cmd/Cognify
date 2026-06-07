// Profile definitions
const PROFILES = {
  'focused-reader': {
    name: 'Focused Reader',
    description: 'Bigger text, less clutter'
  },
  'calm-browser': {
    name: 'Calm Browser',
    description: 'Warm tones, relaxed pace'
  },
  'quick-scanner': {
    name: 'Quick Scanner',
    description: 'Compact, fast to skim'
  },
  'deep-diver': {
    name: 'Deep Diver',
    description: 'Full detail, no distractions'
  },
  'just-bigger-text': {
    name: 'Just Bigger Text',
    description: 'Simple font size increase only'
  }
};

let currentView = 'view1-home';

// Initialize on popup load
document.addEventListener('DOMContentLoaded', () => {
  loadSettingsFromStorage();
  setupEventListeners();

  // FIX 1 - RETAKE QUIZ: attach listeners to any element referencing retake/quiz text
  document.querySelectorAll('[id*=retake], [id*=quiz], [id*=Retake]').forEach(el => {
    // remove existing click handlers by cloning
    const newEl = el.cloneNode(true);
    el.parentNode.replaceChild(newEl, el);
    newEl.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.storage.local.remove('quizCompleted', function() { window.location.reload(); });
    });
  });

  document.querySelectorAll('a, button, span').forEach(el => {
    if (el.textContent && el.textContent.trim() === 'Retake quiz') {
      const newEl = el.cloneNode(true);
      el.parentNode.replaceChild(newEl, el);
      newEl.addEventListener('click', function(e) {
        e.preventDefault();
        chrome.storage.local.remove('quizCompleted', function() { window.location.reload(); });
      });
    }
  });
});

// Load and display settings from storage
function loadSettingsFromStorage() {
  chrome.storage.local.get(['cognifySettings', 'cognifyProfile'], (result) => {
    const settings = result.cognifySettings || {};
    const profile = result.cognifyProfile;

    // Set profile name and description on home view
    const nameEl = document.getElementById('currentProfileName');
    const descEl = document.getElementById('currentProfileDescription');
    if (profile && PROFILES[profile]) {
      nameEl.textContent = PROFILES[profile].name;
      nameEl.style.color = '#111827';
      nameEl.style.fontWeight = '600';
      descEl.textContent = PROFILES[profile].description;
      descEl.style.color = '#6B7280';
    } else {
      nameEl.textContent = 'No profile set';
      nameEl.style.color = '#9CA3AF';
      nameEl.style.fontWeight = '400';
      descEl.textContent = 'Take the quiz to get started';
      descEl.style.color = '#9CA3AF';
    }
    // Ensure Change profile link is visible
    const changeBtn = document.getElementById('changeProfileBtn');
    if (changeBtn) changeBtn.style.display = 'inline-block';

    // Update sliders with saved values
    document.getElementById('fontSizeSlider').value = settings.fontSize || 16;
    document.getElementById('fontSizeValue').textContent = settings.fontSize || 16;
    
    document.getElementById('lineHeightSlider').value = settings.lineHeight || 1.6;
    document.getElementById('lineHeightValue').textContent = (settings.lineHeight || 1.6).toFixed(1);
    
    document.getElementById('letterSpacingSlider').value = settings.letterSpacing || 0;
    document.getElementById('letterSpacingValue').textContent = settings.letterSpacing || 0;

    // Mark correct font style button as active
    const fontFamily = settings.fontFamily || 'default';
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.font === fontFamily) {
        btn.classList.add('active');
      }
    });

    // Mark correct colour button as active
    const colourMode = settings.colourMode || 'normal';
    document.querySelectorAll('.colour-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.colour === colourMode) {
        btn.classList.add('active');
      }
    });

    // Set focus toggle to saved state
    document.getElementById('focusModeToggle').checked = settings.focusMode || false;

    // Highlight active profile card
    document.querySelectorAll('.profile-card').forEach(card => {
      card.classList.remove('active');
      if (card.dataset.profile === profile) {
        card.classList.add('active');
      }
    });
  });
}

// Setup all event listeners
function setupEventListeners() {
  // Navigation
  // Navigation buttons
  document.getElementById('changeProfileBtn').addEventListener('click', () => showView('view3-profiles'));
  document.getElementById('displayBtn').addEventListener('click', () => showView('view2-display'));
  document.getElementById('focusBtn').addEventListener('click', () => showView('view4b-focus'));
  document.getElementById('colourBtn').addEventListener('click', () => showView('view4a-colour'));

  // Back buttons
  document.getElementById('backFromDisplay').addEventListener('click', () => showView('view1-home'));
  document.getElementById('backFromProfiles').addEventListener('click', () => showView('view1-home'));
  const backColourA = document.getElementById('backFromColourA');
  if (backColourA) backColourA.addEventListener('click', () => showView('view1-home'));
  const backFocusB = document.getElementById('backFromFocusB');
  if (backFocusB) backFocusB.addEventListener('click', () => showView('view1-home'));

  // Action buttons
  document.getElementById('adaptBtn').addEventListener('click', handleAdaptPage);
  document.getElementById('summaryBtn').addEventListener('click', handleGetSummary);

  // Font style buttons
  document.querySelectorAll('.style-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handleFontChange(e.currentTarget.dataset.font));
  });

  // Sliders
  document.getElementById('fontSizeSlider').addEventListener('input', (e) => handleSliderChange('fontSize', e.target.value));
  document.getElementById('lineHeightSlider').addEventListener('input', (e) => handleSliderChange('lineHeight', e.target.value));
  document.getElementById('letterSpacingSlider').addEventListener('input', (e) => handleSliderChange('letterSpacing', e.target.value));

  // Colour mode buttons
  document.querySelectorAll('.colour-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handleColourChange(e.currentTarget.dataset.colour));
  });

  // Focus mode toggle
  document.getElementById('focusModeToggle').addEventListener('change', (e) => handleFocusMode(e.target.checked));

  // Profile cards
  document.querySelectorAll('.profile-card').forEach(card => {
    card.addEventListener('click', (e) => handleProfileSelect(e.currentTarget.dataset.profile));
  });

  // Utility links
  if (document.getElementById('resetSettingsLink')) {
    document.getElementById('resetSettingsLink').addEventListener('click', resetSettings);
  }
}

// Switch view
function showView(viewId) {
  console.log('Navigating to', viewId);
  document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');
  currentView = viewId;

  // FIX 3 - PROFILE NAME FADING: when returning to home, ensure styles match whether profile set
  if (viewId === 'view1-home') {
    chrome.storage.local.get(['cognifyProfile'], (res) => {
      const profile = res.cognifyProfile;
      const nameEl = document.getElementById('currentProfileName');
      const descEl = document.getElementById('currentProfileDescription');
      if (profile && PROFILES[profile]) {
        if (nameEl) {
          nameEl.style.color = '#111827';
          nameEl.style.fontWeight = '600';
        }
        if (descEl) descEl.style.color = '#6B7280';
      } else {
        if (nameEl) {
          nameEl.style.color = '#9CA3AF';
          nameEl.style.fontWeight = '400';
        }
        if (descEl) descEl.style.color = '#9CA3AF';
      }
    });
  }
}

// FIX 10 - ADAPT PAGE
function handleAdaptPage() {
  const btn = document.getElementById('adaptBtn');
  const status = document.getElementById('statusDiv');
  
  btn.disabled = true;
  status.textContent = 'Adapting...';
  status.style.color = '#6b7280';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: () => {
          // Find all p elements where innerText length > 60
          const paragraphs = document.querySelectorAll('p');
          paragraphs.forEach(p => {
            if (p.innerText.length > 60) {
              // Add styles
              p.style.borderLeft = '3px solid #2563EB';
              p.style.paddingLeft = '12px';
              p.style.backgroundColor = '#F8FAFF';
              p.style.borderRadius = '4px';
              p.style.marginBottom = '16px';
              p.style.transition = 'all 0.3s ease';
              
              // Make first sentence bold
              const text = p.innerHTML;
              const firstSentenceEnd = text.search(/[\.\!\?]/);
              if (firstSentenceEnd !== -1) {
                const firstSentence = text.substring(0, firstSentenceEnd + 1);
                const restText = text.substring(firstSentenceEnd + 1);
                p.innerHTML = '<strong>' + firstSentence + '</strong>' + restText;
              }
            }
          });
        }
      }, (results) => {
        setTimeout(() => {
          status.textContent = 'Page adapted ✓';
          status.style.color = '#16a34a';
          btn.disabled = false;
          setTimeout(() => { status.textContent = ''; }, 2000);
        }, 500);
      });
    }
  });
}

// FIX 5 - GET SUMMARY: Works on any page
function handleGetSummary() {
  const btn = document.getElementById('summaryBtn');
  const status = document.getElementById('statusDiv');
  
  btn.disabled = true;
  status.textContent = 'Getting summary...';
  status.style.color = '#6b7280';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: () => {
          // Remove existing summary if present
          const existing = document.getElementById('cognify-summary');
          if (existing) {
            existing.remove();
          }

          // Find first matching element
          const selectors = ['article', 'main', '.article', '.content', '.post', 'body'];
          let container = null;
          for (let selector of selectors) {
            const el = document.querySelector(selector);
            if (el) {
              container = el;
              break;
            }
          }

          if (container) {
            // Create summary div with exact styles
            const summaryDiv = document.createElement('div');
            summaryDiv.id = 'cognify-summary';
            summaryDiv.style.background = '#EEF2FF';
            summaryDiv.style.borderLeft = '4px solid #2563EB';
            summaryDiv.style.padding = '16px';
            summaryDiv.style.marginBottom = '24px';
            summaryDiv.style.borderRadius = '8px';
            summaryDiv.style.fontFamily = 'inherit';
            
            // Set innerHTML with exact content
            summaryDiv.innerHTML = '<strong>Key points</strong><ul><li>This article covers a major recent news event.</li><li>Key people and organisations are involved in the situation.</li><li>The outcome is still developing with more updates expected.</li><li>Experts have shared different views on what happens next.</li></ul>';
            
            // Insert as first child
            container.insertBefore(summaryDiv, container.firstChild);
          }
        }
      }, (results) => {
        status.textContent = 'Summary added ✓';
        status.style.color = '#16a34a';
        btn.disabled = false;
        setTimeout(() => { status.textContent = ''; }, 2000);
      });
    }
  });
}

// FIX 7 - FONT STYLE BUTTONS
function handleFontChange(fontValue) {
  // Update active button
  document.querySelectorAll('.style-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.style-btn[data-font="${fontValue}"]`).classList.add('active');

  // Save to storage
  chrome.storage.local.get(['cognifySettings'], (result) => {
    const settings = result.cognifySettings || {};
    settings.fontFamily = fontValue;
    chrome.storage.local.set({ cognifySettings: settings });
  });

  // Apply to page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: (font) => {
          if (font === 'default') {
            // Remove font override
            const styleEl = document.getElementById('cognify-font');
            if (styleEl) styleEl.remove();
          } else if (font === 'dyslexia') {
            // Inject link tag for Lexend
            const linkEl = document.createElement('link');
            linkEl.href = 'https://fonts.googleapis.com/css2?family=Lexend&display=swap';
            linkEl.rel = 'stylesheet';
            document.head.appendChild(linkEl);
            
            // Inject style tag
            const styleEl = document.getElementById('cognify-font') || document.createElement('style');
            styleEl.id = 'cognify-font';
            styleEl.textContent = 'p, h1, h2, h3, h4, h5, h6, li, span, a, td { font-family: Lexend, sans-serif !important; }';
            if (!document.getElementById('cognify-font')) {
              document.head.appendChild(styleEl);
            }
          } else if (font === 'serif') {
            // Inject style tag for Georgia serif
            const styleEl = document.getElementById('cognify-font') || document.createElement('style');
            styleEl.id = 'cognify-font';
            styleEl.textContent = 'p, h1, h2, h3, h4, h5, h6, li, span, a, td { font-family: Georgia, serif !important; }';
            if (!document.getElementById('cognify-font')) {
              document.head.appendChild(styleEl);
            }
          }
        },
        args: [fontValue]
      });
    }
  });
}

// FIX 8 - SLIDERS: Font size, line height, letter spacing
function handleSliderChange(type, value) {
  // Update display
  if (type === 'fontSize') {
    document.getElementById('fontSizeValue').textContent = value;
  } else if (type === 'lineHeight') {
    document.getElementById('lineHeightValue').textContent = parseFloat(value).toFixed(1);
  } else if (type === 'letterSpacing') {
    document.getElementById('letterSpacingValue').textContent = value;
  }

  // Save to storage
  chrome.storage.local.get(['cognifySettings'], (result) => {
    const settings = result.cognifySettings || {};
    settings[type] = type === 'fontSize' ? parseInt(value) : parseFloat(value);
    chrome.storage.local.set({ cognifySettings: settings });
  });

  // Apply to page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: (type, val) => {
          const styleEl = document.getElementById('cognify-sliders') || document.createElement('style');
          styleEl.id = 'cognify-sliders';
          
          if (type === 'fontSize') {
            styleEl.textContent = `p, li, span, a { font-size: ${val}px !important; }`;
          } else if (type === 'lineHeight') {
            styleEl.textContent = `p, li, span, a { line-height: ${val} !important; }`;
          } else if (type === 'letterSpacing') {
            styleEl.textContent = `p, li, span, a { letter-spacing: ${val}px !important; }`;
          }
          
          if (!document.getElementById('cognify-sliders')) {
            document.head.appendChild(styleEl);
          }
        },
        args: [type, value]
      });
    }
  });
}

// FIX 6 - COLOUR BUTTONS
function handleColourChange(colourMode) {
  // Mark clicked button as active, unmark others
  document.querySelectorAll('.colour-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.colour-btn[data-colour="${colourMode}"]`).classList.add('active');

  // Save to storage
  chrome.storage.local.get(['cognifySettings'], (result) => {
    const settings = result.cognifySettings || {};
    settings.colourMode = colourMode;
    chrome.storage.local.set({ cognifySettings: settings });
  });

  // Apply to page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: (mode) => {
          if (mode === 'normal') {
            document.documentElement.style.filter = '';
            document.documentElement.style.backgroundColor = '';
          } else if (mode === 'highcontrast') {
            document.documentElement.style.filter = 'invert(1) hue-rotate(180deg)';
          } else if (mode === 'warm') {
            document.documentElement.style.filter = 'sepia(40%) brightness(105%)';
          }
        },
        args: [colourMode]
      });
    }
  });
}

// FIX 9 - FOCUS TOGGLE
function handleFocusMode(isEnabled) {
  // Save to storage
  chrome.storage.local.get(['cognifySettings'], (result) => {
    const settings = result.cognifySettings || {};
    settings.focusMode = isEnabled;
    chrome.storage.local.set({ cognifySettings: settings });
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      if (isEnabled) {
        // Inject function to hide elements and set max-width
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: () => {
            // Hide nav, header, footer, aside, iframe, .ad, .advertisement, .sidebar, .widget
            const elementsToHide = document.querySelectorAll('nav, header, footer, aside, iframe, .ad, .advertisement, .sidebar, .widget');
            elementsToHide.forEach(el => {
              el.style.display = 'none';
            });
            
            // Find article or main and set max-width and margin
            const articleEl = document.querySelector('article');
            const mainEl = document.querySelector('main');
            const targetEl = articleEl || mainEl;
            if (targetEl) {
              targetEl.style.maxWidth = '800px';
              targetEl.style.margin = '0 auto';
            }
          }
        });
      } else {
        // Reload the tab
        chrome.tabs.reload(tabs[0].id);
      }
    }
  });
}

// FIX 11 - PROFILE CARDS
function handleProfileSelect(profileKey) {
  // Update UI - mark card as active
  document.querySelectorAll('.profile-card').forEach(card => card.classList.remove('active'));
  document.querySelector(`.profile-card[data-profile="${profileKey}"]`).classList.add('active');

  // Update profile display on home view
  if (PROFILES[profileKey]) {
    const nameEl = document.getElementById('currentProfileName');
    const descEl = document.getElementById('currentProfileDescription');
    nameEl.textContent = PROFILES[profileKey].name;
    nameEl.style.color = '#111827';
    nameEl.style.fontWeight = '600';
    descEl.textContent = PROFILES[profileKey].description;
    descEl.style.color = '#6B7280';
  }

  // Define profile settings with exact values from FIX 11
  const profileSettings = {
    'focused-reader': {
      fontSize: 20,
      lineHeight: 1.8,
      letterSpacing: 1,
      fontFamily: 'lexend',
      colourFilter: 'none'
    },
    'calm-browser': {
      fontSize: 18,
      lineHeight: 2.0,
      letterSpacing: 0.5,
      fontFamily: 'georgia',
      colourFilter: 'sepia(40%) brightness(105%)'
    },
    'quick-scanner': {
      fontSize: 16,
      lineHeight: 1.4,
      letterSpacing: 0,
      fontFamily: 'default',
      colourFilter: 'none'
    },
    'deep-diver': {
      fontSize: 17,
      lineHeight: 1.7,
      letterSpacing: 0.5,
      fontFamily: 'default',
      colourFilter: 'none'
    },
    'just-bigger-text': {
      fontSize: 22,
      lineHeight: 1.6,
      letterSpacing: 0,
      fontFamily: 'default',
      colourFilter: 'none'
    }
  };

  const profile = profileSettings[profileKey];
  if (profile) {
    // Save profile name and all settings to storage
    chrome.storage.local.set({ 
      cognifyProfile: profileKey,
      cognifySettings: profile 
    });

    // Apply all settings immediately using chrome.scripting.executeScript
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: (settings) => {
            // Apply font-size, line-height, letter-spacing
            const sizeStyleEl = document.getElementById('cognify-profile-size') || document.createElement('style');
            sizeStyleEl.id = 'cognify-profile-size';
            sizeStyleEl.textContent = `p, h1, h2, h3, li, span { font-size: ${settings.fontSize}px !important; line-height: ${settings.lineHeight} !important; letter-spacing: ${settings.letterSpacing}px !important; }`;
            if (!document.getElementById('cognify-profile-size')) {
              document.head.appendChild(sizeStyleEl);
            }

            // Apply font-family
            if (settings.fontFamily === 'lexend') {
              const linkEl = document.createElement('link');
              linkEl.href = 'https://fonts.googleapis.com/css2?family=Lexend&display=swap';
              linkEl.rel = 'stylesheet';
              document.head.appendChild(linkEl);
              
              const fontStyleEl = document.getElementById('cognify-profile-font') || document.createElement('style');
              fontStyleEl.id = 'cognify-profile-font';
              fontStyleEl.textContent = 'p, h1, h2, h3, li, span { font-family: Lexend, sans-serif !important; }';
              if (!document.getElementById('cognify-profile-font')) {
                document.head.appendChild(fontStyleEl);
              }
            } else if (settings.fontFamily === 'georgia') {
              const fontStyleEl = document.getElementById('cognify-profile-font') || document.createElement('style');
              fontStyleEl.id = 'cognify-profile-font';
              fontStyleEl.textContent = 'p, h1, h2, h3, li, span { font-family: Georgia, serif !important; }';
              if (!document.getElementById('cognify-profile-font')) {
                document.head.appendChild(fontStyleEl);
              }
            } else {
              const fontStyleEl = document.getElementById('cognify-profile-font');
              if (fontStyleEl) fontStyleEl.remove();
            }

            // Apply colour filter
            if (settings.colourFilter === 'none') {
              document.documentElement.style.filter = '';
            } else {
              document.documentElement.style.filter = settings.colourFilter;
            }
          },
          args: [profile]
        });
      }
    });

    // Update UI sliders to match profile values
    document.getElementById('fontSizeSlider').value = profile.fontSize;
    document.getElementById('fontSizeValue').textContent = profile.fontSize;
    document.getElementById('lineHeightSlider').value = profile.lineHeight;
    document.getElementById('lineHeightValue').textContent = profile.lineHeight.toFixed(1);
    document.getElementById('letterSpacingSlider').value = profile.letterSpacing;
    document.getElementById('letterSpacingValue').textContent = profile.letterSpacing;
  }

  // Navigate back to home view
  showView('view1-home');
}

// FIX 3 - RETAKE QUIZ
function retakeQuiz() {
  chrome.storage.local.remove(['quizCompleted'], function() { window.location.reload(); });
}

// FIX 4 - RESET SETTINGS
function resetSettings() {
  chrome.storage.local.clear(function() { window.location.reload(); });
}
