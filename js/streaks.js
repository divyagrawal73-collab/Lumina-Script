// js/streaks.js - Reading streaks, calendar heatmap, and speed tracking

const Streaks = {
  _data: {
    streak: 0,
    longestStreak: 0,
    lastReadDate: null,
    readDates: [], // Array of date strings 'YYYY-MM-DD'
    totalPages: 0,
    totalMinutes: 0,
  },

  init() {
    this._load();
    this._updateStreak();
    this._renderHeatmap();
    this._renderStats();
  },

  _load() {
    try {
      const saved = localStorage.getItem('ls_readingStreaks');
      if (saved) this._data = JSON.parse(saved);
    } catch (e) {}
  },

  _save() {
    localStorage.setItem('ls_readingStreaks', JSON.stringify(this._data));
  },

  // Call this when user reads a page
  trackReading(pages = 1, minutes = 0) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (!this._data.readDates.includes(today)) {
      this._data.readDates.push(today);
    }

    this._data.totalPages += pages;
    this._data.totalMinutes += minutes;
    this._data.lastReadDate = today;

    this._save();
    this._updateStreak();
    this._renderStats();
  },

  _updateStreak() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const readDates = new Set(this._data.readDates);
    let streak = 0;
    let currentDate = new Date(today);

    while (true) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      if (readDates.has(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    this._data.streak = streak;
    this._data.longestStreak = Math.max(this._data.longestStreak, streak);
    this._save();
  },

  _renderHeatmap() {
    const container = document.getElementById('readingHeatmap');
    if (!container) return;

    const today = new Date();
    const days = 365;
    const cellSize = 12;
    const gap = 3;
    const weeks = Math.ceil(days / 7);

    // Create SVG heatmap
    const width = weeks * (cellSize + gap);
    const height = 7 * (cellSize + gap);

    let svg = `<svg width="${width}" height="${height}" class="heatmap-svg">`;

    const readDates = new Set(this._data.readDates);

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const isRead = readDates.has(dateStr);
      const week = Math.floor(i / 7);
      const day = i % 7;

      svg += `<rect
        x="${week * (cellSize + gap)}"
        y="${day * (cellSize + gap)}"
        width="${cellSize}"
        height="${cellSize}"
        rx="2"
        class="heatmap-cell ${isRead ? 'read' : 'unread'}"
        data-date="${dateStr}"
      />`;
    }

    svg += '</svg>';
    container.innerHTML = svg;
  },

  _renderStats() {
    const streakEl = document.getElementById('currentStreak');
    const longestEl = document.getElementById('longestStreak');
    const pagesEl = document.getElementById('totalPages');
    const speedEl = document.getElementById('readingSpeed');

    if (streakEl) streakEl.textContent = `${this._data.streak} days`;
    if (longestEl) longestEl.textContent = `${this._data.longestStreak} days`;
    if (pagesEl) pagesEl.textContent = this._data.totalPages.toLocaleString();

    if (speedEl) {
      const wpm = this._data.totalMinutes > 0
        ? Math.round((this._data.totalPages * 250) / this._data.totalMinutes) // ~250 words per page
        : 0;
      speedEl.textContent = `${wpm} WPM`;
    }
  },

  getStreak() { return this._data.streak; },
  getStats() { return this._data; }
};

// Auto-init on profile page
document.addEventListener('DOMContentLoaded', () => Streaks.init());
