# Lumina Script - Anime Overhaul Design Spec

## Overview

Full visual overhaul of the Lumina Script novel reading website with anime-inspired color themes, interactive animations, and engagement features. Sidebar layout preserved. All features optimized for performance.

## 1. Color Themes (6 Anime-Inspired Themes)

Each theme has light + dark variants (12 total). Stored in `localStorage` as `ls_colorTheme`. Applied via CSS custom properties on `:root`.

| Theme | Primary Light | Primary Dark | Vibe |
|-------|--------------|-------------|------|
| **Sakura** | `#ec4899` | `#f472b6` | Cherry blossoms, soft pinks, spring |
| **Ocean** | `#0ea5e9` | `#38bdf8` | Deep sea, calm blues, waves |
| **Sunset** | `#f97316` | `#fb923c` | Warm oranges, golden hour, cozy |
| **Forest** | `#22c55e` | `#4ade80` | Nature, lush greens, mystical |
| **Violet** | `#8b5cf6` | `#a78bfa` | Royal, magical, anime protagonist energy |
| **Neon** | `#06b6d4` | `#22d3ee` | Cyberpunk, electric, futuristic |

**Implementation:**
- Each theme defines a full set of CSS variables (primary, primary-hover, primary-light, surface, surface-alt, etc.)
- Theme classes: `[data-theme="dark"][data-color="sakura"]`, etc.
- A `themes.js` file defines the theme palettes and provides `setTheme(name)` / `getTheme()` functions
- CSS transitions on `:root` for smooth color switching: `transition: background-color 0.3s, color 0.3s`

**Theme Switcher UI:**
- **Desktop sidebar:** Row of 6 colored circles (20px) below the dark mode toggle. Active theme has a ring/border. Hover shows tooltip with theme name.
- **Mobile topbar:** Small color dots row to the right of the title. Collapsible on very small screens.
- **Keyboard accessible:** Tab through themes, Enter/Space to select.

## 2. Animated Book Covers & Hero Cards

**3D Tilt Effect:**
- On `mousemove` over `.book-cover-wrapper`, calculate mouse position relative to element center
- Apply `transform: perspective(800px) rotateY(Xdeg) rotateX(Ydeg)` where X/Y are proportional to mouse offset (max +/-8deg)
- On `mouseleave`, smoothly reset to `transform: perspective(800px) rotateY(0) rotateX(0)`
- Uses `requestAnimationFrame` for smooth 60fps animation

**Idle Floating Animation:**
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
.book-cover-wrapper { animation: float 3s ease-in-out infinite; }
.book-cover-wrapper:hover { animation-play-state: paused; }
```

**Hero Card Parallax:**
- Gradient background shifts based on mouse position: `background-position: ${x}% ${y}%`
- Cover image has a soft glow: `box-shadow: 0 0 30px rgba(primary, 0.3)`

**Page Transitions:**
```css
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-in { animation: fadeSlideUp 0.4s ease-out forwards; }
```
- Staggered delays: `.animate-in:nth-child(1)` 0s, `:nth-child(2)` 0.05s, etc.

## 3. Particle Effects

**Canvas-based particle system:**
- Canvas element positioned `fixed` behind content with `pointer-events: none` and `z-index: 0`
- Max 30 particles, each with: x, y, vx, vy, radius (1-3px), opacity (0.03-0.08), color (primary theme color)

**Light mode:** Soft semi-transparent circles drifting slowly
**Dark mode:** Glowing dots moving upward like fireflies

**Scroll reactivity:**
- Track scroll velocity via `window.scrollY` delta
- Multiply particle velocity by `1 + scrollVelocity * 0.001` (capped at 2x)
- Return to base velocity when idle for 500ms

**Performance:**
- `requestAnimationFrame` loop
- `will-change: transform` on canvas
- `prefers-reduced-motion: reduce` → disable particles entirely
- Pause when tab is not visible (`document.hidden`)

**Implementation file:** `js/particles.js`

## 4. Reading Modes

Added to the reader settings panel (existing `#settings-panel`):

| Mode | Behavior |
|------|----------|
| **Normal** | Current default |
| **Sepia** | Background `#f5e6c8`, text `#5b4636`, adjusted for dark sepia in dark mode |
| **Focus** | Hides `.sidebar`, `.topbar`, `.reader-bottombar`. Shows minimal floating back button + progress. Press Escape to exit. |
| **Typewriter** | Text paragraphs start with `opacity: 0; transform: translateY(10px)`. As user scrolls, paragraphs fade in when entering viewport (IntersectionObserver). |

**Storage:** Reading mode saved in localStorage via existing `Storage.saveReadingSettings()`.

## 5. Reading Streaks & Stats

**Daily Streak:**
- Stored in localStorage: `ls_readingStreak` = `{ count: number, lastDate: string }`
- On each chapter read, check if `lastDate` is today (no-op), yesterday (increment streak), or older (reset to 1)
- Displayed on profile page and homepage hero card with fire emoji: "🔥 5 day streak"

**Reading Calendar Heatmap:**
- GitHub-style grid of colored squares (last 12 weeks = 84 days)
- Colors: `container-low` (no reading), `primary-light` (1-2 chapters), `primary` (3+ chapters), `primary-hover` (5+ chapters)
- Stored in localStorage: `ls_readingCalendar` = `{ "2026-07-27": 3, ... }`
- Displayed on profile page

**Reading Speed:**
- On chapter open, record timestamp. On chapter close/next, calculate elapsed time
- Estimate WPM: `chapterWordCount / (elapsedMinutes)`
- Store rolling average in localStorage
- Display on profile: "Average reading speed: 245 WPM"

**Total Stats:** (Already exists in `Storage.getUserStats()`, enhanced with new fields)

## 6. Achievements & Badges

10 badges stored in localStorage: `ls_achievements` = `['first-steps', 'bookworm', ...]`

| Badge | ID | Requirement | Icon |
|-------|-----|------------|------|
| First Steps | `first-steps` | Read 1 chapter | Footprints SVG |
| Bookworm | `bookworm` | Read 50 chapters | Book SVG |
| Speed Reader | `speed-reader` | Read 200 chapters | Lightning SVG |
| Marathon Runner | `marathon` | Read 500 chapters | Trophy SVG |
| Night Owl | `night-owl` | Read between 12am-5am | Owl SVG |
| Streak Master | `streak-master` | 7-day reading streak | Fire SVG |
| Century Club | `century` | Complete 1 novel | Crown SVG |
| Genre Explorer | `genre-explorer` | Read 3+ different novels | Compass SVG |
| Critic | `critic` | Rate 5 novels | Star SVG |
| Social Butterfly | `social` | Leave 10 comments | Speech bubble SVG |

**Unlock Flow:**
1. After each chapter read / rate / comment, check achievement conditions
2. If new badge unlocked: save to localStorage, show toast notification
3. Toast: slide in from top-right, shows badge icon + name, auto-dismiss after 3 seconds
4. Toast animation: `transform: translateX(100%) → translateX(0)` with spring easing

**Profile Page:** Grid of badge cards. Unlocked badges show full color + name. Locked badges show grayscale + "???" with requirement text.

## 7. Loading Skeletons

Replace "Loading..." text with animated skeleton placeholders:
- Book grid: Gray pulsing rectangles in book-card shape
- Chapter list: Gray pulsing rows
- Reader: Gray lines for paragraphs

```css
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
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `css/styles.css` | Major rewrite — add theme variables, animations, skeletons, particle canvas |
| `css/themes.css` | **NEW** — 6 color theme definitions (light + dark) |
| `js/themes.js` | **NEW** — Theme switcher logic, theme persistence |
| `js/particles.js` | **NEW** — Canvas particle system |
| `js/animations.js` | **NEW** — 3D tilt, floating, page transitions, loading skeletons |
| `js/achievements.js` | **NEW** — Badge definitions, unlock logic, toast notifications |
| `js/streaks.js` | **NEW** — Reading streak, calendar heatmap, speed tracking |
| `js/reading-modes.js` | **NEW** — Sepia, focus, typewriter modes |
| `index.html` | Add particles canvas, theme dots in sidebar |
| `novel.html` | Add theme dots, animated hero |
| `reader.html` | Add reading modes to settings panel |
| `profile.html` | Add achievements grid, heatmap, streak display |
| `nav.js` | Update sidebar with theme dots |
| `novel.js` | Add 3D tilt, parallax hero, loading skeletons |
| `reader.js` | Add reading mode controls, streak tracking |
| `app.js` | Add page transitions, loading skeletons |
| `storage.js` | Add new localStorage keys for themes, achievements, streaks, calendar |

## Performance Constraints

- Particles: max 30, pause when tab hidden, respect `prefers-reduced-motion`
- Animations: use `transform` and `opacity` only (GPU-accelerated, no layout thrash)
- CSS transitions: `will-change` only on actively animating elements
- Skeleton loading: replace with real content as soon as data loads (no artificial delay)
- Bundle: no new external dependencies. All vanilla JS/CSS.
- Total new JS: ~8-10KB minified across all new files
