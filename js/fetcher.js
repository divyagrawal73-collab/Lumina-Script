// js/fetcher.js - API-only data fetcher with in-memory caching

const Fetcher = {
  _novelsMeta: null,
  _chapterListCache: new Map(),
  _CACHE_TTL: 5 * 60 * 1000, // 5 minutes

  async getNovels() {
    if (this._novelsMeta) return this._novelsMeta;
    try {
      const res = await fetch('/data/novels.json?v=20260728');
      if (!res.ok) throw new Error('Failed to load novels');
      this._novelsMeta = await res.json();
      return this._novelsMeta;
    } catch (e) {
      console.error('Failed to load novels metadata:', e);
      return [];
    }
  },

  async _getApiId(novelId) {
    const novels = await this.getNovels();
    const novel = novels.find(n => n.id === novelId);
    return novel?.apiId || novelId;
  },

  async getChapterList(novelId) {
    const cached = this._chapterListCache.get(novelId);
    if (cached && (Date.now() - cached.timestamp) < this._CACHE_TTL) {
      return { chapters: cached.chapters, source: 'cache' };
    }

    const apiId = await this._getApiId(novelId);
    try {
      const res = await fetch(`/api/proxy/novel/${apiId}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      const chapters = Array.isArray(data) ? data : (data.chapters || []);
      this._chapterListCache.set(novelId, { chapters, timestamp: Date.now() });
      return { chapters, source: 'api' };
    } catch (e) {
      console.error(`Failed to fetch chapter list for ${novelId}:`, e);
      return { chapters: [], source: 'error' };
    }
  },

  async getChapter(novelId, chapterId) {
    const apiId = await this._getApiId(novelId);
    try {
      const res = await fetch(`/api/proxy/novel/${apiId}/chapter/${chapterId}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      return { ...data, source: 'api' };
    } catch (e) {
      console.error(`Failed to fetch chapter ${chapterId} for ${novelId}:`, e);
      return null;
    }
  },

  async getChapterContent(novelId, chapterId) {
    const apiId = await this._getApiId(novelId);
    try {
      const res = await fetch(`/api/proxy/novel/${apiId}/chapter/${chapterId}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      return data.chapter?.content || data.content || data.chapter_content || '';
    } catch (e) {
      console.error(`Failed to fetch chapter content for ${novelId} ch.${chapterId}:`, e);
      return null;
    }
  }
};
