# ElevenLabs Text-to-Speech Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add human-like emotional text-to-speech to the novel reader using ElevenLabs API, with a floating mini-player, voice/speed controls, and settings integration.

**Architecture:** A Vercel serverless function (`api/tts.js`) proxies TTS requests to ElevenLabs, keeping the API key server-side. A client-side module (`js/tts.js`) handles text extraction, chunking, audio playback, and UI state. The reader gets a "Listen" button in the topbar and a floating mini-player when TTS is active.

**Tech Stack:** ElevenLabs REST API (`/v1/text-to-speech/{voice_id}`), Web Audio API for playback, Vercel serverless functions for proxying.

---

## File Structure

| File | Purpose |
|------|---------|
| `api/tts.js` | **Create.** Vercel serverless function — proxies TTS requests to ElevenLabs, keeps API key server-side |
| `js/tts.js` | **Create.** Client-side TTS module — text extraction, chunking, API calls, playback, UI state |
| `reader.html` | **Modify.** Add Listen button to topbar + floating mini-player HTML + TTS section in settings panel |
| `css/styles.css` | **Modify.** Add mini-player styles, listen button styles, TTS settings section styles |
| `reader.js` | **Modify.** Import and initialize TTS module, wire Listen button click |

---

### Task 1: Create the Vercel Serverless Proxy

**Files:**
- Create: `api/tts.js`

The API key must never be exposed to the browser. This serverless function holds the key as an environment variable and proxies requests.

- [ ] **Step 1: Create the serverless function**

```js
// api/tts.js
// Vercel serverless function — proxies TTS requests to ElevenLabs API
// API key is stored as ELEVENLABS_API_KEY environment variable

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
  }

  const { text, voice_id, model_id, voice_settings } = req.body;

  if (!text || !voice_id) {
    return res.status(400).json({ error: 'text and voice_id are required' });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: model_id || 'eleven_multilingual_v2',
          voice_settings: voice_settings || {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    // Stream the audio back to the client
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (err) {
    console.error('TTS proxy error:', err);
    return res.status(500).json({ error: 'TTS request failed' });
  }
};
```

- [ ] **Step 2: Set the environment variable on Vercel**

Run in the Vercel project directory (or via Vercel dashboard):
```bash
cd Z:\novels\novel-website
npx vercel env add ELEVENLABS_API_KEY production
# Paste: sk_8152011f422a417dc08dd5dfc4e3e6a330c558f6f7aca5ed
```

- [ ] **Step 3: Commit**

```bash
git add api/tts.js
git commit -m "feat: add ElevenLabs TTS serverless proxy"
```

---

### Task 2: Create the Client-Side TTS Module

**Files:**
- Create: `js/tts.js`

This module handles: extracting text from the chapter, chunking it for the API (ElevenLabs limit ~5000 chars/request), calling the proxy, managing audio playback, and UI state.

- [ ] **Step 1: Create the TTS module**

```js
// js/tts.js — ElevenLabs Text-to-Speech for the novel reader
(function () {
  'use strict';

  const API_ENDPOINT = '/api/tts';
  const MAX_CHUNK_CHARS = 4500; // safe limit under ElevenLabs 5000 cap
  const STORAGE_KEY = 'ls_tts_settings';

  // Available ElevenLabs voices (popular narrative voices)
  const VOICES = [
    { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George — Warm British narrator' },
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel — Expressive American female' },
    { id: 'AntFXlOjovAvBfMFSCdD', name: 'Antoni — Versatile narrator' },
    { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill — Deep American male' },
    { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian — American male narrator' },
    { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel — British male narrator' },
  ];

  const MODELS = [
    { id: 'eleven_multilingual_v2', name: 'Multilingual v2 (recommended)' },
    { id: 'eleven_flash_v2_5', name: 'Flash v2.5 (faster, lower quality)' },
  ];

  let state = {
    isPlaying: false,
    isLoading: false,
    currentAudio: null,
    currentChapterId: null,
    chunks: [],
    chunkIndex: 0,
    voiceId: VOICES[0].id,
    modelId: MODELS[0].id,
    speed: 1.0,
  };

  // --- Utility ---

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function extractChapterText() {
    const contentEl = document.getElementById('chapter-content');
    if (!contentEl) return '';
    // Get text from <p> elements, preserving paragraph breaks
    const paragraphs = contentEl.querySelectorAll('p');
    return Array.from(paragraphs)
      .map((p) => p.textContent.trim())
      .filter((t) => t.length > 0)
      .join('\n\n');
  }

  function chunkText(text) {
    if (text.length <= MAX_CHUNK_CHARS) return [text];

    const chunks = [];
    const paragraphs = text.split('\n\n');
    let current = '';

    for (const para of paragraphs) {
      if ((current + '\n\n' + para).length > MAX_CHUNK_CHARS && current) {
        chunks.push(current);
        current = para;
      } else {
        current = current ? current + '\n\n' + para : para;
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }

  // --- Settings persistence ---

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved.voiceId) state.voiceId = saved.voiceId;
      if (saved.modelId) state.modelId = saved.modelId;
      if (saved.speed) state.speed = saved.speed;
    } catch (e) { /* ignore */ }
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      voiceId: state.voiceId,
      modelId: state.modelId,
      speed: state.speed,
    }));
  }

  // --- API calls ---

  async function fetchTTSChunk(text) {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice_id: state.voiceId,
        model_id: state.modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || `TTS failed: ${response.status}`);
    }

    return await response.blob();
  }

  // --- Playback ---

  async function playChapter() {
    if (state.isPlaying || state.isLoading) return;

    const text = extractChapterText();
    if (!text) {
      console.warn('TTS: No chapter text found');
      return;
    }

    state.chunks = chunkText(text);
    state.chunkIndex = 0;
    state.isLoading = true;
    updateUI();

    try {
      await playNextChunk();
    } catch (err) {
      console.error('TTS playback error:', err);
      state.isLoading = false;
      state.isPlaying = false;
      updateUI();
      showToast('Failed to load audio: ' + err.message, 'error');
    }
  }

  async function playNextChunk() {
    if (state.chunkIndex >= state.chunks.length) {
      stopPlayback();
      return;
    }

    state.isLoading = true;
    updateUI();

    const blob = await fetchTTSChunk(state.chunks[state.chunkIndex]);
    const url = URL.createObjectURL(blob);

    if (state.currentAudio) {
      URL.revokeObjectURL(state.currentAudio.src);
    }

    const audio = new Audio(url);
    audio.playbackRate = state.speed;
    state.currentAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      state.chunkIndex++;
      if (state.isPlaying && state.chunkIndex < state.chunks.length) {
        playNextChunk();
      } else {
        stopPlayback();
      }
    };

    audio.onerror = (e) => {
      console.error('TTS audio error:', e);
      stopPlayback();
      showToast('Audio playback failed', 'error');
    };

    state.isLoading = false;
    state.isPlaying = true;
    state.currentChapterId = getCurrentChapterId();
    updateUI();

    await audio.play();
  }

  function pausePlayback() {
    if (state.currentAudio) {
      state.currentAudio.pause();
      state.isPlaying = false;
      updateUI();
    }
  }

  function resumePlayback() {
    if (state.currentAudio && !state.isPlaying) {
      state.currentAudio.play();
      state.isPlaying = true;
      updateUI();
    }
  }

  function stopPlayback() {
    if (state.currentAudio) {
      state.currentAudio.pause();
      state.currentAudio.currentTime = 0;
      URL.revokeObjectURL(state.currentAudio.src);
      state.currentAudio = null;
    }
    state.isPlaying = false;
    state.isLoading = false;
    state.chunks = [];
    state.chunkIndex = 0;
    updateUI();
  }

  function getCurrentChapterId() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('chapter')) || 1;
  }

  // --- UI Updates ---

  function updateUI() {
    const listenBtn = document.getElementById('tts-listen-btn');
    const player = document.getElementById('tts-player');
    const playPauseBtn = document.getElementById('tts-play-pause');
    const stopBtn = document.getElementById('tts-stop');
    const loadingEl = document.getElementById('tts-loading');
    const progressEl = document.getElementById('tts-progress');
    const chunkInfoEl = document.getElementById('tts-chunk-info');

    if (!player) return;

    // Show/hide player
    const active = state.isPlaying || state.isLoading;
    player.classList.toggle('active', active);
    if (listenBtn) listenBtn.classList.toggle('active', active);

    // Loading state
    if (loadingEl) loadingEl.classList.toggle('hidden', !state.isLoading);

    // Play/Pause button
    if (playPauseBtn) {
      playPauseBtn.innerHTML = state.isPlaying
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    }

    // Progress
    if (progressEl && state.chunks.length > 0) {
      const pct = ((state.chunkIndex + 1) / state.chunks.length) * 100;
      progressEl.style.width = pct + '%';
    }

    // Chunk info
    if (chunkInfoEl && state.chunks.length > 1) {
      chunkInfoEl.textContent = `Part ${state.chunkIndex + 1} of ${state.chunks.length}`;
      chunkInfoEl.classList.remove('hidden');
    } else if (chunkInfoEl) {
      chunkInfoEl.classList.add('hidden');
    }
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `tts-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --- Public API ---

  window.TTS = {
    VOICES,
    MODELS,

    init() {
      loadSettings();
      this.bindEvents();
      this.populateSettings();
    },

    bindEvents() {
      // Listen button in topbar
      const listenBtn = document.getElementById('tts-listen-btn');
      if (listenBtn) {
        listenBtn.addEventListener('click', () => {
          if (state.isPlaying) {
            stopPlayback();
          } else if (state.isLoading) {
            return;
          } else {
            playChapter();
          }
        });
      }

      // Play/Pause in mini-player
      const playPauseBtn = document.getElementById('tts-play-pause');
      if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
          if (state.isPlaying) pausePlayback();
          else if (state.chunks.length > 0) resumePlayback();
          else playChapter();
        });
      }

      // Stop in mini-player
      const stopBtn = document.getElementById('tts-stop');
      if (stopBtn) {
        stopBtn.addEventListener('click', stopPlayback);
      }

      // Speed selector in mini-player
      const speedBtns = document.querySelectorAll('.tts-speed-btn');
      speedBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const speed = parseFloat(btn.dataset.speed);
          state.speed = speed;
          if (state.currentAudio) state.currentAudio.playbackRate = speed;
          speedBtns.forEach((b) => b.classList.toggle('active', b === btn));
          saveSettings();
        });
      });

      // Settings panel — voice select
      const voiceSelect = document.getElementById('tts-voice-select');
      if (voiceSelect) {
        voiceSelect.addEventListener('change', (e) => {
          state.voiceId = e.target.value;
          saveSettings();
        });
      }

      // Settings panel — model select
      const modelSelect = document.getElementById('tts-model-select');
      if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
          state.modelId = e.target.value;
          saveSettings();
        });
      }
    },

    populateSettings() {
      // Voice select
      const voiceSelect = document.getElementById('tts-voice-select');
      if (voiceSelect) {
        voiceSelect.innerHTML = VOICES.map(
          (v) => `<option value="${v.id}" ${v.id === state.voiceId ? 'selected' : ''}>${v.name}</option>`
        ).join('');
      }

      // Model select
      const modelSelect = document.getElementById('tts-model-select');
      if (modelSelect) {
        modelSelect.innerHTML = MODELS.map(
          (m) => `<option value="${m.id}" ${m.id === state.modelId ? 'selected' : ''}>${m.name}</option>`
        ).join('');
      }

      // Speed buttons
      const speedBtns = document.querySelectorAll('.tts-speed-btn');
      speedBtns.forEach((btn) => {
        btn.classList.toggle('active', parseFloat(btn.dataset.speed) === state.speed);
      });
    },

    // Called when a new chapter is loaded — stop any playing TTS
    onChapterChange() {
      if (state.isPlaying || state.isLoading) {
        stopPlayback();
      }
    },

    getState() {
      return { ...state };
    },
  };
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/tts.js
git commit -m "feat: add client-side TTS module with ElevenLabs integration"
```

---

### Task 3: Add TTS HTML to Reader

**Files:**
- Modify: `reader.html`

- [ ] **Step 1: Add Listen button to the topbar**

In `reader.html`, find the `<button id="settings-btn">` and add the Listen button before it:

```html
<!-- Add BEFORE the settings-btn line -->
<button id="tts-listen-btn" class="icon-btn" title="Listen to chapter">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 18V5l12-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="16" r="3"/>
  </svg>
</button>
```

- [ ] **Step 2: Add floating mini-player HTML**

Add this right before the closing `</body>` tag (before the script tags):

```html
<!-- TTS Mini-Player -->
<div id="tts-player" class="tts-player">
  <div class="tts-player-inner">
    <div id="tts-loading" class="tts-loading hidden">
      <div class="tts-spinner"></div>
      <span>Loading audio...</span>
    </div>
    <div class="tts-player-controls">
      <button id="tts-play-pause" class="tts-control-btn" title="Play/Pause">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
      </button>
      <button id="tts-stop" class="tts-control-btn" title="Stop">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>
      </button>
      <div class="tts-progress-container">
        <div id="tts-progress" class="tts-progress-bar"></div>
      </div>
      <span id="tts-chunk-info" class="tts-chunk-info hidden"></span>
      <div class="tts-speed-group">
        <button class="tts-speed-btn" data-speed="0.75">0.75x</button>
        <button class="tts-speed-btn active" data-speed="1">1x</button>
        <button class="tts-speed-btn" data-speed="1.25">1.25x</button>
        <button class="tts-speed-btn" data-speed="1.5">1.5x</button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add TTS section to the settings panel**

In the `#settings-panel` div, add a new setting group at the end of `.settings-body` (before the closing `</div>` of `.settings-body`):

```html
<!-- TTS Settings -->
<div class="setting-group">
  <label>Text to Speech</label>
  <div class="tts-setting-row">
    <label for="tts-voice-select">Voice</label>
    <select id="tts-voice-select"></select>
  </div>
  <div class="tts-setting-row">
    <label for="tts-model-select">Model</label>
    <select id="tts-model-select"></select>
  </div>
</div>
```

- [ ] **Step 4: Add TTS script tag**

In `reader.html`, add the TTS script tag after `reading-modes.js` and before the inline script:

```html
<script src="js/tts.js?v=20260728"></script>
```

- [ ] **Step 5: Commit**

```bash
git add reader.html
git commit -m "feat: add TTS HTML elements to reader (listen button, mini-player, settings)"
```

---

### Task 4: Add TTS Styles

**Files:**
- Modify: `css/styles.css`

- [ ] **Step 1: Add TTS styles**

Add these at the end of the reader section in `css/styles.css` (after the reader-related styles, around line 1350):

```css
/* ========================================
   TTS — Text-to-Speech Mini-Player
   ======================================== */

/* Listen button in topbar */
#tts-listen-btn {
  position: relative;
}
#tts-listen-btn.active {
  color: var(--primary);
}
#tts-listen-btn.active::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--primary);
}

/* Floating mini-player */
.tts-player {
  position: fixed;
  bottom: -80px;
  left: 50%;
  transform: translateX(-50%);
  width: min(92vw, 520px);
  z-index: 50;
  transition: bottom 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}
.tts-player.active {
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  pointer-events: auto;
}
.tts-player-inner {
  background: var(--surface-alt);
  border: 1px solid var(--outline);
  border-radius: var(--radius-xl);
  padding: 0.75rem 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12px);
}
.tts-player-controls {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}
.tts-control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius);
  background: var(--container-low);
  color: var(--on-surface);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease;
}
.tts-control-btn:hover {
  background: var(--primary);
  color: white;
}
#tts-play-pause {
  width: 40px;
  height: 40px;
}
#tts-play-pause svg {
  margin-left: 2px;
}

/* TTS progress bar */
.tts-progress-container {
  flex: 1;
  height: 4px;
  background: var(--outline);
  border-radius: 2px;
  overflow: hidden;
}
.tts-progress-bar {
  height: 100%;
  background: var(--primary);
  border-radius: 2px;
  width: 0%;
  transition: width 0.3s ease;
}

/* Chunk info */
.tts-chunk-info {
  font-size: var(--font-label-sm);
  color: var(--on-surface-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

/* Speed group */
.tts-speed-group {
  display: flex;
  gap: 2px;
  background: var(--container-low);
  border-radius: var(--radius);
  padding: 2px;
  flex-shrink: 0;
}
.tts-speed-btn {
  border: none;
  background: transparent;
  color: var(--on-surface-secondary);
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.25rem 0.375rem;
  border-radius: calc(var(--radius) - 2px);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.tts-speed-btn.active {
  background: var(--primary);
  color: white;
}
.tts-speed-btn:hover:not(.active) {
  color: var(--on-surface);
}

/* Loading spinner */
.tts-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  margin-bottom: 0.5rem;
  font-size: var(--font-label-sm);
  color: var(--on-surface-secondary);
}
.tts-loading.hidden {
  display: none;
}
.tts-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--outline);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: tts-spin 0.6s linear infinite;
}
@keyframes tts-spin {
  to { transform: rotate(360deg); }
}

/* TTS settings section */
.tts-setting-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.tts-setting-row label {
  font-size: var(--font-label-sm);
  color: var(--on-surface-secondary);
}
.tts-setting-row select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--outline);
  border-radius: var(--radius);
  background: var(--container-low);
  color: var(--on-surface);
  font-size: var(--font-body-sm);
}

/* Toast notification */
.tts-toast {
  position: fixed;
  bottom: 6rem;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius);
  font-size: var(--font-label-md);
  color: white;
  z-index: 100;
  opacity: 0;
  transition: all 0.3s ease;
  pointer-events: none;
}
.tts-toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.tts-toast.error {
  background: #ef4444;
}
.tts-toast.info {
  background: var(--primary);
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .tts-player {
    width: calc(100vw - 2rem);
    bottom: -80px;
  }
  .tts-player.active {
    bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
  }
  .tts-player-inner {
    padding: 0.625rem 0.75rem;
    border-radius: var(--radius-lg);
  }
  .tts-speed-group {
    display: none; /* hide speed on mobile — use settings panel instead */
  }
  .tts-control-btn {
    width: 32px;
    height: 32px;
  }
  #tts-play-pause {
    width: 36px;
    height: 36px;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add css/styles.css
git commit -m "feat: add TTS mini-player and listen button styles"
```

---

### Task 5: Wire Up TTS in reader.js

**Files:**
- Modify: `js/reader.js`

- [ ] **Step 1: Initialize TTS in init()**

In `reader.js`, inside the `init()` function, after `bindEvents()` is called (around line 55), add:

```js
// Initialize TTS
if (typeof TTS !== 'undefined') TTS.init();
```

- [ ] **Step 2: Stop TTS on chapter change**

In `reader.js`, inside the `loadChapter()` function, at the very beginning (around line 91), add:

```js
// Stop TTS when navigating to a new chapter
if (typeof TTS !== 'undefined') TTS.onChapterChange();
```

- [ ] **Step 3: Commit**

```bash
git add js/reader.js
git commit -m "feat: wire TTS initialization and chapter-change stop in reader"
```

---

### Task 6: Deploy and Test

- [ ] **Step 1: Test locally**

```bash
cd Z:\novels\novel-website
npx vercel dev
```

Open `http://localhost:3000/reader.html?novel=sky-pride&chapter=1` and verify:
1. Listen button appears in topbar (music note icon)
2. Clicking Listen shows the floating mini-player
3. Audio plays with the chapter content
4. Play/pause/stop controls work
5. Speed buttons change playback rate
6. Settings panel has Voice and Model dropdowns
7. TTS stops when navigating to a new chapter

- [ ] **Step 2: Deploy to production**

```bash
npx vercel --prod
```

- [ ] **Step 3: Verify production deployment**

Visit `https://luminascript.vercel.app/reader.html?novel=sky-pride&chapter=1` and test all TTS features.

---

## Notes

- **ElevenLabs free tier:** 10,000 characters/month (~10-12 min audio). Users on the free tier will get roughly 1-2 full chapters before hitting the limit.
- **Long chapters:** Chapters over 4500 chars are automatically chunked. The mini-player shows "Part X of Y" when chunked.
- **Voice selection:** 6 curated narrative voices are pre-configured. The user can change voices in the settings panel.
- **API key:** Stored as `ELEVENLABS_API_KEY` Vercel environment variable, never exposed to the browser.
