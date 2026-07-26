// js/reading-modes.js - Reading mode switcher

const ReadingModes = {
  _current: 'normal',
  MODES: ['normal', 'sepia', 'focus', 'typewriter'],

  init() {
    this._current = localStorage.getItem('ls_readingMode') || 'normal';
    this._apply();
    this._renderButtons();
  },

  setMode(mode) {
    if (!this.MODES.includes(mode)) return;
    this._current = mode;
    localStorage.setItem('ls_readingMode', mode);
    this._apply();
    this._renderButtons();
  },

  getMode() { return this._current; },

  _apply() {
    const content = document.querySelector('.chapter-content') || document.querySelector('.reader-content');
    if (!content) return;

    // Remove all mode classes
    this.MODES.forEach(m => content.classList.remove(`mode-${m}`));
    // Add current mode class
    content.classList.add(`mode-${this._current}`);
  },

  _renderButtons() {
    const container = document.getElementById('readingModes');
    if (!container) return;

    const labels = {
      normal: '📖 Normal',
      sepia: '📜 Sepia',
      focus: '🎯 Focus',
      typewriter: '⌨️ Typewriter'
    };

    container.innerHTML = this.MODES.map(mode => `
      <button class="reading-mode-btn ${mode === this._current ? 'active' : ''}"
              data-mode="${mode}"
              aria-label="${labels[mode]} mode">
        ${labels[mode]}
      </button>
    `).join('');

    container.querySelectorAll('.reading-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });
  }
};

document.addEventListener('DOMContentLoaded', () => ReadingModes.init());