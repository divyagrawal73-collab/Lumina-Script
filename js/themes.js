// js/themes.js - Theme switcher logic

const ThemeManager = {
  _current: 'violet',
  _dark: false,

  THEMES: [
    { id: 'violet', name: 'Violet', emoji: '✨', color: '#8b5cf6' },
    { id: 'sakura', name: 'Sakura', emoji: '🌸', color: '#ec4899' },
    { id: 'ocean', name: 'Ocean', emoji: '🌊', color: '#0ea5e9' },
    { id: 'sunset', name: 'Sunset', emoji: '🌅', color: '#f97316' },
    { id: 'forest', name: 'Forest', emoji: '🌲', color: '#22c55e' },
    { id: 'neon', name: 'Neon', emoji: '⚡', color: '#06b6d4' },
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
                style="background: ${t.color}"
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
