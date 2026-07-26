// js/fetcher.js - Hybrid data fetcher (static JSON + API proxy fallback)

const Fetcher = {
  _novelsMeta: null,
  _localNovelIds: ['6a0cb5634f942c668d69823e', '69faa859a5f4c7d1b734d496', '69fbe5ffa5f4c7d1b734d906'],

  // Load novels metadata from static file
  async getNovels() {
    if (this._novelsMeta) return this._novelsMeta;
    try {
      const res = await fetch('/data/novels.json');
      if (!res.ok) throw new Error('Failed to load novels');
      this._novelsMeta = await res.json();
      return this._novelsMeta;
    } catch (e) {
      console.error('Failed to load novels metadata:', e);
      return [];
    }
  },

  // Get chapter list: try local static first, then API proxy
  async getChapterList(novelId) {
    // Check if we have a local static file
    if (this._localNovelIds.includes(novelId)) {
      try {
        const res = await fetch(`/data/${novelId}/chapters.json`);
        if (res.ok) {
          const chapters = await res.json();
          return { chapters, source: 'static' };
        }
      } catch (e) {
        console.warn(`Static file missing for ${novelId}, falling back to API`);
      }
    }

    // Fallback to API proxy
    try {
      const res = await fetch(`/api/proxy/novel/${novelId}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      // Normalize: API returns { chapters: [...] } or just [...]
      const chapters = Array.isArray(data) ? data : (data.chapters || []);
      return { chapters, source: 'api' };
    } catch (e) {
      console.error(`Failed to fetch chapter list for ${novelId}:`, e);
      return { chapters: [], source: 'error' };
    }
  },

  // Get single chapter content: try local cache first, then API proxy
  async getChapter(novelId, chapterId) {
    // For local novels, chapter content is embedded in the chapters.json
    // We need to extract it from the full chapter list
    if (this._localNovelIds.includes(novelId)) {
      try {
        const res = await fetch(`/data/${novelId}/chapters.json`);
        if (res.ok) {
          const chapters = await res.json();
          const chapter = chapters.find(c => c.id === parseInt(chapterId) || c.id === chapterId);
          if (chapter) return { ...chapter, source: 'static' };
        }
      } catch (e) {
        console.warn(`Local chapter not found for ${novelId} ch.${chapterId}`);
      }
    }

    // Fallback to API proxy
    try {
      const res = await fetch(`/api/proxy/novel/${novelId}/chapter/${chapterId}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      return { ...data, source: 'api' };
    } catch (e) {
      console.error(`Failed to fetch chapter ${chapterId} for ${novelId}:`, e);
      return null;
    }
  }
};
