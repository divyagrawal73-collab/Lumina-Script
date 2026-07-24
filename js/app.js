// js/app.js - Homepage logic

(function() {
  'use strict';

  const novelGrid = document.getElementById('novel-grid');
  const searchInput = document.getElementById('search');
  let novels = [];

  async function init() {
    await loadNovels();
    bindEvents();
  }

  async function loadNovels() {
    try {
      const response = await fetch('/data/novels.json');
      if (!response.ok) throw new Error('Failed to load novels');
      novels = await response.json();
      renderNovels(novels);
    } catch (error) {
      novelGrid.innerHTML = `<div class="error">Error loading novels: ${error.message}</div>`;
    }
  }

  function renderNovels(list) {
    novelGrid.innerHTML = list.map(novel => `
      <a href="/novel.html?id=${novel.id}" class="novel-card">
        <img src="${novel.cover}" alt="${escapeHtml(novel.title)}" class="novel-cover" onerror="this.style.background='var(--accent-gradient)'">
        <div class="novel-info">
          <h3>${escapeHtml(novel.title)}</h3>
          <div class="author">${escapeHtml(novel.author)}</div>
          <div class="chapters">${novel.chapterCount} chapters</div>
        </div>
      </a>
    `).join('');
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
