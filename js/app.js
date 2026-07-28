// js/app.js - Homepage logic (Lumina Script)

(function() {
  'use strict';

  const novelGrid = document.getElementById('novel-grid');
  const searchInput = document.getElementById('search');
  const continueReadingSection = document.getElementById('continue-reading');
  const heroCardContainer = document.getElementById('hero-card-container');
  let allNovels = [];
  let featuredNovels = [];
  let currentPage = 1;
  let totalPages = 1;
  let isLoading = false;
  let currentSort = 'recent';
  let currentSearch = '';

  async function init() {
    await loadFeaturedNovels();
    await loadPage(1);
    bindEvents();
  }

  // Load the 7 curated novels as featured
  async function loadFeaturedNovels() {
    try {
      const res = await fetch('/data/novels.json?v=20260728');
      if (res.ok) {
        featuredNovels = await res.json();
      }
    } catch (e) {
      console.warn('Failed to load featured novels:', e);
    }
  }

  // Load novels from API proxy with pagination
  async function loadPage(page) {
    if (isLoading) return;
    isLoading = true;
    currentPage = page;

    Animations.showSkeleton(novelGrid, () => `
        <div class="skeleton-image"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text short"></div>
    `, 12);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
        sort: currentSort
      });
      if (currentSearch) params.set('search', currentSearch);

      const res = await fetch(`/api/novels?${params}`);
      if (!res.ok) throw new Error('Failed to load novels');
      const data = await res.json();

      allNovels = data.novels || [];
      totalPages = data.pagination?.total_pages || 1;

      renderNovels(allNovels);
      renderPagination();
    } catch (error) {
      Animations.hideSkeleton(novelGrid, `<div class="error">Error loading novels: ${error.message}</div>`);
    } finally {
      isLoading = false;
    }
  }

  function renderNovels(list) {
    // Combine featured + API novels (featured first, deduplicated)
    const featuredIds = new Set(featuredNovels.map(n => n.id));
    const apiOnly = allNovels.filter(n => !featuredIds.has(n.id));
    const displayList = currentSearch ? list : [...featuredNovels, ...apiOnly];

    const gridHTML = displayList.map(novel => `
      <a href="/novel.html?id=${novel.apiId || novel.id}" class="book-card">
        <div class="book-tilt">
          <div class="book-tilt-inner">
            <div class="book-cover-wrapper book-floating">
              <img src="${novel.cover}" alt="${escapeHtml(novel.title)}" class="book-cover" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
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

  function renderPagination() {
    const existing = document.getElementById('home-pagination');
    if (existing) existing.remove();

    if (totalPages <= 1) return;

    const pag = document.createElement('div');
    pag.id = 'home-pagination';
    pag.className = 'pagination';

    let pages = [];
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const s = Math.max(2, currentPage - 1);
      const e = Math.min(totalPages - 1, currentPage + 1);
      for (let i = s; i <= e; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    pag.innerHTML = `
      <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      ${pages.map(p => p === '...'
        ? `<span class="page-ellipsis">...</span>`
        : `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`
      ).join('')}
      <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    `;

    novelGrid.parentNode.insertBefore(pag, novelGrid.nextSibling);

    pag.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.page);
        if (!isNaN(p)) {
          loadPage(p);
          window.scrollTo({ top: novelGrid.offsetTop - 80, behavior: 'smooth' });
        }
      });
    });
  }

  async function renderContinueReading() {
    const progress = await Storage.getAllReadingProgress();
    const progressIds = Object.keys(progress);
    if (progressIds.length === 0) {
      continueReadingSection.classList.add('hidden');
      return;
    }

    let bestId = null;
    let bestTime = '';
    for (const id of progressIds) {
      const p = progress[id];
      if (!p.lastReadChapter) continue;
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

    // Find novel from featured or use API data
    const novel = featuredNovels.find(n => n.id === bestId) || allNovels.find(n => n.id === bestId || n.apiId === bestId);
    if (!novel) {
      continueReadingSection.classList.add('hidden');
      return;
    }

    const novelProgress = progress[bestId];
    const readCount = novelProgress.chaptersRead ? novelProgress.chaptersRead.length : 0;
    const totalChapters = novel.chapterCount || 1;
    const progressPercent = Math.min(100, (readCount / totalChapters) * 100);

    heroCardContainer.innerHTML = `
      <a href="/reader.html?novel=${novel.apiId || novel.id}&chapter=${novelProgress.lastReadChapter}" class="hero-card">
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
      currentSearch = query;
      currentPage = 1;
      loadPage(1);
    }, 400);

    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value.trim().toLowerCase());
    });

    // Sort controls (if present)
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentSort = btn.dataset.sort || 'recent';
        currentPage = 1;
        loadPage(1);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
