// js/novel.js - Novel detail page logic (Lumina Script)

(function() {
  'use strict';

  const novelHeader = document.getElementById('novel-header');
  const chapterList = document.getElementById('chapter-list');
  const chapterSearch = document.getElementById('chapter-search');
  const chapterListInfo = document.getElementById('chapter-list-info');
  const paginationEl = document.getElementById('pagination');
  const userActions = document.getElementById('novel-user-actions');
  const commentsSection = document.getElementById('comments-section');
  const analyticsSection = document.getElementById('analytics-section');
  const titleEl = document.querySelector('title');
  let novelData = null;
  let chapters = [];
  let filteredChapters = [];
  let currentPage = 1;
  const CHAPTERS_PER_PAGE = 50;

  async function init() {
    const novelId = getNovelId();

    if (!novelId) {
      window.location.href = '/';
      return;
    }
    await loadNovel(novelId);
    bindEvents();
  }

  function getNovelId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  async function loadNovel(novelId) {
    try {
      const response = await fetch('/data/novels.json?v=20260727');
      if (!response.ok) throw new Error('Failed to load novels');
      const novels = await response.json();
      novelData = novels.find(n => n.id === novelId);
      
      if (!novelData) {
        window.location.href = '/';
        return;
      }

      titleEl.textContent = `${novelData.title} - Lumina Script`;
      await loadChapters(novelId);
      await renderHeader();
      await renderUserActions();
      await renderAnalytics();
      renderChapters();
      await renderComments();
    } catch (error) {
      novelHeader.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
  }

  async function loadChapters(novelId) {
    const url = `/data/${novelId}/chapters.json?v=20260727`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load chapters');
    chapters = await response.json();

  }

  async function renderHeader() {
    let readCount = 0;
    let lastRead = 0;
    let avgRating = { average: 0, count: 0 };
    try {
      const progress = await Storage.getReadingProgress(novelData.id);
      readCount = progress.chaptersRead.length;
      lastRead = progress.lastReadChapter;
    } catch (e) {
      console.warn('Failed to load reading progress:', e);
    }
    try {
      avgRating = await Storage.getAverageRating(novelData.id);
    } catch (e) {
      console.warn('Failed to load average rating:', e);
    }
    const total = chapters.length;

    novelHeader.innerHTML = `
      <img src="${novelData.cover}" alt="${escapeHtml(novelData.title)}" class="novel-cover-large" onerror="this.style.background='var(--container-low)'">
      <div class="novel-info">
        <h1 class="novel-title">${escapeHtml(novelData.title)}</h1>
        <div class="novel-author">by ${escapeHtml(novelData.author)}</div>
        <div class="novel-meta">
          <span class="meta-chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            ${total} chapters
          </span>
          <span class="meta-chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            ${readCount} read
          </span>
          ${avgRating.count > 0 ? `
          <span class="meta-chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            ${avgRating.average} (${avgRating.count})
          </span>
          ` : ''}
        </div>
        <p class="novel-description">${escapeHtml(novelData.description)}</p>
        <div class="novel-actions">
          ${lastRead > 0 
            ? `<a href="/reader.html?novel=${novelData.id}&chapter=${lastRead}" class="btn btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Continue Reading Ch. ${lastRead}
              </a>`
            : `<a href="/reader.html?novel=${novelData.id}&chapter=1" class="btn btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Start Reading
              </a>`
          }
        </div>
      </div>
    `;
  }

  async function renderUserActions() {
    if (!Storage.isLoggedIn()) {
      userActions.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.75rem;color:var(--on-surface-secondary);font-size:var(--font-label-md);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <a href="/login.html" style="color:var(--primary);text-decoration:none;font-weight:600;">Login</a> to track reading status, rate, and comment.
        </div>
      `;
      return;
    }

    let currentStatus = null;
    let isFav = false;
    let userRating = 0;
    try {
      currentStatus = await Storage.getNovelStatus(novelData.id);
      isFav = await Storage.isFavorite(novelData.id);
      userRating = await Storage.getRating(novelData.id);
    } catch (e) {
      console.warn('Failed to load user actions:', e);
    }

    userActions.innerHTML = `
      <div class="action-group">
        <label>Status</label>
        <select class="action-select" id="status-select">
          <option value="">Not Set</option>
          <option value="reading" ${currentStatus === 'reading' ? 'selected' : ''}>Reading</option>
          <option value="plan-to-read" ${currentStatus === 'plan-to-read' ? 'selected' : ''}>Plan to Read</option>
          <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>Completed</option>
          <option value="dropped" ${currentStatus === 'dropped' ? 'selected' : ''}>Dropped</option>
        </select>
      </div>

      <div class="action-group">
        <label>Rating</label>
        <div class="rating-input">
          <div class="rating-stars-input" id="rating-stars">
            ${[1,2,3,4,5].map(s => `
              <svg class="${s <= userRating ? 'active' : ''}" data-rating="${s}" viewBox="0 0 24 24">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            `).join('')}
          </div>
          <span class="rating-label" id="rating-text">${userRating > 0 ? userRating + '/5' : 'Rate this'}</span>
        </div>
      </div>

      <button class="favorite-btn ${isFav ? 'active' : ''}" id="favorite-btn">
        <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
        ${isFav ? 'Favorited' : 'Favorite'}
      </button>
    `;

    document.getElementById('status-select').addEventListener('change', async (e) => {
      const val = e.target.value;
      await Storage.setNovelStatus(novelData.id, val || null);
    });

    document.getElementById('rating-stars').addEventListener('click', async (e) => {
      const star = e.target.closest('svg');
      if (!star) return;
      const rating = parseInt(star.dataset.rating);
      await Storage.submitRating(novelData.id, rating);
      document.querySelectorAll('#rating-stars svg').forEach((s, i) => {
        s.classList.toggle('active', i < rating);
      });
      document.getElementById('rating-text').textContent = rating + '/5';
      await renderHeader();
    });

    document.getElementById('favorite-btn').addEventListener('click', async () => {
      const isFav = await Storage.isFavorite(novelData.id);
      if (isFav) {
        await Storage.removeFavorite(novelData.id);
      } else {
        await Storage.addFavorite(novelData.id);
      }
      await renderUserActions();
    });
  }

  // ==================== ANALYTICS ====================
  async function renderAnalytics() {
    if (!Storage.isLoggedIn()) {
      analyticsSection.innerHTML = '';
      return;
    }

    let analytics = { sessions: 0, totalTime: 0, lastReadAt: null };
    let progress = { chaptersRead: [] };
    try {
      analytics = await Storage.getNovelAnalytics(novelData.id);
      progress = await Storage.getReadingProgress(novelData.id);
    } catch (e) {
      console.warn('Failed to load analytics:', e);
    }
    const readCount = progress.chaptersRead.length;
    const total = chapters.length;
    const percent = total > 0 ? ((readCount / total) * 100).toFixed(1) : 0;

    if (readCount === 0 && analytics.sessions === 0) {
      analyticsSection.innerHTML = '';
      return;
    }

    const avgTimePerChapter = analytics.totalTime > 0 && readCount > 0 
      ? Math.round(analytics.totalTime / readCount / 1000) 
      : 0;

    analyticsSection.innerHTML = `
      <div class="analytics-card">
        <h3 class="analytics-title">Reading Analytics</h3>
        <div class="analytics-grid">
          <div class="analytics-stat">
            <div class="analytics-stat-value">${readCount}/${total}</div>
            <div class="analytics-stat-label">Chapters Read</div>
            <div class="analytics-bar">
              <div class="analytics-bar-fill" style="width:${percent}%"></div>
            </div>
          </div>
          <div class="analytics-stat">
            <div class="analytics-stat-value">${percent}%</div>
            <div class="analytics-stat-label">Completion</div>
          </div>
          <div class="analytics-stat">
            <div class="analytics-stat-value">${analytics.sessions}</div>
            <div class="analytics-stat-label">Reading Sessions</div>
          </div>
          <div class="analytics-stat">
            <div class="analytics-stat-value">${formatTime(analytics.totalTime)}</div>
            <div class="analytics-stat-label">Total Time Read</div>
          </div>
          <div class="analytics-stat">
            <div class="analytics-stat-value">${avgTimePerChapter}s</div>
            <div class="analytics-stat-label">Avg. per Chapter</div>
          </div>
          <div class="analytics-stat">
            <div class="analytics-stat-value">${analytics.lastReadAt ? timeAgo(analytics.lastReadAt) : 'Never'}</div>
            <div class="analytics-stat-label">Last Read</div>
          </div>
        </div>
      </div>
    `;
  }

  function formatTime(ms) {
    if (ms === 0) return '0m';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return seconds + 's';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours + 'h ' + mins + 'm';
  }

  // ==================== CHAPTERS ====================
  async function renderChapters(page = 1) {
    Animations.showSkeleton(chapterList, () => `
        <div class="skeleton-text"></div>
        <div class="skeleton-text short"></div>
    `, 10);
    let progress = { chaptersRead: [] };
    try {
      progress = await Storage.getReadingProgress(novelData.id);
    } catch (e) {
      console.warn('Failed to load progress for chapters:', e);
    }
    const filter = chapterSearch.value.toLowerCase();

    filteredChapters = chapters.filter(ch => 
      !filter || ch.title.toLowerCase().includes(filter)
    );

    const totalPages = Math.ceil(filteredChapters.length / CHAPTERS_PER_PAGE);
    currentPage = Math.max(1, Math.min(page, totalPages || 1));

    const start = (currentPage - 1) * CHAPTERS_PER_PAGE;
    const end = start + CHAPTERS_PER_PAGE;
    const batch = filteredChapters.slice(start, end);

    const chaptersHTML = batch.map(ch => `
      <a href="/reader.html?novel=${novelData.id}&chapter=${ch.id}" class="chapter-item ${progress.chaptersRead.includes(ch.id) ? 'read' : ''}">
        <span class="chapter-number">${ch.id}</span>
        <span class="chapter-title">${escapeHtml(ch.title)}</span>
      </a>
    `).join('');
    Animations.hideSkeleton(chapterList, chaptersHTML);

    chapterListInfo.textContent = `Showing ${start + 1}-${Math.min(end, filteredChapters.length)} of ${filteredChapters.length} chapters`;

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }

    let pages = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const rangeStart = Math.max(2, currentPage - 1);
      const rangeEnd = Math.min(totalPages - 1, currentPage + 1);
      for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    paginationEl.innerHTML = `
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

    paginationEl.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        if (!isNaN(page)) {
          renderChapters(page);
          chapterList.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ==================== COMMENTS ====================
  async function renderComments() {
    const comments = await Storage.getComments(novelData.id);
    const user = Storage.getCurrentUser();

    let formHtml = '';
    if (user) {
      formHtml = `
        <div class="comment-form">
          <div class="comment-input-wrapper">
            <div class="comment-avatar">${(user.user_metadata?.username || 'Anonymous').charAt(0).toUpperCase()}</div>
            <div class="comment-input-area">
              <textarea class="comment-textarea" id="comment-input" placeholder="Share your thoughts about this novel..."></textarea>
              <div class="comment-actions">
                <button class="btn btn-primary" id="post-comment-btn" style="padding:0.5rem 1rem;font-size:var(--font-label-md);">
                  Post Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      formHtml = `
        <div style="text-align:center;padding:1.5rem;background:var(--container-low);border-radius:var(--radius);margin-bottom:1.5rem;">
          <a href="/login.html" style="color:var(--primary);font-weight:600;text-decoration:none;">Login</a> to leave a comment.
        </div>
      `;
    }

    const commentsHtml = comments.length === 0 
      ? '<div class="no-comments">No comments yet. Be the first to share your thoughts!</div>'
      : comments.map(c => `
        <div class="comment-item">
          <div class="comment-avatar">${c.username.charAt(0).toUpperCase()}</div>
          <div class="comment-body">
            <div class="comment-meta">
              <span class="comment-author">${escapeHtml(c.username)}</span>
              <span class="comment-time">${timeAgo(c.created_at)}</span>
            </div>
            <div class="comment-text">${escapeHtml(c.text)}</div>
            <div class="comment-footer">
              <button class="comment-like-btn ${(c.liked_by || []).includes(user?.id) ? 'liked' : ''}" data-id="${c.id}">
                <svg viewBox="0 0 24 24" fill="${(c.liked_by || []).includes(user?.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                </svg>
                ${c.likes > 0 ? c.likes : ''}
              </button>
              ${user && c.user_id === user.id ? `
                <button class="comment-delete-btn" data-id="${c.id}">Delete</button>
              ` : ''}
            </div>
          </div>
        </div>
      `).join('');

    commentsSection.innerHTML = `
      <div class="comments-header">
        <h2 class="comments-title">Comments</h2>
        <span class="comments-count">${comments.length} comment${comments.length !== 1 ? 's' : ''}</span>
      </div>
      ${formHtml}
      <div class="comment-list">${commentsHtml}</div>
    `;

    if (user) {
      const postBtn = document.getElementById('post-comment-btn');
      const input = document.getElementById('comment-input');
      if (postBtn) {
        postBtn.addEventListener('click', async () => {
          const text = input.value.trim();
          if (!text) return;
          await Storage.addComment(novelData.id, null, text);
          input.value = '';
          await renderComments();
        });
      }
    }

    commentsSection.querySelectorAll('.comment-like-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!user) { window.location.href = '/login.html'; return; }
        await Storage.likeComment(novelData.id, btn.dataset.id);
        await renderComments();
      });
    });

    commentsSection.querySelectorAll('.comment-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete this comment?')) {
          await Storage.deleteComment(novelData.id, btn.dataset.id);
          await renderComments();
        }
      });
    });
  }

  function timeAgo(dateStr) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    if (days < 30) return days + 'd ago';
    return new Date(dateStr).toLocaleDateString();
  }

  function bindEvents() {
    let searchTimeout;
    chapterSearch.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => renderChapters(1), 300);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
