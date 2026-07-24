// js/novel.js - Novel detail page logic

(function() {
  'use strict';

  const novelHeader = document.getElementById('novel-header');
  const chapterList = document.getElementById('chapter-list');
  const chapterSearch = document.getElementById('chapter-search');
  const titleEl = document.querySelector('title');
  let novelData = null;
  let chapters = [];

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
      const response = await fetch('/data/novels.json');
      if (!response.ok) throw new Error('Failed to load novels');
      const novels = await response.json();
      novelData = novels.find(n => n.id === novelId);
      
      if (!novelData) {
        window.location.href = '/';
        return;
      }

      titleEl.textContent = `${novelData.title} - Novel Archive`;
      await loadChapters(novelId);
      renderHeader();
      renderChapters();
    } catch (error) {
      novelHeader.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
  }

  async function loadChapters(novelId) {
    const response = await fetch(`/data/${novelId}/chapters.json`);
    if (!response.ok) throw new Error('Failed to load chapters');
    chapters = await response.json();
  }

  function renderHeader() {
    const progress = Storage.getReadingProgress(novelData.id);
    const readCount = progress.chaptersRead.length;
    const total = chapters.length;
    const lastRead = progress.lastReadChapter;

    novelHeader.innerHTML = `
      <img src="${novelData.cover}" alt="${escapeHtml(novelData.title)}" class="novel-cover" onerror="this.style.background='var(--accent-gradient)'">
      <div class="novel-details">
        <h1>${escapeHtml(novelData.title)}</h1>
        <div class="author">by ${escapeHtml(novelData.author)}</div>
        <p class="description">${escapeHtml(novelData.description)}</p>
        <div class="progress-badge">${readCount}/${total} chapters read</div>
        <div class="action-btns">
          ${lastRead > 0 
            ? `<a href="/reader.html?novel=${novelData.id}&chapter=${lastRead}" class="btn btn-primary">Continue Reading</a>`
            : `<a href="/reader.html?novel=${novelData.id}&chapter=1" class="btn btn-primary">Start Reading</a>`
          }
        </div>
      </div>
    `;
  }

  function renderChapters(filter = '') {
    const progress = Storage.getReadingProgress(novelData.id);
    const lowerFilter = filter.toLowerCase();

    const filtered = chapters.filter(ch => 
      !lowerFilter || ch.title.toLowerCase().includes(lowerFilter)
    );

    chapterList.innerHTML = filtered.map(ch => `
      <a href="/reader.html?novel=${novelData.id}&chapter=${ch.id}" class="chapter-item ${progress.chaptersRead.includes(ch.id) ? 'read' : ''}">
        <span class="chapter-number">${ch.id}</span>
        <span class="chapter-title">${escapeHtml(ch.title)}</span>
      </a>
    `).join('');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function bindEvents() {
    chapterSearch.addEventListener('input', (e) => {
      renderChapters(e.target.value);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();