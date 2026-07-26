// js/themes.js - Theme switcher logic

const ThemeManager = {
  _current: 'violet',
  _dark: false,

  THEMES: [
    { id: 'violet', name: 'Violet', emoji: '✨' },
    { id: 'sakura', name: 'Sakura', emoji: '🌸' },
    { id: 'ocean', name: 'Ocean', emoji: '🌊' },
    { id: 'sunset', name: 'Sunset', emoji: '🌅' },
    { id: 'forest', name: 'Forest', emoji: '🌲' },
    { id: 'neon', name: 'Neon', emoji: '⚡' },
  ],

  init() {
    this._current = localStorage.getItem('ls_colorTheme') || 'violet';
    this._dark = localStorage.getItem('ls_theme') === 'dark';
    this._apply();
    this._renderDots();
  },

  setTheme(id) {
    this._current = id;
    localStorage.setItem('ls_colorTheme', id);
    this._apply();
    this._renderDots();
    document.dispatchEvent(new CustomEvent('themechange', { detail: { color: id } }));
  },

  toggleDark() {
    this._dark = !this._dark;
    localStorage.setItem('ls_theme', this._dark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', this._dark ? 'dark' : 'light');
    this._renderDots();
  },

  getTheme() { return this._current; },
  isDark() { return this._dark; },

  _apply() {
    document.documentElement.setAttribute('data-color', this._current);
    document.documentElement.setAttribute('data-theme', this._dark ? 'dark' : 'light');
  },

  _renderDots() {
    const containers = document.querySelectorAll('.theme-dots');
    containers.forEach(container => {
      container.innerHTML = this.THEMES.map(t => `
        <button class="theme-dot ${t.id === this._current ? 'active' : ''}"
                data-theme-id="${t.id}"
                title="${t.name}"
                style="--dot-color: var(--${t.id === this._current ? 'primary' : 'outline'})"
                aria-label="${t.name} theme">
        </button>
      `).join('');
      container.querySelectorAll('.theme-dot').forEach(dot => {
        dot.addEventListener('click', () => this.setTheme(dot.dataset.themeId));
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
