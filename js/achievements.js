// js/achievements.js - Achievement badge system

const Achievements = {
  _unlocked: [],
  BADGES: [
    { id: 'first_steps', name: 'First Steps', description: 'Read your first chapter', icon: '📖', condition: () => Achievements._getStats().chaptersRead >= 1 },
    { id: 'bookworm', name: 'Bookworm', description: 'Read 50 chapters', icon: '🐛', condition: () => Achievements._getStats().chaptersRead >= 50 },
    { id: 'speed_reader', name: 'Speed Reader', description: 'Read 200+ WPM', icon: '⚡', condition: () => Achievements._getStats().wpm >= 200 },
    { id: 'marathon_runner', name: 'Marathon Runner', description: 'Read 100 chapters', icon: '🏃', condition: () => Achievements._getStats().chaptersRead >= 100 },
    { id: 'night_owl', name: 'Night Owl', description: 'Read past midnight', icon: '🦉', condition: () => Achievements._getStats().readPastMidnight },
    { id: 'streak_master', name: 'Streak Master', description: '7-day reading streak', icon: '🔥', condition: () => Achievements._getStats().streak >= 7 },
    { id: 'century_club', name: 'Century Club', description: 'Read 1000 chapters', icon: '💯', condition: () => Achievements._getStats().chaptersRead >= 1000 },
    { id: 'genre_explorer', name: 'Genre Explorer', description: 'Read 3 different novels', icon: '🗺️', condition: () => Achievements._getStats().novelsRead >= 3 },
    { id: 'critic', name: 'Critic', description: 'Rate 5 novels', icon: '⭐', condition: () => Achievements._getStats().ratingsGiven >= 5 },
    { id: 'social_butterfly', name: 'Social Butterfly', description: 'Write 10 comments', icon: '🦋', condition: () => Achievements._getStats().commentsWritten >= 10 },
  ],

  init() {
    this._load();
    this._checkAll();
    this._render();
  },

  _load() {
    try {
      const saved = localStorage.getItem('ls_achievements');
      if (saved) this._unlocked = JSON.parse(saved);
    } catch (e) {}
  },

  _save() {
    localStorage.setItem('ls_achievements', JSON.stringify(this._unlocked));
  },

  _getStats() {
    const streaks = typeof Streaks !== 'undefined' ? Streaks.getStats() : { streak: 0, totalPages: 0, totalMinutes: 0 };
    const chaptersRead = parseInt(localStorage.getItem('ls_chaptersRead') || '0');
    const novelsRead = parseInt(localStorage.getItem('ls_novelsRead') || '0');
    const ratingsGiven = parseInt(localStorage.getItem('ls_ratingsGiven') || '0');
    const commentsWritten = parseInt(localStorage.getItem('ls_commentsWritten') || '0');
    const readPastMidnight = localStorage.getItem('ls_readPastMidnight') === 'true';
    const wpm = streaks.totalMinutes > 0 ? Math.round((streaks.totalPages * 250) / streaks.totalMinutes) : 0;

    return { chaptersRead, novelsRead, ratingsGiven, commentsWritten, readPastMidnight, streak: streaks.streak, wpm };
  },

  _checkAll() {
    this.BADGES.forEach(badge => {
      if (!this._unlocked.includes(badge.id) && badge.condition()) {
        this._unlocked.push(badge.id);
        this._save();
        this._showToast(badge);
      }
    });
  },

  _showToast(badge) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <div class="achievement-toast-icon">${badge.icon}</div>
      <div class="achievement-toast-text">
        <div class="achievement-toast-title">Achievement Unlocked!</div>
        <div class="achievement-toast-name">${badge.name}</div>
      </div>
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  _render() {
    const container = document.getElementById('achievementsGrid');
    if (!container) return;

    container.innerHTML = this.BADGES.map(badge => `
      <div class="achievement-badge ${this._unlocked.includes(badge.id) ? 'unlocked' : 'locked'}">
        <div class="achievement-badge-icon">${badge.icon}</div>
        <div class="achievement-badge-name">${badge.name}</div>
        <div class="achievement-badge-desc">${badge.description}</div>
      </div>
    `).join('');
  },

  // Call these to track progress
  trackChapter() {
    const current = parseInt(localStorage.getItem('ls_chaptersRead') || '0');
    localStorage.setItem('ls_chaptersRead', current + 1);
    this._checkAll();
    this._render();
  },

  trackNovel() {
    const current = parseInt(localStorage.getItem('ls_novelsRead') || '0');
    localStorage.setItem('ls_novelsRead', current + 1);
    this._checkAll();
    this._render();
  },

  trackRating() {
    const current = parseInt(localStorage.getItem('ls_ratingsGiven') || '0');
    localStorage.setItem('ls_ratingsGiven', current + 1);
    this._checkAll();
    this._render();
  },

  trackComment() {
    const current = parseInt(localStorage.getItem('ls_commentsWritten') || '0');
    localStorage.setItem('ls_commentsWritten', current + 1);
    this._checkAll();
    this._render();
  },

  trackMidnightRead() {
    localStorage.setItem('ls_readPastMidnight', 'true');
    this._checkAll();
    this._render();
  }
};

document.addEventListener('DOMContentLoaded', () => Achievements.init());
