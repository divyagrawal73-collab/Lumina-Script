// js/app.js - Homepage logic (Lumina Script)

(function() {
  'use strict';

  const novelGrid = document.getElementById('novel-grid');
  const searchInput = document.getElementById('search');
  const continueReadingSection = document.getElementById('continue-reading');
  const heroCardContainer = document.getElementById('hero-card-container');
  let novels = [];

  async function init() {
    await loadNovels();
    await renderContinueReading();
    bindEvents();
  }

  async function loadNovels() {
    Animations.showSkeleton(novelGrid, () => `
        <div class="skeleton-image"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text short"></div>
    `, 6);
    try {
      const response = await fetch('/data/novels.json?v=20260727b');
      if (!response.ok) throw new Error('Failed to load novels');
      novels = await response.json();
      renderNovels(novels);
    } catch (error) {
      Animations.hideSkeleton(novelGrid, `<div class="error">Error loading novels: ${error.message}</div>`);
    }
  }

  function renderNovels(list) {
    const gridHTML = list.map(novel => `
      <a href="/novel.html?id=${novel.id}" class="book-card">
        <div class="book-tilt">
          <div class="book-tilt-inner">
            <div class="book-cover-wrapper book-floating">
              <img src="${novel.cover}" alt="${escapeHtml(novel.title)}" class="book-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="book-cover-fallback" style="display:none;">${escapeHtml(novel.title.charAt(0))}</div>
            </div>
          </div>
        </div>
        <div class="book-title">${escapeHtml(novel.title)}</div>
        <div class="book-author">${escapeHtml(novel.author)}</div>
        ${novel.tags && novel.tags.length > 0 ? `<div class="card-tags">${novel.tags.slice(0, 3).map(t => `<span class="card-tag">${escapeHtml(t)}</span>`).join('')}${novel.tags.length > 3 ? `<span class="card-tag more">+${novel.tags.length - 3}</span>` : ''}</div>` : ''}
      </a>
    `).join('');
    Animations.hideSkeleton(novelGrid, gridHTML);
  }

  async function renderContinueReading() {
    const progress = await Storage.getAllReadingProgress();

    const progressIds = Object.keys(progress);
    if (progressIds.length === 0) {
      continueReadingSection.classList.add('hidden');
      return;
    }

    // Find the most recently read novel using lastReadAt from progress
    let bestId = null;
    let bestTime = '';
    for (const id of progressIds) {
      const p = progress[id];
      if (!p.lastReadChapter) continue;
      if (!novels.find(n => n.id === id)) continue;
      if (p.lastReadAt > bestTime) {
        bestTime = p.lastReadAt;
        bestId = id;
      }
    }

    if (!bestId) {
      continueReadingSection.classList.add('hidden');
      return;
    }

    continueReadingSection.classList.remove('hidden');

    const novel = novels.find(n => n.id === bestId);
    const novelProgress = progress[bestId];
    const readCount = novelProgress.chaptersRead ? novelProgress.chaptersRead.length : 0;
    const totalChapters = novel.chapterCount || 1;
    const progressPercent = Math.min(100, (readCount / totalChapters) * 100);

    heroCardContainer.innerHTML = `
      <a href="/reader.html?novel=${novel.id}&chapter=${novelProgress.lastReadChapter}" class="hero-card">
        <img src="${novel.cover}" alt="${escapeHtml(novel.title)}" class="hero-cover" onerror="this.style.background='var(--primary-light)'">
        <div class="hero-info">
          <div class="hero-label">Continue Reading</div>
          <div class="hero-title">${escapeHtml(novel.title)}</div>
          <div class="hero-meta">Chapter ${novelProgress.lastReadChapter} of ${totalChapters}</div>
          <div class="hero-progress">
            <div class="hero-progress-bar" style="width: ${progressPercent}%"></div>
          </div>
        </div>
      </a>
    `;
  }

  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  function bindEvents() {
    const debouncedSearch = debounce((query) => {
      const filtered = novels.filter(n => 
        n.title.toLowerCase().includes(query) || 
        n.author.toLowerCase().includes(query)
      );
      renderNovels(filtered);
    }, 300);

    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value.toLowerCase());
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
