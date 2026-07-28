# Remove Pre-Downloaded Chapters, API-Only Fetching

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete all ~45MB of pre-downloaded chapter JSON files. Make every novel fetch chapter lists and content exclusively through the Vercel API proxy. Add in-memory caching for fast repeat loads.

**Architecture:** Remove `data/{novel-id}/` directories. Add `apiId` to all novels in `novels.json`. Rewrite `fetcher.js` to remove all local-static logic, always use API proxy, use `apiId` for API calls, and cache chapter lists in memory.

**Tech Stack:** Vanilla JS, Vercel serverless functions, novelarchive.cc API

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `data/sky-pride/` | DELETE | Pre-downloaded chapters (4.7MB) |
| `data/shadow-slave/` | DELETE | Pre-downloaded chapters (22MB) |
| `data/swallowed-star/` | DELETE | Pre-downloaded chapters (17MB) + cover |
| `data/lord-of-the-mysteries/` | DELETE | Pre-downloaded chapters (82KB) |
| `data/warlock-of-the-magus-world/` | DELETE | Pre-downloaded chapters (83KB) |
| `data/swallowed-star-2/` | DELETE | Pre-downloaded chapters (53KB) |
| `data/swallowed-star-2-origin-continent/` | DELETE | Pre-downloaded chapters (42KB) |
| `data/novels.json` | MODIFY | Add `apiId` to sky-pride, shadow-slave, swallowed-star |
| `js/fetcher.js` | REWRITE | Remove local-static logic, always use API proxy, add in-memory cache |

---

### Task 1: Delete all pre-downloaded chapter data

**Files:**
- Delete: `data/sky-pride/` (entire directory)
- Delete: `data/shadow-slave/` (entire directory)
- Delete: `data/swallowed-star/` (entire directory, including cover.webp)
- Delete: `data/lord-of-the-mysteries/` (entire directory)
- Delete: `data/warlock-of-the-magus-world/` (entire directory)
- Delete: `data/swallowed-star-2/` (entire directory)
- Delete: `data/swallowed-star-2-origin-continent/` (entire directory)

- [ ] **Step 1: Delete all chapter data directories**

```powershell
Remove-Item -Recurse -Force "Z:\novels\novel-website\data\sky-pride"
Remove-Item -Recurse -Force "Z:\novels\novel-website\data\shadow-slave"
Remove-Item -Recurse -Force "Z:\novels\novel-website\data\swallowed-star"
Remove-Item -Recurse -Force "Z:\novels\novel-website\data\lord-of-the-mysteries"
Remove-Item -Recurse -Force "Z:\novels\novel-website\data\warlock-of-the-magus-world"
Remove-Item -Recurse -Force "Z:\novels\novel-website\data\swallowed-star-2"
Remove-Item -Recurse -Force "Z:\novels\novel-website\data\swallowed-star-2-origin-continent"
```

- [ ] **Step 2: Verify only novels.json remains in data/**

Run: `Get-ChildItem "Z:\novels\novel-website\data"`
Expected: Only `novels.json` listed

- [ ] **Step 3: Commit**

```bash
git add -A data/
git commit -m "chore: delete all pre-downloaded chapter data (~45MB)"
```

---

### Task 2: Add apiId to all novels in novels.json

**Files:**
- Modify: `data/novels.json`

The novelarchive.cc API expects its own IDs (e.g., `6a0cb5634f942c668d69823e`). Three novels are missing `apiId`. Extract from their `sourceUrl` fields.

- [ ] **Step 1: Add apiId to sky-pride, shadow-slave, swallowed-star**

In `data/novels.json`, add `"apiId"` to the three novels that don't have it:

```json
{
  "id": "sky-pride",
  "title": "Sky Pride",
  "author": "Warby Picus",
  "cover": "/covers/sky-pride.webp",
  "description": "A fantasy novel about a young hero's journey to claim the skies.",
  "chapterCount": 359,
  "sourceUrl": "https://novelarchive.cc/novel/6a0cb5634f942c668d69823e",
  "tags": ["Xianxia", "Action", "Adventure", "Fantasy", "Martial Arts", "Supernatural", "Wuxia"],
  "apiId": "6a0cb5634f942c668d69823e"
},
{
  "id": "shadow-slave",
  "title": "Shadow Slave",
  "author": "Guiltythree",
  "cover": "/covers/shadow-slave.webp",
  "description": "Growing up in poverty...",
  "chapterCount": 3117,
  "sourceUrl": "https://novelarchive.cc/novel/69faa859a5f4c7d1b734d496",
  "tags": ["Action", "Fantasy", "Mystery", "Romance"],
  "apiId": "69faa859a5f4c7d1b734d496"
},
{
  "id": "swallowed-star",
  "title": "Swallowed Star",
  "author": "I Eat Tomatoes",
  "cover": "/covers/swallowed-star.webp",
  "description": "Year 2056...",
  "chapterCount": 1485,
  "sourceUrl": "https://novelarchive.cc/novel/69fbe5ffa5f4c7d1b734d906",
  "tags": ["Action", "Adventure", "Fantasy", "Martial Arts", "Sci-fi", "Shounen", "Xuanhuan"],
  "apiId": "69fbe5ffa5f4c7d1b734d906"
}
```

- [ ] **Step 2: Verify all 7 novels have apiId**

Run: `Select-String -Path "Z:\novels\novel-website\data\novels.json" -Pattern "apiId" | Measure-Object`
Expected: Count = 7

- [ ] **Step 3: Commit**

```bash
git add data/novels.json
git commit -m "feat: add apiId to all novels for API-only fetching"
```

---

### Task 3: Rewrite fetcher.js for API-only with in-memory cache

**Files:**
- Rewrite: `js/fetcher.js`

Remove `_localNovelIds`, `_apiNovelIds`. All novels now use their `apiId` from novels.json. Add in-memory `_chapterListCache` Map for fast repeat loads.

- [ ] **Step 1: Rewrite fetcher.js**

Replace entire contents of `js/fetcher.js`:

```javascript
// js/fetcher.js - API-only data fetcher with in-memory caching

const Fetcher = {
  _novelsMeta: null,
  _chapterListCache: new Map(), // novelId -> { chapters, timestamp }
  _CACHE_TTL: 5 * 60 * 1000, // 5 minutes

  // Load novels metadata from static file
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

  // Get apiId for a novel — fetches from metadata if needed
  async _getApiId(novelId) {
    const novels = await this.getNovels();
    const novel = novels.find(n => n.id === novelId);
    return novel?.apiId || novelId; // fallback to novelId if no apiId
  },

  // Get chapter list from API proxy (with in-memory cache)
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

  // Get single chapter content from API proxy
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

  // Get chapter content on-demand
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
```

- [ ] **Step 2: Verify fetcher.js has no references to local static files**

Run: `Select-String -Path "Z:\novels\novel-website\js\fetcher.js" -Pattern "local|static|_localNovelIds|_apiNovelIds|chapters.json"`
Expected: No matches

- [ ] **Step 3: Commit**

```bash
git add js/fetcher.js
git commit -m "feat: rewrite fetcher.js for API-only with in-memory caching"
```

---

### Task 4: Update version busting on all HTML script tags

**Files:**
- Modify: `reader.html` (already has `?v=20260728` on tts.js)
- Modify: `index.html`
- Modify: `novel.html`
- Modify: `login.html`
- Modify: `profile.html`
- Modify: `favorites.html`
- Modify: `history.html`

All HTML files reference `js/fetcher.js` with old version query strings. Update to `?v=20260728` to bust browser cache.

- [ ] **Step 1: Update fetcher.js version in all HTML files**

In each HTML file, find the `<script>` tag referencing `fetcher.js` and change the version to `?v=20260728`.

- [ ] **Step 2: Verify no old fetcher.js references remain**

Run: `Select-String -Path "Z:\novels\novel-website\*.html" -Pattern "fetcher.js" | Select-Object -Property Line`
Expected: All lines show `?v=20260728`

- [ ] **Step 3: Commit**

```bash
git add *.html
git commit -m "chore: bust cache on fetcher.js across all HTML files"
```

---

### Task 5: Deploy and verify

- [ ] **Step 1: Deploy to Vercel**

```powershell
cd "Z:\novels\novel-website"
npx vercel --prod --yes
```

- [ ] **Step 2: Verify data/ directory only has novels.json**

Run: `Get-ChildItem -Recurse "Z:\novels\novel-website\data" -File`
Expected: Only `novels.json`

- [ ] **Step 3: Verify fetcher.js is clean**

Run: `Select-String -Path "Z:\novels\novel-website\js\fetcher.js" -Pattern "local|static|_localNovelIds|chapters.json"`
Expected: No matches

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup — API-only chapter fetching"
```
