# Anime Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Lumina Script from a static indigo-themed reader into a vibrant anime-inspired reading platform with 6 color themes, interactive animations, particle effects, reading modes, streaks, achievements, and loading skeletons.

**Architecture:** CSS custom properties for theming, vanilla JS modules for features, canvas for particles. All new files are independent modules that communicate via events and shared Storage API. No new dependencies.

**Tech Stack:** Vanilla HTML/CSS/JS, CSS custom properties, Canvas API, IntersectionObserver, localStorage.

---

### Task 1: Theme System Foundation

**Files:**
- Create: `css/themes.css`
- Create: `js/themes.js`
- Modify: `css/styles.css:1-81` (add theme variable overrides)
- Modify: `index.html:85-90` (add theme scripts)
- Modify: `novel.html:68-73` (add theme scripts)
- Modify: `reader.html:106-110` (add theme scripts)
- Modify: `login.html:294-296` (add theme scripts)
- Modify: `profile.html:273-276` (add theme scripts)
- Modify: `favorites.html:51-54` (add theme scripts)
- Modify: `history.html:95-98` (add theme scripts)

- [ ] **Step 1: Create themes.css with 6 color theme definitions**

```css
/* css/themes.css - Anime Color Themes */

/* Sakura (Pink) */
[data-color="sakura"] {
  --primary: #ec4899;
  --primary-hover: #db2777;
  --primary-light: #fce7f3;
  --primary-glow: rgba(236, 72, 153, 0.3);
}
[data-theme="dark"][data-color="sakura"] {
  --primary: #f472b6;
  --primary-hover: #f9a8d4;
  --primary-light: rgba(244, 114, 182, 0.15);
  --primary-glow: rgba(244, 114, 182, 0.3);
}

/* Ocean (Blue) */
[data-color="ocean"] {
  --primary: #0ea5e9;
  --primary-hover: #0284c7;
  --primary-light: #e0f2fe;
  --primary-glow: rgba(14, 165, 233, 0.3);
}
[data-theme="dark"][data-color="ocean"] {
  --primary: #38bdf8;
  --primary-hover: #7dd3fc;
  --primary-light: rgba(56, 189, 248, 0.15);
  --primary-glow: rgba(56, 189, 248, 0.3);
}

/* Sunset (Orange) */
[data-color="sunset"] {
  --primary: #f97316;
  --primary-hover: #ea580c;
  --primary-light: #fff7ed;
  --primary-glow: rgba(249, 115, 22, 0.3);
}
[data-theme="dark"][data-color="sunset"] {
  --primary: #fb923c;
  --primary-hover: #fdba74;
  --primary-light: rgba(251, 146, 60, 0.15);
  --primary-glow: rgba(251, 146, 60, 0.3);
}

/* Forest (Green) */
[data-color="forest"] {
  --primary: #22c55e;
  --primary-hover: #16a34a;
  --primary-light: #f0fdf4;
  --primary-glow: rgba(34, 197, 94, 0.3);
}
[data-theme="dark"][data-color="forest"] {
  --primary: #4ade80;
  --primary-hover: #86efac;
  --primary-light: rgba(74, 222, 128, 0.15);
  --primary-glow: rgba(74, 222, 128, 0.3);
}

/* Violet (Purple) */
[data-color="violet"] {
  --primary: #8b5cf6;
  --primary-hover: #7c3aed;
  --primary-light: #f5f3ff;
  --primary-glow: rgba(139, 92, 246, 0.3);
}
[data-theme="dark"][data-color="violet"] {
  --primary: #a78bfa;
  --primary-hover: #c4b5fd;
  --primary-light: rgba(167, 139, 250, 0.15);
  --primary-glow: rgba(167, 139, 250, 0.3);
}

/* Neon (Cyan) */
[data-color="neon"] {
  --primary: #06b6d4;
  --primary-hover: #0891b2;
  --primary-light: #ecfeff;
  --primary-glow: rgba(6, 182, 212, 0.3);
}
[data-theme="dark"][data-color="neon"] {
  --primary: #22d3ee;
  --primary-hover: #67e8f9;
  --primary-light: rgba(34, 211, 238, 0.15);
  --primary-glow: rgba(34, 211, 238, 0.3);
}
```

- [ ] **Step 2: Create themes.js with theme management logic**

```js
// js/themes.js - Theme switcher logic

const ThemeManager = {
  _current: 'violet',
  _dark: false,

  THEMES: [
    { id: 'violet', name: 'Violet', emoji: '\u2728' },
    { id: 'sakura', name: 'Sakura', emoji: '\uD83C\uDF38' },
    { id: 'ocean', name: 'Ocean', emoji: '\uD83C\uDF0A' },
    { id: 'sunset', name: 'Sunset', emoji: '\uD83C\uDF05' },
    { id: 'forest', name: 'Forest', emoji: '\uD83C\uDF32' },
    { id: 'neon', name: 'Neon', emoji: '\u26A1' },
  ],

  init() {
    this._current = localStorage.getItem('ls_colorTheme') || 'violet';
    this._dark = localStorage.getItem('ls_theme') === 'dark';
    this._apply();
    this._renderDots();
  },

  setTheme(id) {
    this._current = id;
    localStorage.setItem('ls_colorTheme', id);
    this._apply();
    this._renderDots();
    document.dispatchEvent(new CustomEvent('themechange', { detail: { color: id } }));
  },

  toggleDark() {
    this._dark = !this._dark;
    localStorage.setItem('ls_theme', this._dark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', this._dark ? 'dark' : 'light');
    this._renderDots();
  },

  getTheme() { return this._current; },
  isDark() { return this._dark; },

  _apply() {
    document.documentElement.setAttribute('data-color', this._current);
    document.documentElement.setAttribute('data-theme', this._dark ? 'dark' : 'light');
  },

  _renderDots() {
    const containers = document.querySelectorAll('.theme-dots');
    containers.forEach(container => {
      container.innerHTML = this.THEMES.map(t => `
        <button class="theme-dot ${t.id === this._current ? 'active' : ''}"
                data-theme-id="${t.id}"
                title="${t.name}"
                style="--dot-color: var(--${t.id === this._current ? 'primary' : 'outline'})"
                aria-label="${t.name} theme">
        </button>
      `).join('');
      container.querySelectorAll('.theme-dot').forEach(dot => {
        dot.addEventListener('click', () => this.setTheme(dot.dataset.themeId));
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
```

- [ ] **Step 3: Add theme CSS variables to styles.css :root for default violet theme**

Replace the existing `:root` color block in `styles.css` (lines 9-24) with:

```css
:root {
  /* Default Violet Theme - overridden by themes.css */
  --primary: #8b5cf6;
  --primary-hover: #7c3aed;
  --primary-light: #f5f3ff;
  --primary-glow: rgba(139, 92, 246, 0.3);
  --surface: #f8f9ff;
  --surface-alt: #ffffff;
  --on-surface: #0f172a;
  --on-surface-secondary: #475569;
  --outline: #e2e8f0;
  --outline-hover: #cbd5e1;
  --container-low: #eff4ff;
  --error: #ef4444;
  --error-light: #fef2f2;
  --success: #22c55e;
  /* ... rest of vars unchanged ... */
}
```

- [ ] **Step 4: Add theme-dots CSS to styles.css**

```css
/* Theme Color Dots */
.theme-dots {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  flex-wrap: wrap;
}

.theme-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--outline);
  background: var(--dot-color, var(--outline));
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.theme-dot:hover {
  transform: scale(1.2);
  border-color: var(--primary);
}

.theme-dot.active {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-glow);
}

.theme-dot.active::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: var(--primary);
}
```

- [ ] **Step 5: Add theme scripts to all HTML files**

In each HTML file, add before the closing `</body>` tag (after the existing Supabase scripts):

```html
  <link rel="stylesheet" href="css/themes.css?v=20260727">
  <script src="js/themes.js?v=20260727"></script>
```

- [ ] **Step 6: Add theme-dots div to sidebar in index.html, novel.html, profile.html, favorites.html, history.html**

After the theme-toggle button in each sidebar, add:

```html
      <div class="theme-dots"></div>
```

- [ ] **Step 7: Add theme-dots to topbar in all pages**

In the topbar div, add:

```html
      <div class="theme-dots" style="display:none;"></div>
```

(Will be shown/hidden via CSS media query)

- [ ] **Step 8: Add responsive CSS to show dots in topbar on mobile**

```css
@media (max-width: 768px) {
  .topbar .theme-dots { display: flex !important; }
  .sidebar .theme-dots { display: none; }
}
```

- [ ] **Step 9: Test theme switching works**

- [ ] **Step 10: Commit**

```bash
git add css/themes.css js/themes.js css/styles.css index.html novel.html reader.html login.html profile.html favorites.html history.html
git commit -m "feat: add 6 anime color themes with sidebar/topbar switcher"
```

---

### Task 2: Page Transitions & Loading Skeletons

**Files:**
- Create: `js/animations.js`
- Modify: `css/styles.css` (add skeleton + animation classes)
- Modify: `app.js` (add skeleton loading)
- Modify: `novel.js` (add skeleton loading)

- [ ] **Step 1: Add animation keyframes and skeleton CSS to styles.css**

```css
/* Page Transitions */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-in {
  animation: fadeSlideUp 0.4s ease-out forwards;
  opacity: 0;
}

.stagger-1 { animation-delay: 0.05s; }
.stagger-2 { animation-delay: 0.1s; }
.stagger-3 { animation-delay: 0.15s; }
.stagger-4 { animation-delay: 0.2s; }
.stagger-5 { animation-delay: 0.25s; }

/* Loading Skeletons */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(90deg, var(--container-low) 25%, var(--outline) 50%, var(--container-low) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius);
}

.skeleton-book {
  aspect-ratio: 3/4;
  border-radius: var(--radius-lg);
}

.skeleton-text {
  height: 1rem;
  margin-bottom: 0.5rem;
}

.skeleton-text.short { width: 60%; }
.skeleton-text.medium { width: 80%; }

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .animate-in { animation: none; opacity: 1; }
  .skeleton { animation: none; }
}
```

- [ ] **Step 2: Create animations.js**

```js
// js/animations.js - Page transitions and loading utilities

const Animations = {
  init() {
    this.animatePageLoad();
  },

  animatePageLoad() {
    const elements = document.querySelectorAll('.main-content > *');
    elements.forEach((el, i) => {
      el.classList.add('animate-in');
      el.classList.add(`stagger-${Math.min(i + 1, 5)}`);
    });
  },

  showBookGridSkeleton(container, count = 6) {
    container.innerHTML = Array(count).fill('').map(() => `
      <div class="book-card">
        <div class="book-cover-wrapper">
          <div class="skeleton skeleton-book"></div>
        </div>
        <div class="skeleton skeleton-text medium"></div>
        <div class="skeleton skeleton-text short"></div>
      </div>
    `).join('');
  },

  showChapterListSkeleton(container, count = 8) {
    container.innerHTML = Array(count).fill('').map(() => `
      <div class="chapter-item" style="pointer-events:none;">
        <span class="skeleton" style="width:30px;height:30px;border-radius:50%;"></span>
        <span class="skeleton skeleton-text medium" style="flex:1;"></span>
      </div>
    `).join('');
  },

  removeSkeletons() {
    document.querySelectorAll('.skeleton').forEach(el => {
      el.closest('.book-card, .chapter-item')?.remove();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Animations.init());
```

- [ ] **Step 3: Add animations.js to index.html and novel.html**

```html
  <script src="js/animations.js?v=20260727"></script>
```

- [ ] **Step 4: Update app.js to show skeleton before loading novels**

In `app.js`, before the `loadNovels()` call, add:

```js
Animations.showBookGridSkeleton(document.getElementById('novel-grid'));
```

- [ ] **Step 5: Update novel.js to show skeleton before loading chapters**

In `novel.js`, before `loadChapters()` call, add:

```js
Animations.showChapterListSkeleton(document.getElementById('chapter-list'));
```

- [ ] **Step 6: Test skeleton loading appears then replaced by real content**

- [ ] **Step 7: Commit**

```bash
git add js/animations.js css/styles.css app.js novel.js index.html novel.html
git commit -m "feat: add page transitions and loading skeleton animations"
```

---

### Task 3: 3D Tilt & Floating Book Covers

**Files:**
- Modify: `js/animations.js` (add tilt + float logic)
- Modify: `css/styles.css` (add float animation)

- [ ] **Step 1: Add floating animation CSS**

```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.book-cover-wrapper {
  animation: float 3s ease-in-out infinite;
}

.book-cover-wrapper:hover {
  animation-play-state: paused;
}
```

- [ ] **Step 2: Add 3D tilt to animations.js**

Append to `Animations` object:

```js
  initTilt() {
    document.querySelectorAll('.book-cover-wrapper').forEach(wrapper => {
      wrapper.addEventListener('mousemove', (e) => {
        const rect = wrapper.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        const rotateX = -y * 12;
        const rotateY = x * 12;
        wrapper.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
      });
      wrapper.addEventListener('mouseleave', () => {
        wrapper.style.transform = '';
      });
    });
  }
```

Call `this.initTilt()` in `init()` and after any dynamic content load (skeleton removal).

- [ ] **Step 3: Test tilt effect works on book covers**

- [ ] **Step 4: Commit**

```bash
git add js/animations.js css/styles.css
git commit -m "feat: add 3D tilt effect and floating animation to book covers"
```

---

### Task 4: Particle Effects

**Files:**
- Create: `js/particles.js`
- Modify: `index.html`, `novel.html` (add canvas)

- [ ] **Step 1: Create particles.js**

```js
// js/particles.js - Canvas particle system

const Particles = {
  canvas: null,
  ctx: null,
  particles: [],
  maxParticles: 30,
  animFrame: null,
  scrollVelocity: 0,
  lastScrollY: 0,

  init() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'particles-canvas';
    this.canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0.6;';
    document.body.prepend(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('scroll', () => this.onScroll());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(this.animFrame);
      else this.animate();
    });
    for (let i = 0; i < this.maxParticles; i++) this.spawn();
    this.animate();
  },

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  spawn() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    this.particles.push({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: isDark ? -(Math.random() * 0.5 + 0.1) : (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2 + 1,
      opacity: Math.random() * 0.05 + 0.02,
      color: isDark ? '255,255,255' : this.getPrimaryRGB()
    });
  },

  getPrimaryRGB() {
    const style = getComputedStyle(document.documentElement);
    const hex = style.getPropertyValue('--primary').trim();
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  },

  onScroll() {
    const dy = window.scrollY - this.lastScrollY;
    this.lastScrollY = window.scrollY;
    this.scrollVelocity = Math.min(Math.abs(dy) * 0.01, 1);
    clearTimeout(this._scrollTimer);
    this._scrollTimer = setTimeout(() => { this.scrollVelocity = 0; }, 500);
  },

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const speedMult = 1 + this.scrollVelocity;
    this.particles.forEach(p => {
      p.x += p.vx * speedMult;
      p.y += p.vy * speedMult;
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
      this.ctx.fill();
    });
    this.animFrame = requestAnimationFrame(() => this.animate());
  }
};

document.addEventListener('DOMContentLoaded', () => Particles.init());
```

- [ ] **Step 2: Add particles.js to index.html and novel.html**

```html
  <script src="js/particles.js?v=20260727"></script>
```

- [ ] **Step 3: Test particles appear on homepage and novel page**

- [ ] **Step 4: Commit**

```bash
git add js/particles.js index.html novel.html
git commit -m "feat: add canvas particle effects with scroll reactivity"
```

---

### Task 5: Reading Modes

**Files:**
- Create: `js/reading-modes.js`
- Modify: `reader.html` (add mode selector to settings panel)
- Modify: `css/styles.css` (add reading mode styles)

- [ ] **Step 1: Add reading mode CSS**

```css
/* Reading Modes */
[data-reading-mode="sepia"] {
  --surface: #f5e6c8;
  --surface-alt: #faf0db;
  --on-surface: #5b4636;
  --on-surface-secondary: #7a6652;
  --outline: #d4c4a8;
}

[data-reading-mode="focus"] .sidebar,
[data-reading-mode="focus"] .topbar,
[data-reading-mode="focus"] .reader-bottombar,
[data-reading-mode="focus"] .chapter-comments {
  display: none !important;
}

[data-reading-mode="focus"] .reading-area {
  max-width: 700px;
  margin: 0 auto;
  padding: 2rem;
}

[data-reading-mode="typewriter"] .chapter-content p {
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}

[data-reading-mode="typewriter"] .chapter-content p.visible {
  opacity: 1;
  transform: translateY(0);
}
```

- [ ] **Step 2: Create reading-modes.js**

```js
// js/reading-modes.js - Sepia, Focus, Typewriter modes

const ReadingModes = {
  current: 'normal',
  observer: null,

  init() {
    this.current = localStorage.getItem('ls_readingMode') || 'normal';
    this.apply();
    this.bindSettings();
    if (this.current === 'typewriter') this.initTypewriter();
  },

  set(mode) {
    this.current = mode;
    localStorage.setItem('ls_readingMode', mode);
    this.apply();
    if (mode === 'typewriter') this.initTypewriter();
    else this.destroyTypewriter();
  },

  apply() {
    document.documentElement.setAttribute('data-reading-mode', this.current);
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === this.current);
    });
  },

  bindSettings() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => this.set(btn.dataset.mode));
    });
  },

  initTypewriter() {
    this.destroyTypewriter();
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.chapter-content p').forEach(p => {
      this.observer.observe(p);
    });
  },

  destroyTypewriter() {
    if (this.observer) { this.observer.disconnect(); this.observer = null; }
    document.querySelectorAll('.chapter-content p').forEach(p => p.classList.add('visible'));
  }
};

document.addEventListener('DOMContentLoaded', () => ReadingModes.init());
```

- [ ] **Step 3: Add mode buttons to reader.html settings panel**

Inside `.settings-body`, add after the theme toggle:

```html
        <div class="setting-group">
          <label>Reading Mode</label>
          <div class="mode-buttons">
            <button class="mode-btn active" data-mode="normal">Normal</button>
            <button class="mode-btn" data-mode="sepia">Sepia</button>
            <button class="mode-btn" data-mode="focus">Focus</button>
            <button class="mode-btn" data-mode="typewriter">Typewriter</button>
          </div>
        </div>
```

- [ ] **Step 4: Add mode-buttons CSS**

```css
.mode-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.mode-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--outline);
  border-radius: var(--radius);
  background: var(--surface-alt);
  color: var(--on-surface-secondary);
  font-family: var(--font-ui);
  font-size: var(--font-label-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mode-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.mode-btn:hover:not(.active) {
  border-color: var(--primary);
  color: var(--primary);
}
```

- [ ] **Step 5: Add reading-modes.js to reader.html**

```html
  <script src="js/reading-modes.js?v=20260727"></script>
```

- [ ] **Step 6: Test all 4 reading modes work**

- [ ] **Step 7: Commit**

```bash
git add js/reading-modes.js reader.html css/styles.css
git commit -m "feat: add sepia, focus, and typewriter reading modes"
```

---

### Task 6: Reading Streaks, Calendar Heatmap & Speed

**Files:**
- Create: `js/streaks.js`
- Modify: `reader.js` (track reading time)
- Modify: `profile.html` (display streak + heatmap)
- Modify: `css/styles.css` (heatmap styles)

- [ ] **Step 1: Add heatmap CSS**

```css
/* Reading Calendar Heatmap */
.heatmap {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 3px;
  margin: 1rem 0;
}

.heatmap-cell {
  aspect-ratio: 1;
  border-radius: 2px;
  background: var(--container-low);
  transition: background var(--transition-fast);
}

.heatmap-cell.level-1 { background: var(--primary-light); }
.heatmap-cell.level-2 { background: var(--primary); opacity: 0.5; }
.heatmap-cell.level-3 { background: var(--primary); }
.heatmap-cell.level-4 { background: var(--primary-hover); }

.heatmap-cell:hover {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}

.streak-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--primary);
  margin: 1rem 0;
}
```

- [ ] **Step 2: Create streaks.js**

```js
// js/streaks.js - Reading streaks, calendar heatmap, speed tracking

const Streaks = {
  init() {
    this.updateStreak();
  },

  updateStreak() {
    const data = JSON.parse(localStorage.getItem('ls_readingStreak') || '{"count":0,"lastDate":""}');
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (data.lastDate === today) return;
    if (data.lastDate === yesterday) {
      data.count++;
    } else if (data.lastDate !== today) {
      data.count = 1;
    }
    data.lastDate = today;
    localStorage.setItem('ls_readingStreak', JSON.stringify(data));
  },

  recordReading() {
    const today = new Date().toISOString().split('T')[0];
    const cal = JSON.parse(localStorage.getItem('ls_readingCalendar') || '{}');
    cal[today] = (cal[today] || 0) + 1;
    localStorage.setItem('ls_readingCalendar', JSON.stringify(cal));
  },

  recordSpeed(chapterId, wordCount, elapsedMs) {
    const wpm = Math.round(wordCount / (elapsedMs / 60000));
    const speeds = JSON.parse(localStorage.getItem('ls_readingSpeeds') || '[]');
    speeds.push(wpm);
    if (speeds.length > 50) speeds.shift();
    localStorage.setItem('ls_readingSpeeds', JSON.stringify(speeds));
  },

  getStreak() {
    return JSON.parse(localStorage.getItem('ls_readingStreak') || '{"count":0,"lastDate":""}');
  },

  getAverageSpeed() {
    const speeds = JSON.parse(localStorage.getItem('ls_readingSpeeds') || '[]');
    if (speeds.length === 0) return 0;
    return Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length);
  },

  renderHeatmap(container) {
    const cal = JSON.parse(localStorage.getItem('ls_readingCalendar') || '{}');
    const cells = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const count = cal[d] || 0;
      const level = count === 0 ? '' : count <= 1 ? 'level-1' : count <= 2 ? 'level-2' : count <= 4 ? 'level-3' : 'level-4';
      cells.push(`<div class="heatmap-cell ${level}" title="${d}: ${count} chapters"></div>`);
    }
    container.innerHTML = cells.join('');
  },

  renderStreak(container) {
    const streak = this.getStreak();
    const speed = this.getAverageSpeed();
    container.innerHTML = `
      <div class="streak-display">
        <span>${streak.count > 0 ? '\uD83D\uDD25' : '\u2728'}</span>
        <span>${streak.count} day streak</span>
      </div>
      ${speed > 0 ? `<div style="color:var(--on-surface-secondary);font-size:var(--font-label-md);">Average reading speed: ${speed} WPM</div>` : ''}
    `;
  }
};
```

- [ ] **Step 3: Update reader.js to track reading time and call Streaks**

In `reader.js` `init()`, add after chapter load:

```js
    Streaks.recordReading();
    window._chapterStartTime = Date.now();
    window._chapterWordCount = chapter.content.split(/\s+/).length;
```

In `loadChapter()` before `saveReadingProgress`, add:

```js
    if (window._chapterStartTime) {
      Streaks.recordSpeed(currentChapterId, window._chapterWordCount, Date.now() - window._chapterStartTime);
    }
    window._chapterStartTime = Date.now();
    window._chapterWordCount = chapter.content.split(/\s+/).length;
```

- [ ] **Step 4: Add streak/heatmap sections to profile.html**

Inside `renderProfile()`, add after the stats grid:

```html
        <div class="profile-section">
          <h2 class="profile-section-title">Reading Streak</h2>
          <div id="streak-display"></div>
        </div>
        <div class="profile-section">
          <h2 class="profile-section-title">Reading Activity</h2>
          <div id="heatmap" class="heatmap"></div>
        </div>
```

After `renderProfile()` completes, add:

```js
      Streaks.renderStreak(document.getElementById('streak-display'));
      Streaks.renderHeatmap(document.getElementById('heatmap'));
```

- [ ] **Step 5: Add streaks.js to reader.html and profile.html**

```html
  <script src="js/streaks.js?v=20260727"></script>
```

- [ ] **Step 6: Test streak tracking, heatmap display, and speed calculation**

- [ ] **Step 7: Commit**

```bash
git add js/streaks.js reader.js profile.html css/styles.css reader.html
git commit -m "feat: add reading streaks, calendar heatmap, and speed tracking"
```

---

### Task 7: Achievement Badges

**Files:**
- Create: `js/achievements.js`
- Modify: `css/styles.css` (badge styles)
- Modify: `profile.html` (badge grid)
- Modify: `novel.js`, `reader.js`, `app.js` (trigger achievement checks)

- [ ] **Step 1: Add badge CSS**

```css
/* Achievements */
.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.badge-card {
  text-align: center;
  padding: 1.25rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--outline);
  background: var(--surface-alt);
  transition: all var(--transition-fast);
}

.badge-card.locked {
  opacity: 0.4;
  filter: grayscale(1);
}

.badge-card.unlocked {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary-glow);
}

.badge-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.badge-name {
  font-size: var(--font-label-md);
  font-weight: 600;
  color: var(--on-surface);
}

.badge-req {
  font-size: 0.75rem;
  color: var(--on-surface-secondary);
  margin-top: 0.25rem;
}

/* Achievement Toast */
.achievement-toast {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 1rem 1.5rem;
  background: var(--primary);
  color: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  animation: slideInToast 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes slideInToast {
  from { transform: translateX(120%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.achievement-toast .toast-icon { font-size: 1.5rem; margin-right: 0.75rem; }
.achievement-toast .toast-text { font-weight: 600; }
```

- [ ] **Step 2: Create achievements.js**

```js
// js/achievements.js - Badge definitions and unlock logic

const Achievements = {
  BADGES: [
    { id: 'first-steps', name: 'First Steps', icon: '\uD83D\uDC63', req: 'Read your first chapter', check: () => Streaks.getStreak().count >= 1 },
    { id: 'bookworm', name: 'Bookworm', icon: '\uD83D\uDCD6', req: 'Read 50 chapters', check: () => JSON.parse(localStorage.getItem('ls_readingCalendar') || '{}').values ? Object.values(JSON.parse(localStorage.getItem('ls_readingCalendar') || '{}')).reduce((a,b) => a+b, 0) >= 50 : false },
    { id: 'speed-reader', name: 'Speed Reader', icon: '\u26A1', req: 'Read 200 chapters', check: () => Object.values(JSON.parse(localStorage.getItem('ls_readingCalendar') || '{}')).reduce((a,b) => a+b, 0) >= 200 },
    { id: 'marathon', name: 'Marathon Runner', icon: '\uD83C\uDFC6', req: 'Read 500 chapters', check: () => Object.values(JSON.parse(localStorage.getItem('ls_readingCalendar') || '{}')).reduce((a,b) => a+b, 0) >= 500 },
    { id: 'night-owl', name: 'Night Owl', icon: '\uD83E\uDD89', req: 'Read between 12am-5am', check: () => new Date().getHours() >= 0 && new Date().getHours() < 5 },
    { id: 'streak-master', name: 'Streak Master', icon: '\uD83D\uDD25', req: '7-day reading streak', check: () => Streaks.getStreak().count >= 7 },
    { id: 'century', name: 'Century Club', icon: '\uD83D\uDC51', req: 'Complete 1 novel', check: () => { const p = JSON.parse(localStorage.getItem('ls_readingProgress') || '{}'); return Object.values(p).some(v => v.chaptersRead && v.chaptersRead.length > 0); } },
    { id: 'genre-explorer', name: 'Genre Explorer', icon: '\uD83E\uDDED', req: 'Read 3+ different novels', check: () => { const p = JSON.parse(localStorage.getItem('ls_readingProgress') || '{}'); return Object.keys(p).filter(k => p[k].chaptersRead && p[k].chaptersRead.length > 0).length >= 3; } },
    { id: 'critic', name: 'Critic', icon: '\u2B50', req: 'Rate 5 novels', check: () => Object.keys(JSON.parse(localStorage.getItem('ls_ratings') || '{}')).filter(k => JSON.parse(localStorage.getItem('ls_ratings'))[k] > 0).length >= 5 },
    { id: 'social', name: 'Social Butterfly', icon: '\uD83D\uDCAC', req: 'Leave 10 comments', check: () => { let count = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('ls_comments_')) count += (JSON.parse(localStorage.getItem(k)) || []).length; } return count >= 10; } },
  ],

  getUnlocked() {
    return JSON.parse(localStorage.getItem('ls_achievements') || '[]');
  },

  unlock(id) {
    const unlocked = this.getUnlocked();
    if (unlocked.includes(id)) return false;
    unlocked.push(id);
    localStorage.setItem('ls_achievements', JSON.stringify(unlocked));
    const badge = this.BADGES.find(b => b.id === id);
    if (badge) this.showToast(badge);
    return true;
  },

  checkAll() {
    this.BADGES.forEach(b => {
      try { if (b.check()) this.unlock(b.id); } catch(e) {}
    });
  },

  showToast(badge) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `<span class="toast-icon">${badge.icon}</span><span class="toast-text">Achievement Unlocked: ${badge.name}!</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(120%)'; toast.style.transition = 'all 0.3s ease'; }, 3000);
    setTimeout(() => toast.remove(), 3500);
  }
};

document.addEventListener('DOMContentLoaded', () => Achievements.checkAll());
```

- [ ] **Step 3: Add badge grid to profile.html**

In `renderProfile()`, add after the heatmap section:

```html
        <div class="profile-section">
          <h2 class="profile-section-title">Achievements</h2>
          <div class="badges-grid">
            ${Achievements.BADGES.map(b => {
              const unlocked = Achievements.getUnlocked().includes(b.id);
              return `
                <div class="badge-card ${unlocked ? 'unlocked' : 'locked'}">
                  <div class="badge-icon">${unlocked ? b.icon : '\u2753'}</div>
                  <div class="badge-name">${unlocked ? b.name : '???'}</div>
                  <div class="badge-req">${b.req}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
```

- [ ] **Step 4: Add achievement checks to reader.js and novel.js**

In `reader.js` `loadChapter()`, after `Streaks.recordReading()`:

```js
    Achievements.checkAll();
```

In `novel.js` `renderUserActions()` after rating submission:

```js
      Achievements.checkAll();
```

- [ ] **Step 5: Add achievements.js to all HTML files**

```html
  <script src="js/achievements.js?v=20260727"></script>
```

- [ ] **Step 6: Test badge unlock and toast notification**

- [ ] **Step 7: Commit**

```bash
git add js/achievements.js css/styles.css profile.html reader.html novel.js
git commit -m "feat: add 10 achievement badges with toast notifications"
```

---

### Task 8: Final Integration & Deploy

**Files:**
- All HTML files (ensure all new scripts are included)
- `css/styles.css` (add theme transition)

- [ ] **Step 1: Add smooth theme transition to styles.css**

```css
:root {
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

- [ ] **Step 2: Verify all scripts load in correct order across all pages**

Script load order should be:
1. `supabase.min.js`
2. `config.js`
3. `storage.js`
4. `themes.js` + `themes.css`
5. `fetcher.js` / `nav.js` / page-specific JS
6. `animations.js`
7. `particles.js` (index + novel only)
8. `reading-modes.js` (reader only)
9. `streaks.js` (reader + profile only)
10. `achievements.js`

- [ ] **Step 3: Test all pages work correctly**

- [ ] **Step 4: Deploy to Vercel**

```bash
cd "Z:\novels\novel-website"
vercel --yes --prod
```

- [ ] **Step 5: Push to GitHub**

```bash
git add .
git commit -m "feat: complete anime overhaul - themes, animations, particles, achievements"
git push origin master
```

- [ ] **Step 6: Clean up old deployments**

```bash
vercel ls
vercel rm <old-deployment-url> --yes
```

- [ ] **Step 7: Verify live site works**

Test at `https://luminascript.vercel.app`:
- Theme switching works
- Book covers tilt on hover
- Particles visible
- Reading modes work in reader
- Streaks and heatmap show on profile
- Badges unlock correctly
