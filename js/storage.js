// js/storage.js - localStorage helpers

const Storage = {
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.warn(`Failed to read ${key} from localStorage:`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`Failed to save ${key} to localStorage:`, e);
      return false;
    }
  },

  getReadingProgress(novelId) {
    const progress = this.get('readingProgress', {});
    return progress[novelId] || { lastReadChapter: 0, chaptersRead: [] };
  },

  saveReadingProgress(novelId, chapterId) {
    const progress = this.get('readingProgress', {});
    if (!progress[novelId]) {
      progress[novelId] = { lastReadChapter: 0, chaptersRead: [] };
    }
    progress[novelId].lastReadChapter = chapterId;
    if (!progress[novelId].chaptersRead.includes(chapterId)) {
      progress[novelId].chaptersRead.push(chapterId);
    }
    this.set('readingProgress', progress);
  },

  getReadingSettings() {
    return this.get('readingSettings', {
      fontFamily: "'Inter', sans-serif",
      fontSize: 18,
      lineHeight: 1.8
    });
  },

  saveReadingSettings(settings) {
    this.set('readingSettings', settings);
  }
};
