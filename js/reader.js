// js/reader.js - Reader page logic (Lumina Script)

(function() {
  'use strict';

  let novelId = null;
  let currentChapterId = 0;
  let chapters = [];
  let novelData = null;

  const elements = {
    chapterTitle: document.getElementById('chapter-title'),
    chapterContent: document.getElementById('chapter-content'),
    readingArea: document.querySelector('.reading-area'),
    backBtn: document.getElementById('back-btn'),
    prevBtn: document.getElementById('prev-chapter'),
    nextBtn: document.getElementById('next-chapter'),
    progressBar: document.getElementById('progress-bar'),
    progressBarTop: document.getElementById('progress-bar-top'),
    progressContainer: document.getElementById('progress-container'),
    progressTop: document.getElementById('progress-top'),
    readerTopbar: document.getElementById('reader-topbar'),
    readerBottombar: document.querySelector('.reader-bottombar'),
    bookmarkBtn: document.getElementById('bookmark-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsPanel: document.getElementById('settings-panel'),
    settingsOverlay: document.getElementById('settings-overlay'),
    closeSettings: document.getElementById('close-settings'),
    fontFamily: document.getElementById('font-family'),
    fontSize: document.getElementById('font-size'),
    fontSizeValue: document.getElementById('font-size-value'),
    lineHeight: document.getElementById('line-height'),
    lineHeightValue: document.getElementById('line-height-value'),
    textWidth: document.getElementById('text-width'),
    textWidthValue: document.getElementById('text-width-value')
  };

  async function init() {
    novelId = getParam('novel');
    currentChapterId = parseInt(getParam('chapter')) || 1;

    if (!novelId) {
      window.location.href = '/';
      return;
    }

    try {
      await loadNovelData();
      await loadChapters();
    } catch (e) {
      console.error('Failed to load novel data:', e);
      elements.chapterContent.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--on-surface-secondary);">Failed to load novel data. Please check your connection and try again.</p>';
      return;
    }
    loadSettings();
    await loadChapter(currentChapterId);
    bindEvents();
    if (typeof TTS !== 'undefined') TTS.init();

    Storage.startReadingSession(novelId);

    const saveCurrentProgress = () => {
      if (novelId && currentChapterId) {
        Storage.saveReadingProgress(novelId, currentChapterId);
      }
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveCurrentProgress();
    });
    window.addEventListener('beforeunload', () => {
      Storage.endReadingSession(novelId);
      saveCurrentProgress();
    });
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  async function loadNovelData() {
    const response = await fetch('/data/novels.json?v=20260727b');
    const novels = await response.json();
    novelData = novels.find(n => n.id === novelId);
  }

  async function loadChapters() {
    const result = await Fetcher.getChapterList(novelId);
    chapters = result.chapters;
  }

  async function loadChapter(chapterId) {
    if (typeof TTS !== 'undefined') TTS.onChapterChange();

    if (novelId && currentChapterId && currentChapterId !== chapterId) {
      Storage.saveReadingProgress(novelId, currentChapterId);
    }

    const startTime = Date.now();
    currentChapterId = chapterId;

    // Get chapter title from list
    const chapterInfo = chapters.find(c => c.id === chapterId);
    const title = chapterInfo?.title || `Chapter ${chapterId}`;
    elements.chapterTitle.textContent = title;
    document.title = `${title} - Lumina Script`;

    // Fetch content from API
    elements.chapterContent.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading chapter content...</p></div>';
    let content = null;
    if (typeof Fetcher !== 'undefined' && Fetcher.getChapter) {
      const result = await Fetcher.getChapter(novelId, chapterId);
      if (result) {
        content = result.content;
      }
    }
    if (!content && typeof Fetcher !== 'undefined' && Fetcher.getChapterContent) {
      content = await Fetcher.getChapterContent(novelId, chapterId);
    }
    if (!content) {
      elements.chapterContent.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--on-surface-secondary);">Failed to load chapter content. Please try again.</p>';
      return;
    }

    const paragraphs = content.split('\n').filter(p => p.trim());
    elements.chapterContent.innerHTML = paragraphs
      .map(p => `<p>${escapeHtml(p)}</p>`)
      .join('');

    await renderChapterComments(chapterId);
    await updateBookmarkBtn();
    elements.readingArea.scrollTop = 0;
    window.scrollTo(0, 0);
    updateNavButtons();
    updateProgress(0);
    try {
      await Storage.saveReadingProgress(novelId, chapterId);
      await Storage.addToReadingHistory(novelId, chapterId);
    } catch (e) {
      console.warn('Failed to save reading progress:', e);
    }

    const elapsed = (Date.now() - startTime) / 60000;
    if (typeof Streaks !== 'undefined') Streaks.trackReading(1, elapsed);
    if (typeof Achievements !== 'undefined') Achievements.trackChapter();
  }

  function updateNavButtons() {
    elements.prevBtn.disabled = currentChapterId <= 1;
    elements.nextBtn.disabled = currentChapterId >= chapters.length;
    const settingsPrev = document.getElementById('settings-prev-chapter');
    const settingsNext = document.getElementById('settings-next-chapter');
    if (settingsPrev) settingsPrev.disabled = currentChapterId <= 1;
    if (settingsNext) settingsNext.disabled = currentChapterId >= chapters.length;
  }

  function updateProgress(percent) {
    if (elements.progressBar) elements.progressBar.style.width = percent + '%';
    if (elements.progressBarTop) elements.progressBarTop.style.width = percent + '%';
  }

  async function updateBookmarkBtn() {
    const isBookmarked = await Storage.isChapterBookmarked(novelId, currentChapterId);
    const svg = elements.bookmarkBtn.querySelector('svg');
    svg.setAttribute('fill', isBookmarked ? 'currentColor' : 'none');
    elements.bookmarkBtn.title = isBookmarked ? 'Remove bookmark' : 'Bookmark chapter';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function renderChapterComments(chapterId) {
    const commentsEl = document.getElementById('chapter-comments');
    const comments = await Storage.getComments(novelId, chapterId);
    const user = Storage.getCurrentUser();

    let formHtml = '';
    if (user) {
      formHtml = `
        <div class="comment-form">
          <div class="comment-input-wrapper">
            <div class="comment-avatar">${(user.user_metadata?.username || 'Anonymous').charAt(0).toUpperCase()}</div>
            <div class="comment-input-area">
              <textarea class="comment-textarea" id="ch-comment-input" placeholder="Comment on this chapter..."></textarea>
              <div class="comment-actions">
                <button class="btn btn-primary" id="ch-post-comment" style="padding:0.5rem 1rem;font-size:var(--font-label-md);">Post</button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      formHtml = `<div style="text-align:center;padding:1rem;color:var(--on-surface-secondary);font-size:var(--font-label-md);"><a href="/login.html" style="color:var(--primary);text-decoration:none;font-weight:600;">Login</a> to comment on this chapter.</div>`;
    }

    const commentsHtml = comments.length === 0
      ? '<div class="no-comments">No comments yet.</div>'
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
              ${user && c.user_id === user.id ? `<button class="comment-delete-btn" data-id="${c.id}">Delete</button>` : ''}
            </div>
          </div>
        </div>
      `).join('');

    commentsEl.innerHTML = `
      <div class="comments-header">
        <h2 class="comments-title">Chapter Comments</h2>
        <span class="comments-count">${comments.length}</span>
      </div>
      ${formHtml}
      <div class="comment-list">${commentsHtml}</div>
    `;

    if (user) {
      const postBtn = document.getElementById('ch-post-comment');
      const input = document.getElementById('ch-comment-input');
      if (postBtn) {
        postBtn.addEventListener('click', async () => {
          const text = input.value.trim();
          if (!text) return;
          await Storage.addComment(novelId, chapterId, text);
          input.value = '';
          await renderChapterComments(chapterId);
        });
      }
    }

    commentsEl.querySelectorAll('.comment-like-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!user) { window.location.href = '/login.html'; return; }
        await Storage.likeComment(novelId, btn.dataset.id, chapterId);
        await renderChapterComments(chapterId);
      });
    });

    commentsEl.querySelectorAll('.comment-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete comment?')) {
          await Storage.deleteComment(novelId, btn.dataset.id, chapterId);
          await renderChapterComments(chapterId);
        }
      });
    });
  }

  function timeAgo(dateStr) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  function loadSettings() {
    const settings = Storage.getReadingSettings();
    document.documentElement.style.setProperty('--reading-font', settings.fontFamily);
    elements.fontFamily.value = settings.fontFamily;
    document.documentElement.style.setProperty('--reading-font-size', settings.fontSize + 'px');
    elements.fontSize.value = settings.fontSize;
    elements.fontSizeValue.textContent = settings.fontSize;
    document.documentElement.style.setProperty('--reading-line-height', settings.lineHeight);
    elements.lineHeight.value = settings.lineHeight;
    elements.lineHeightValue.textContent = settings.lineHeight;
    const textWidth = settings.textWidth || 800;
    document.documentElement.style.setProperty('--content-max-width', textWidth + 'px');
    elements.textWidth.value = textWidth;
    elements.textWidthValue.textContent = textWidth;
  }

  function saveSettings() {
    Storage.saveReadingSettings({
      fontFamily: elements.fontFamily.value,
      fontSize: parseInt(elements.fontSize.value),
      lineHeight: parseFloat(elements.lineHeight.value),
      textWidth: parseInt(elements.textWidth.value)
    });
  }

  function toggleSettings() {
    elements.settingsPanel.classList.toggle('open');
    elements.settingsOverlay.classList.toggle('hidden');
  }

  function applyProgressPosition(pos) {
    const topbar = elements.readerTopbar;
    const container = elements.progressContainer;
    const top = elements.progressTop;
    const edgeProgress = document.querySelector('.reader-edge-progress');
    const layout = document.querySelector('.reader-layout');
    if (!topbar) return;
    topbar.setAttribute('data-progress', pos);
    if (layout) layout.setAttribute('data-progress', pos);
    if (edgeProgress) edgeProgress.setAttribute('data-pos', pos);
    if (pos === 'top') {
      if (container) container.classList.add('hidden');
      if (top) top.style.display = 'block';
    } else {
      if (container) container.classList.remove('hidden');
      if (top) top.style.display = 'none';
    }
  }

  function bindEvents() {
    elements.backBtn.addEventListener('click', () => {
      window.location.href = `/novel.html?id=${novelId}`;
    });

    elements.prevBtn.addEventListener('click', () => {
      if (currentChapterId > 1) loadChapter(currentChapterId - 1);
    });

    elements.nextBtn.addEventListener('click', () => {
      if (currentChapterId < chapters.length) loadChapter(currentChapterId + 1);
    });

    elements.bookmarkBtn.addEventListener('click', async () => {
      if (!Storage.isLoggedIn()) { window.location.href = '/login.html'; return; }
      const isBookmarked = await Storage.isChapterBookmarked(novelId, currentChapterId);
      if (isBookmarked) {
        await Storage.removeChapterBookmark(novelId, currentChapterId);
      } else {
        await Storage.addChapterBookmark(novelId, currentChapterId);
      }
      await updateBookmarkBtn();
    });

    elements.settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSettings();
    });
    elements.closeSettings.addEventListener('click', toggleSettings);
    elements.settingsOverlay.addEventListener('click', toggleSettings);

    const settingsPrev = document.getElementById('settings-prev-chapter');
    const settingsNext = document.getElementById('settings-next-chapter');
    if (settingsPrev) settingsPrev.addEventListener('click', () => {
      if (currentChapterId > 1) loadChapter(currentChapterId - 1);
    });
    if (settingsNext) settingsNext.addEventListener('click', () => {
      if (currentChapterId < chapters.length) loadChapter(currentChapterId + 1);
    });

    elements.fontFamily.addEventListener('change', (e) => {
      document.documentElement.style.setProperty('--reading-font', e.target.value);
      saveSettings();
    });
    elements.fontSize.addEventListener('input', (e) => {
      document.documentElement.style.setProperty('--reading-font-size', e.target.value + 'px');
      elements.fontSizeValue.textContent = e.target.value;
      saveSettings();
    });
    elements.lineHeight.addEventListener('input', (e) => {
      document.documentElement.style.setProperty('--reading-line-height', e.target.value);
      elements.lineHeightValue.textContent = e.target.value;
      saveSettings();
    });
    elements.textWidth.addEventListener('input', (e) => {
      document.documentElement.style.setProperty('--content-max-width', e.target.value + 'px');
      elements.textWidthValue.textContent = e.target.value;
      saveSettings();
    });

    // Progress bar position toggle
    const savedPos = localStorage.getItem('ls_progressPos') || 'bottom';
    applyProgressPosition(savedPos);
    document.querySelectorAll('.progress-pos-btn').forEach(btn => {
      if (btn.dataset.pos === savedPos) btn.classList.add('active');
      btn.addEventListener('click', () => {
        document.querySelectorAll('.progress-pos-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyProgressPosition(btn.dataset.pos);
        localStorage.setItem('ls_progressPos', btn.dataset.pos);
      });
    });

    // Auto-hide bars + scroll progress (single listener)
    let hideTimer = null;
    let lastScrollTop = 0;

    function showBars() {
      elements.readerTopbar?.classList.remove('auto-hidden');
      elements.readerBottombar?.classList.remove('auto-hidden');
      document.querySelector('.reader-edge-progress')?.classList.remove('visible');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hideBars, 3000);
    }

    function hideBars() {
      if (elements.readingArea.scrollTop <= 50) return;
      elements.readerTopbar?.classList.add('auto-hidden');
      elements.readerBottombar?.classList.add('auto-hidden');
      document.querySelector('.reader-edge-progress')?.classList.add('visible');
    }

    elements.readingArea.addEventListener('scroll', () => {
      const el = elements.readingArea;
      const st = el.scrollTop;
      const maxScroll = el.scrollHeight - el.clientHeight;

      // Update progress bars
      if (maxScroll > 0) {
        const pct = Math.min(100, Math.max(0, (st / maxScroll) * 100));
        updateProgress(pct);
      } else {
        updateProgress(100);
      }

      // Update edge progress bar
      const edgeBar = document.querySelector('.reader-edge-progress-bar');
      if (edgeBar) edgeBar.style.width = (maxScroll > 0 ? (st / maxScroll) * 100 : 0) + '%';

      // Auto-hide logic
      const scrollDir = st > lastScrollTop ? 'down' : 'up';
      lastScrollTop = st;

      if (scrollDir === 'down' && st > 150) {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hideBars, 800);
      } else {
        showBars();
      }
    }, { passive: true });

    // Tap reading area to show bars or open settings (mobile only)
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      elements.readingArea.addEventListener('click', (e) => {
        if (e.target.closest('a, button, input, textarea, .comment-form, .chapter-comments')) return;
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;
        const isHidden = elements.readerTopbar?.classList.contains('auto-hidden');
        if (isHidden) {
          showBars();
        } else {
          toggleSettings();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;
      if (e.key === 'ArrowLeft' && currentChapterId > 1) loadChapter(currentChapterId - 1);
      if (e.key === 'ArrowRight' && currentChapterId < chapters.length) loadChapter(currentChapterId + 1);
      if (e.key === 'Escape') toggleSettings();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
