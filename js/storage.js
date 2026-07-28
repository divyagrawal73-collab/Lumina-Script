// js/storage.js - Supabase-backed storage with localStorage cache

const Storage = {
  _supabase: null,
  _user: null,
  _cache: {},

  // ==================== INIT ====================
  init() {
    if (typeof supabase === 'undefined' || !SUPABASE_URL || SUPABASE_ANON_KEY === 'YOUR_ANON_KEY_HERE') {
      console.warn('Supabase not configured. Using localStorage fallback.');
      this._fallback = true;
      return;
    }
    this._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this._loadUser();
    this._fallback = false;
  },

  _loadUser() {
    if (this._fallback) return null;
    const cached = localStorage.getItem('ls_user');
    if (cached) {
      this._user = JSON.parse(cached);
    }
  },

  async _ensureUser() {
    if (this._fallback) return null;
    if (this._user) return this._user;
    try {
      const { data: { user } } = await this._supabase.auth.getUser();
      if (user) {
        this._user = user;
        localStorage.setItem('ls_user', JSON.stringify(user));
      }
    } catch (e) {
      console.warn('Failed to get user:', e);
    }
    return this._user;
  },

  // ==================== THEME (localStorage only) ====================
  getTheme() {
    return localStorage.getItem('ls_theme') || 'light';
  },

  setTheme(theme) {
    localStorage.setItem('ls_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  },

  toggleTheme() {
    if (typeof ThemeManager !== 'undefined') {
      ThemeManager.toggleDark();
      return ThemeManager.isDark() ? 'dark' : 'light';
    }
    const next = this.getTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
    return next;
  },

  initTheme() {
    const theme = this.getTheme();
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  },

  // ==================== READING SETTINGS (localStorage only) ====================
  getReadingSettings() {
    const s = localStorage.getItem('ls_readingSettings');
    return s ? JSON.parse(s) : { fontFamily: "'EB Garamond', serif", fontSize: 18, lineHeight: 1.8, textWidth: 800 };
  },

  saveReadingSettings(settings) {
    localStorage.setItem('ls_readingSettings', JSON.stringify(settings));
  },

  // ==================== AUTH ====================
  getCurrentUser() {
    return this._user || null;
  },

  isLoggedIn() {
    return this._user !== null;
  },

  async signup(username, password) {
    if (this._fallback) return this._localSignup(username, password);
    try {
      const { data, error } = await this._supabase.auth.signUp({
        email: `${username}@luminascript.app`,
        password: password,
        options: { data: { username } }
      });
      if (error) return { success: false, error: error.message };

      // Create profile
      if (data.user) {
        await this._supabase.from('profiles').insert({
          id: data.user.id,
          username: username
        });
      }

      this._user = data.user;
      localStorage.setItem('ls_user', JSON.stringify(data.user));
      return { success: true, user: data.user };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async login(username, password) {
    if (this._fallback) return this._localLogin(username, password);
    try {
      const { data, error } = await this._supabase.auth.signInWithPassword({
        email: `${username}@luminascript.app`,
        password: password
      });
      if (error) return { success: false, error: error.message };
      this._user = data.user;
      localStorage.setItem('ls_user', JSON.stringify(data.user));
      return { success: true, user: data.user };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async logout() {
    if (this._fallback) { this._localLogout(); return; }
    await this._supabase.auth.signOut();
    this._user = null;
    localStorage.removeItem('ls_user');
  },

  // ==================== READING PROGRESS ====================
  async getReadingProgress(novelId) {
    if (this._fallback) return this._localGetReadingProgress(novelId);
    const user = await this._ensureUser();
    if (!user) return { lastReadChapter: 0, chaptersRead: [] };

    const { data } = await this._supabase
      .from('reading_progress')
      .select('last_read_chapter, chapters_read')
      .eq('user_id', user.id)
      .eq('novel_id', novelId)
      .single();

    if (!data) return { lastReadChapter: 0, chaptersRead: [] };
    return {
      lastReadChapter: data.last_read_chapter || 0,
      chaptersRead: data.chapters_read || []
    };
  },

  async saveReadingProgress(novelId, chapterId) {
    if (this._fallback) return this._localSaveReadingProgress(novelId, chapterId);
    const user = await this._ensureUser();
    if (!user) return;

    const progress = await this.getReadingProgress(novelId);
    const newChapters = progress.chaptersRead.includes(chapterId)
      ? progress.chaptersRead
      : [...progress.chaptersRead, chapterId];

    await this._supabase.from('reading_progress').upsert({
      user_id: user.id,
      novel_id: novelId,
      last_read_chapter: chapterId,
      chapters_read: newChapters,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,novel_id' });
  },

  async getAllReadingProgress() {
    if (this._fallback) return this._localGetAllReadingProgress();
    const user = await this._ensureUser();
    if (!user) return {};

    const { data } = await this._supabase
      .from('reading_progress')
      .select('novel_id, last_read_chapter, chapters_read, updated_at')
      .eq('user_id', user.id);

    const result = {};
    if (data) {
      data.forEach(row => {
        result[row.novel_id] = {
          lastReadChapter: row.last_read_chapter || 0,
          chaptersRead: row.chapters_read || [],
          lastReadAt: row.updated_at || ''
        };
      });
    }
    return result;
  },

  // ==================== NOVEL STATUS ====================
  async getNovelStatus(novelId) {
    if (this._fallback) return this._localGetNovelStatus(novelId);
    const user = await this._ensureUser();
    if (!user) return null;

    const { data } = await this._supabase
      .from('novel_statuses')
      .select('status')
      .eq('user_id', user.id)
      .eq('novel_id', novelId)
      .single();

    return data ? data.status : null;
  },

  async setNovelStatus(novelId, status) {
    if (this._fallback) return this._localSetNovelStatus(novelId, status);
    const user = await this._ensureUser();
    if (!user) return;

    if (!status) {
      await this._supabase.from('novel_statuses')
        .delete()
        .eq('user_id', user.id)
        .eq('novel_id', novelId);
    } else {
      await this._supabase.from('novel_statuses').upsert({
        user_id: user.id,
        novel_id: novelId,
        status,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,novel_id' });
    }
  },

  async getAllNovelStatuses() {
    if (this._fallback) return this._localGetAllNovelStatuses();
    const user = await this._ensureUser();
    if (!user) return {};

    const { data } = await this._supabase
      .from('novel_statuses')
      .select('novel_id, status')
      .eq('user_id', user.id);

    const result = {};
    if (data) data.forEach(r => { result[r.novel_id] = r.status; });
    return result;
  },

  // ==================== FAVORITES ====================
  async getFavorites() {
    if (this._fallback) return this._localGetFavorites();
    const user = await this._ensureUser();
    if (!user) return [];

    const { data } = await this._supabase
      .from('favorites')
      .select('novel_id')
      .eq('user_id', user.id);

    return data ? data.map(r => r.novel_id) : [];
  },

  async addFavorite(novelId) {
    if (this._fallback) return this._localAddFavorite(novelId);
    const user = await this._ensureUser();
    if (!user) return;
    await this._supabase.from('favorites').upsert({
      user_id: user.id, novel_id: novelId
    }, { onConflict: 'user_id,novel_id' });
  },

  async removeFavorite(novelId) {
    if (this._fallback) return this._localRemoveFavorite(novelId);
    const user = await this._ensureUser();
    if (!user) return;
    await this._supabase.from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('novel_id', novelId);
  },

  async isFavorite(novelId) {
    const favs = await this.getFavorites();
    return favs.includes(novelId);
  },

  // ==================== RATINGS ====================
  async getRating(novelId) {
    if (this._fallback) return this._localGetRating(novelId);
    const user = await this._ensureUser();
    if (!user) return 0;

    const { data } = await this._supabase
      .from('ratings')
      .select('rating')
      .eq('user_id', user.id)
      .eq('novel_id', novelId)
      .single();

    return data ? data.rating : 0;
  },

  async getAllRatings() {
    if (this._fallback) return this._localGetAllRatings();
    const user = await this._ensureUser();
    if (!user) return {};

    const { data } = await this._supabase
      .from('ratings')
      .select('novel_id, rating')
      .eq('user_id', user.id);

    const result = {};
    if (data) data.forEach(r => { result[r.novel_id] = r.rating; });
    return result;
  },

  async submitRating(novelId, rating) {
    if (this._fallback) return this._localSubmitRating(novelId, rating);
    const user = await this._ensureUser();
    if (!user) return;

    await this._supabase.from('ratings').upsert({
      user_id: user.id, novel_id: novelId, rating
    }, { onConflict: 'user_id,novel_id' });

    await this._supabase.from('global_ratings').upsert({
      user_id: user.id, novel_id: novelId, rating
    }, { onConflict: 'user_id,novel_id' });
  },

  async getAverageRating(novelId) {
    if (this._fallback) return this._localGetAverageRating(novelId);

    const { data } = await this._supabase
      .from('global_ratings')
      .select('rating')
      .eq('novel_id', novelId);

    if (!data || data.length === 0) return { average: 0, count: 0 };
    const sum = data.reduce((a, b) => a + b.rating, 0);
    return { average: (sum / data.length).toFixed(1), count: data.length };
  },

  // ==================== COMMENTS ====================
  async getComments(novelId, chapterId = null) {
    if (this._fallback) return this._localGetComments(novelId, chapterId);

    let query = this._supabase
      .from('comments')
      .select('*')
      .eq('novel_id', novelId)
      .order('created_at', { ascending: false });

    if (chapterId) {
      query = query.eq('chapter_id', chapterId);
    } else {
      query = query.is('chapter_id', null);
    }

    const { data } = await query;
    return data || [];
  },

  async addComment(novelId, chapterId, text) {
    if (this._fallback) return this._localAddComment(novelId, chapterId, text);
    const user = await this._ensureUser();
    if (!user) return null;

    const { data, error } = await this._supabase.from('comments').insert({
      user_id: user.id,
      username: user.user_metadata?.username || 'Anonymous',
      novel_id: novelId,
      chapter_id: chapterId,
      text
    }).select().single();

    return error ? null : data;
  },

  async deleteComment(novelId, commentId, chapterId = null) {
    if (this._fallback) return this._localDeleteComment(novelId, commentId);
    const user = await this._ensureUser();
    if (!user) return;
    await this._supabase.from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);
  },

  async likeComment(novelId, commentId, chapterId = null) {
    if (this._fallback) return this._localLikeComment(novelId, commentId);
    const user = await this._ensureUser();
    if (!user) return;

    const { data: comment } = await this._supabase
      .from('comments')
      .select('liked_by, likes')
      .eq('id', commentId)
      .single();

    if (!comment) return;

    const likedBy = comment.liked_by || [];
    const isLiked = likedBy.includes(user.id);

    const newLikedBy = isLiked
      ? likedBy.filter(id => id !== user.id)
      : [...likedBy, user.id];

    await this._supabase.from('comments').update({
      liked_by: newLikedBy,
      likes: isLiked ? comment.likes - 1 : comment.likes + 1
    }).eq('id', commentId);
  },

  // ==================== READING HISTORY ====================
  async getReadingHistory() {
    if (this._fallback) return this._localGetReadingHistory();
    const user = await this._ensureUser();
    if (!user) return [];

    const { data } = await this._supabase
      .from('reading_history')
      .select('novel_id, chapter_id, read_at')
      .eq('user_id', user.id)
      .order('read_at', { ascending: false })
      .limit(50);

    return data || [];
  },

  async addToReadingHistory(novelId, chapterId) {
    if (this._fallback) return this._localAddToReadingHistory(novelId, chapterId);
    const user = await this._ensureUser();
    if (!user) return;

    // Delete old entry for this novel, then insert fresh
    await this._supabase.from('reading_history')
      .delete()
      .eq('user_id', user.id)
      .eq('novel_id', novelId);

    await this._supabase.from('reading_history').insert({
      user_id: user.id,
      novel_id: novelId,
      chapter_id: chapterId,
      read_at: new Date().toISOString()
    });
  },

  async clearReadingHistory() {
    if (this._fallback) return this._localClearReadingHistory();
    const user = await this._ensureUser();
    if (!user) return;
    await this._supabase.from('reading_history')
      .delete()
      .eq('user_id', user.id);
  },

  // ==================== CHAPTER BOOKMARKS ====================
  async getChapterBookmarks(novelId) {
    // Keep in localStorage (not worth a DB table)
    const user = this._user;
    if (!user) return [];
    const key = `ls_bookmarks_${user.id}_${novelId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  async addChapterBookmark(novelId, chapterId, note = '') {
    const user = this._user;
    if (!user) return;
    const bookmarks = await this.getChapterBookmarks(novelId);
    if (!bookmarks.find(b => b.chapterId === chapterId)) {
      bookmarks.push({ chapterId, note, createdAt: new Date().toISOString() });
      localStorage.setItem(`ls_bookmarks_${user.id}_${novelId}`, JSON.stringify(bookmarks));
    }
  },

  async removeChapterBookmark(novelId, chapterId) {
    const user = this._user;
    if (!user) return;
    let bookmarks = await this.getChapterBookmarks(novelId);
    bookmarks = bookmarks.filter(b => b.chapterId !== chapterId);
    localStorage.setItem(`ls_bookmarks_${user.id}_${novelId}`, JSON.stringify(bookmarks));
  },

  async isChapterBookmarked(novelId, chapterId) {
    const bookmarks = await this.getChapterBookmarks(novelId);
    return bookmarks.some(b => b.chapterId === chapterId);
  },

  // ==================== ANALYTICS ====================
  async getNovelAnalytics(novelId) {
    if (this._fallback) return { sessions: 0, totalTime: 0, lastReadAt: null };
    const user = await this._ensureUser();
    if (!user) return { sessions: 0, totalTime: 0, lastReadAt: null };

    const { data } = await this._supabase
      .from('reading_analytics')
      .select('sessions, total_time_ms, last_read_at')
      .eq('user_id', user.id)
      .eq('novel_id', novelId)
      .single();

    if (!data) return { sessions: 0, totalTime: 0, lastReadAt: null };
    return {
      sessions: data.sessions || 0,
      totalTime: data.total_time_ms || 0,
      lastReadAt: data.last_read_at
    };
  },

  async startReadingSession(novelId) {
    if (this._fallback) return;
    const user = await this._ensureUser();
    if (!user) return;

    const analytics = await this.getNovelAnalytics(novelId);
    await this._supabase.from('reading_analytics').upsert({
      user_id: user.id,
      novel_id: novelId,
      sessions: analytics.sessions + 1,
      total_time_ms: analytics.totalTime
    }, { onConflict: 'user_id,novel_id' });
  },

  async endReadingSession(novelId) {
    if (this._fallback) return;
    const user = await this._ensureUser();
    if (!user) return;

    const analytics = await this.getNovelAnalytics(novelId);
    await this._supabase.from('reading_analytics').upsert({
      user_id: user.id,
      novel_id: novelId,
      sessions: analytics.sessions,
      total_time_ms: analytics.totalTime,
      last_read_at: new Date().toISOString()
    }, { onConflict: 'user_id,novel_id' });
  },

  // ==================== USER STATS ====================
  async getUserStats() {
    if (this._fallback) return this._localGetUserStats();
    const user = await this._ensureUser();
    if (!user) return null;

    const progress = await this.getAllReadingProgress();
    const statuses = await this.getAllNovelStatuses();
    const ratings = await this.getAllRatings();

    return {
      novelsRead: Object.keys(progress).filter(id => progress[id].chaptersRead.length > 0).length,
      chaptersRead: Object.values(progress).reduce((sum, p) => sum + p.chaptersRead.length, 0),
      reading: Object.values(statuses).filter(s => s === 'reading').length,
      planToRead: Object.values(statuses).filter(s => s === 'plan-to-read').length,
      dropped: Object.values(statuses).filter(s => s === 'dropped').length,
      completed: Object.values(statuses).filter(s => s === 'completed').length,
      ratingsCount: Object.keys(ratings).length,
      historyCount: Object.keys(progress).filter(id => progress[id].chaptersRead.length > 0).length
    };
  },

  async updateProfile(updates) {
    if (this._fallback) return;
    const user = await this._ensureUser();
    if (!user) return;
    await this._supabase.from('profiles').update(updates).eq('id', user.id);
  },

  // ==================== LOCALSTORAGE FALLBACK ====================
  // Used when Supabase is not configured
  _localGet(key, def = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
    catch { return def; }
  },

  _localSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  },

  _localSignup(username, password) {
    const users = this._localGet('ls_users', []);
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, error: 'Username already exists' };
    }
    const user = { id: Date.now().toString(), username, password, createdAt: new Date().toISOString() };
    users.push(user);
    this._localSet('ls_users', users);
    this._user = { id: user.id, user_metadata: { username } };
    localStorage.setItem('ls_user', JSON.stringify(this._user));
    return { success: true, user: this._user };
  },

  _localLogin(username, password) {
    const users = this._localGet('ls_users', []);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) return { success: false, error: 'Invalid credentials' };
    this._user = { id: user.id, user_metadata: { username } };
    localStorage.setItem('ls_user', JSON.stringify(this._user));
    return { success: true, user: this._user };
  },

  _localLogout() {
    this._user = null;
    localStorage.removeItem('ls_user');
  },

  _localGetReadingProgress(novelId) {
    const p = this._localGet('ls_readingProgress', {});
    return p[novelId] || { lastReadChapter: 0, chaptersRead: [] };
  },

  _localSaveReadingProgress(novelId, chapterId) {
    const p = this._localGet('ls_readingProgress', {});
    if (!p[novelId]) p[novelId] = { lastReadChapter: 0, chaptersRead: [] };
    p[novelId].lastReadChapter = chapterId;
    p[novelId].lastReadAt = new Date().toISOString();
    if (!p[novelId].chaptersRead.includes(chapterId)) p[novelId].chaptersRead.push(chapterId);
    this._localSet('ls_readingProgress', p);
  },

  _localGetAllReadingProgress() {
    return this._localGet('ls_readingProgress', {});
  },

  _localGetNovelStatus(novelId) {
    const s = this._localGet('ls_novelStatus', {});
    return s[novelId] || null;
  },

  _localSetNovelStatus(novelId, status) {
    const s = this._localGet('ls_novelStatus', {});
    if (!status) delete s[novelId]; else s[novelId] = status;
    this._localSet('ls_novelStatus', s);
  },

  _localGetAllNovelStatuses() {
    return this._localGet('ls_novelStatus', {});
  },

  _localGetFavorites() {
    return this._localGet('ls_favorites', []);
  },

  _localAddFavorite(novelId) {
    const f = this._localGetFavorites();
    if (!f.includes(novelId)) { f.push(novelId); this._localSet('ls_favorites', f); }
  },

  _localRemoveFavorite(novelId) {
    this._localSet('ls_favorites', this._localGetFavorites().filter(id => id !== novelId));
  },

  _localGetRating(novelId) {
    const r = this._localGet('ls_ratings', {});
    return r[novelId] || 0;
  },

  _localGetAllRatings() {
    return this._localGet('ls_ratings', {});
  },

  _localSubmitRating(novelId, rating) {
    const r = this._localGet('ls_ratings', {});
    r[novelId] = rating;
    this._localSet('ls_ratings', r);
  },

  _localGetAverageRating(novelId) {
    const r = this._localGet('ls_ratings', {});
    const rating = r[novelId] || 0;
    return { average: rating ? rating.toFixed(1) : 0, count: rating ? 1 : 0 };
  },

  _localGetComments(novelId, chapterId) {
    const key = chapterId ? `ls_comments_${novelId}_${chapterId}` : `ls_comments_${novelId}`;
    return this._localGet(key, []);
  },

  _localAddComment(novelId, chapterId, text) {
    const user = this._user;
    if (!user) return null;
    const key = chapterId ? `ls_comments_${novelId}_${chapterId}` : `ls_comments_${novelId}`;
    const comments = this._localGet(key, []);
    const comment = {
      id: Date.now().toString(),
      user_id: user.id,
      username: user.user_metadata?.username || 'Anonymous',
      text, novel_id: novelId, chapter_id: chapterId,
      likes: 0, liked_by: [],
      created_at: new Date().toISOString()
    };
    comments.unshift(comment);
    this._localSet(key, comments);
    return comment;
  },

  _localDeleteComment(novelId, commentId) {
    const user = this._user;
    if (!user) return;
    ['ls_comments_' + novelId, `ls_comments_${novelId}_`].forEach(prefix => {
      Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(key => {
        let comments = this._localGet(key, []);
        comments = comments.filter(c => !(c.id === commentId && c.user_id === user.id));
        this._localSet(key, comments);
      });
    });
  },

  _localLikeComment(novelId, commentId) {
    const user = this._user;
    if (!user) return;
    Object.keys(localStorage).filter(k => k.startsWith('ls_comments_' + novelId)).forEach(key => {
      const comments = this._localGet(key, []);
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        if (!comment.liked_by) comment.liked_by = [];
        if (comment.liked_by.includes(user.id)) {
          comment.liked_by = comment.liked_by.filter(id => id !== user.id);
          comment.likes--;
        } else {
          comment.liked_by.push(user.id);
          comment.likes++;
        }
        this._localSet(key, comments);
      }
    });
  },

  _localGetReadingHistory() {
    return this._localGet('ls_readingHistory', []);
  },

  _localAddToReadingHistory(novelId, chapterId) {
    let history = this._localGetReadingHistory();
    history = history.filter(h => h.novelId !== novelId);
    history.unshift({ novelId, chapterId, readAt: new Date().toISOString() });
    history = history.slice(0, 50);
    this._localSet('ls_readingHistory', history);
  },

  _localClearReadingHistory() {
    this._localSet('ls_readingHistory', []);
  },

  _localGetUserStats() {
    const progress = this._localGetAllReadingProgress();
    const statuses = this._localGetAllNovelStatuses();
    const ratings = this._localGetAllRatings();
    const history = this._localGetReadingHistory();
    return {
      novelsRead: Object.keys(progress).filter(id => progress[id].chaptersRead?.length > 0).length,
      chaptersRead: Object.values(progress).reduce((sum, p) => sum + (p.chaptersRead?.length || 0), 0),
      reading: Object.values(statuses).filter(s => s === 'reading').length,
      planToRead: Object.values(statuses).filter(s => s === 'plan-to-read').length,
      dropped: Object.values(statuses).filter(s => s === 'dropped').length,
      completed: Object.values(statuses).filter(s => s === 'completed').length,
      ratingsCount: Object.keys(ratings).length,
      historyCount: history.length
    };
  }
};

Storage.initTheme();
try {
  Storage.init();
} catch (e) {
  console.warn('Storage init failed, using localStorage fallback:', e);
  Storage._fallback = true;
}
