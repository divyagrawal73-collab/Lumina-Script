// js/reader.js - Reader page logic

(function() {
  'use strict';

  let novelId = null;
  let currentChapterId = 0;
  let chapters = [];
  let novelData = null;

  const elements = {
    chapterTitle: document.getElementById('chapter-title'),
    chapterContent: document.getElementById('chapter-content'),
    readingArea: document.getElementById('reading-area'),
    backBtn: document.getElementById('back-btn'),
    prevBtn: document.getElementById('prev-chapter'),
    nextBtn: document.getElementById('next-chapter'),
    progressBar: document.getElementById('progress-bar'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsPanel: document.getElementById('settings-panel'),
    settingsOverlay: document.getElementById('settings-overlay'),
    closeSettings: document.getElementById('close-settings'),
    fontFamily: document.getElementById('font-family'),
    fontSize: document.getElementById('font-size'),
    fontSizeValue: document.getElementById('font-size-value'),
    lineHeight: document.getElementById('line-height'),
    lineHeightValue: document.getElementById('line-height-value')
  };

  async function init() {
    novelId = getParam('novel');
    currentChapterId = parseInt(getParam('chapter')) || 1;

    if (!novelId) {
      window.location.href = '/';
      return;
    }

    await loadNovelData();
    await loadChapters();
    loadSettings();
    await loadChapter(currentChapterId);
    bindEvents();
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  async function loadNovelData() {
    const response = await fetch('/data/novels.json');
    const novels = await response.json();
    novelData = novels.find(n => n.id === novelId);
  }

  async function loadChapters() {
    const response = await fetch(`/data/${novelId}/chapters.json`);
    chapters = await response.json();
  }

  async function loadChapter(chapterId) {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    currentChapterId = chapterId;
    elements.chapterTitle.textContent = chapter.title;
    document.title = `${chapter.title} - Novel Archive`;

    const paragraphs = chapter.content.split('\n').filter(p => p.trim());
    elements.chapterContent.innerHTML = paragraphs
      .map(p => `<p>${escapeHtml(p)}</p>`)
      .join('');

    elements.readingArea.scrollTop = 0;
    updateNavButtons();
    updateProgress(0);
    Storage.saveReadingProgress(novelId, chapterId);
  }

  function updateNavButtons() {
    elements.prevBtn.disabled = currentChapterId <= 1;
    elements.nextBtn.disabled = currentChapterId >= chapters.length;
  }

  function updateProgress(percent) {
    elements.progressBar.style.width = percent + '%';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Settings
  function loadSettings() {
    const settings = Storage.getReadingSettings();
    applyFont(settings.fontFamily);
    applyFontSize(settings.fontSize);
    applyLineHeight(settings.lineHeight);
  }

  function applyFont(font) {
    document.documentElement.style.setProperty('--reading-font', font);
    elements.fontFamily.value = font;
    saveSettings();
  }

  function applyFontSize(size) {
    document.documentElement.style.setProperty('--reading-font-size', size + 'px');
    elements.fontSize.value = size;
    elements.fontSizeValue.textContent = size;
    saveSettings();
  }

  function applyLineHeight(height) {
    document.documentElement.style.setProperty('--reading-line-height', height);
    elements.lineHeight.value = height;
    elements.lineHeightValue.textContent = height;
    saveSettings();
  }

  function saveSettings() {
    Storage.saveReadingSettings({
      fontFamily: elements.fontFamily.value,
      fontSize: parseInt(elements.fontSize.value),
      lineHeight: parseFloat(elements.lineHeight.value)
    });
  }

  function toggleSettings() {
    elements.settingsPanel.classList.toggle('open');
    elements.settingsOverlay.classList.toggle('hidden');
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

    elements.readingArea.addEventListener('scroll', () => {
      const el = elements.readingArea;
      const progress = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
      updateProgress(Math.min(100, Math.max(0, progress)));
    });

    elements.settingsBtn.addEventListener('click', toggleSettings);
    elements.closeSettings.addEventListener('click', toggleSettings);
    elements.settingsOverlay.addEventListener('click', toggleSettings);

    elements.fontFamily.addEventListener('change', (e) => applyFont(e.target.value));
    elements.fontSize.addEventListener('input', (e) => applyFontSize(e.target.value));
    elements.lineHeight.addEventListener('input', (e) => applyLineHeight(e.target.value));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' && currentChapterId > 1) loadChapter(currentChapterId - 1);
      if (e.key === 'ArrowRight' && currentChapterId < chapters.length) loadChapter(currentChapterId + 1);
      if (e.key === 'Escape') toggleSettings();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
