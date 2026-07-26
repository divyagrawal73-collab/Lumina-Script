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
    try {
      const response = await fetch('/data/novels.json?v=20260727');
      if (!response.ok) throw new Error('Failed to load novels');
      novels = await response.json();
      renderNovels(novels);
    } catch (error) {
      novelGrid.innerHTML = `<div class="error">Error loading novels: ${error.message}</div>`;
    }
  }

  function renderNovels(list) {
    novelGrid.innerHTML = list.map(novel => `
      <a href="/novel.html?id=${novel.id}" class="book-card">
        <div class="book-cover-wrapper">
          <img src="${novel.cover}" alt="${escapeHtml(novel.title)}" class="book-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="book-cover-fallback" style="display:none;">${escapeHtml(novel.title.charAt(0))}</div>
        </div>
        <div class="book-title">${escapeHtml(novel.title)}</div>
        <div class="book-author">${escapeHtml(novel.author)}</div>
      </a>
    `).join('');
  }

  async function renderContinueReading() {
    const progress = await Storage.getAllReadingProgress();
    const novelIds = Object.keys(progress);

    if (novelIds.length === 0) {
      continueReadingSection.classList.add('hidden');
      return;
    }

    continueReadingSection.classList.remove('hidden');

    const lastNovelId = novelIds[novelIds.length - 1];
    const novelProgress = progress[lastNovelId];
    const novel = novels.find(n => n.id === lastNovelId);

    if (!novel || !novelProgress.lastReadChapter) {
      continueReadingSection.classList.add('hidden');
      return;
    }

    const readCount = novelProgress.chaptersRead ? novelProgress.chaptersRead.length : 0;
    const progressPercent = novel.chapterCount > 0 ? (readCount / novel.chapterCount) * 100 : 0;

    heroCardContainer.innerHTML = `
      <a href="/novel.html?id=${novel.id}" class="hero-card">
        <img src="${novel.cover}" alt="${escapeHtml(novel.title)}" class="hero-cover" onerror="this.style.background='var(--primary-light)'">
        <div class="hero-info">
          <div class="hero-label">Continue Reading</div>
          <div class="hero-title">${escapeHtml(novel.title)}</div>
          <div class="hero-meta">Chapter ${novelProgress.lastReadChapter} of ${novel.chapterCount}</div>
          <div class="hero-progress">
            <div class="hero-progress-bar" style="width: ${progressPercent}%"></div>
          </div>
        </div>
      </a>
    `;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
