// js/tts.js — ElevenLabs Text-to-Speech for the novel reader
(function () {
  'use strict';

  const API_ENDPOINT = '/api/tts';
  const MAX_CHUNK_CHARS = 4500;
  const STORAGE_KEY = 'ls_tts_settings';

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
    { id: 'eleven_flash_v2_5', name: 'Flash v2.5 (faster)' },
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

  function extractChapterText() {
    const contentEl = document.getElementById('chapter-content');
    if (!contentEl) return '';
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

  async function fetchTTSChunk(text) {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice_id: state.voiceId,
        model_id: state.modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || 'TTS failed: ' + response.status);
    }
    return await response.blob();
  }

  async function playChapter() {
    if (state.isPlaying || state.isLoading) return;
    const text = extractChapterText();
    if (!text) return;
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
    audio.onerror = () => {
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

  function updateUI() {
    const listenBtn = document.getElementById('tts-listen-btn');
    const player = document.getElementById('tts-player');
    const playPauseBtn = document.getElementById('tts-play-pause');
    const loadingEl = document.getElementById('tts-loading');
    const progressEl = document.getElementById('tts-progress');
    const chunkInfoEl = document.getElementById('tts-chunk-info');
    if (!player) return;
    const active = state.isPlaying || state.isLoading;
    player.classList.toggle('active', active);
    if (listenBtn) listenBtn.classList.toggle('active', active);
    if (loadingEl) loadingEl.classList.toggle('hidden', !state.isLoading);
    if (playPauseBtn) {
      playPauseBtn.innerHTML = state.isPlaying
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    }
    if (progressEl && state.chunks.length > 0) {
      const pct = ((state.chunkIndex + 1) / state.chunks.length) * 100;
      progressEl.style.width = pct + '%';
    }
    if (chunkInfoEl && state.chunks.length > 1) {
      chunkInfoEl.textContent = 'Part ' + (state.chunkIndex + 1) + ' of ' + state.chunks.length;
      chunkInfoEl.classList.remove('hidden');
    } else if (chunkInfoEl) {
      chunkInfoEl.classList.add('hidden');
    }
  }

  function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = 'tts-toast ' + (type || 'info');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.classList.add('show'); }, 10);
    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }

  window.TTS = {
    VOICES: VOICES,
    MODELS: MODELS,
    init: function() {
      loadSettings();
      this.bindEvents();
      this.populateSettings();
    },
    bindEvents: function() {
      var listenBtn = document.getElementById('tts-listen-btn');
      if (listenBtn) {
        listenBtn.addEventListener('click', function() {
          if (state.isPlaying) stopPlayback();
          else if (!state.isLoading) playChapter();
        });
      }
      var playPauseBtn = document.getElementById('tts-play-pause');
      if (playPauseBtn) {
        playPauseBtn.addEventListener('click', function() {
          if (state.isPlaying) pausePlayback();
          else if (state.chunks.length > 0) resumePlayback();
          else playChapter();
        });
      }
      var stopBtn = document.getElementById('tts-stop');
      if (stopBtn) stopBtn.addEventListener('click', stopPlayback);
      var speedBtns = document.querySelectorAll('.tts-speed-btn');
      speedBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          var speed = parseFloat(btn.dataset.speed);
          state.speed = speed;
          if (state.currentAudio) state.currentAudio.playbackRate = speed;
          speedBtns.forEach(function(b) { b.classList.toggle('active', b === btn); });
          saveSettings();
        });
      });
      var voiceSelect = document.getElementById('tts-voice-select');
      if (voiceSelect) {
        voiceSelect.addEventListener('change', function(e) {
          state.voiceId = e.target.value;
          saveSettings();
        });
      }
      var modelSelect = document.getElementById('tts-model-select');
      if (modelSelect) {
        modelSelect.addEventListener('change', function(e) {
          state.modelId = e.target.value;
          saveSettings();
        });
      }
    },
    populateSettings: function() {
      var voiceSelect = document.getElementById('tts-voice-select');
      if (voiceSelect) {
        voiceSelect.innerHTML = VOICES.map(function(v) {
          return '<option value="' + v.id + '"' + (v.id === state.voiceId ? ' selected' : '') + '>' + v.name + '</option>';
        }).join('');
      }
      var modelSelect = document.getElementById('tts-model-select');
      if (modelSelect) {
        modelSelect.innerHTML = MODELS.map(function(m) {
          return '<option value="' + m.id + '"' + (m.id === state.modelId ? ' selected' : '') + '>' + m.name + '</option>';
        }).join('');
      }
      var speedBtns = document.querySelectorAll('.tts-speed-btn');
      speedBtns.forEach(function(btn) {
        btn.classList.toggle('active', parseFloat(btn.dataset.speed) === state.speed);
      });
    },
    onChapterChange: function() {
      if (state.isPlaying || state.isLoading) stopPlayback();
    },
    getState: function() {
      return Object.assign({}, state);
    }
  };
})();
