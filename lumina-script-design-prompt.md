# Lumina Script — Design Specification & Build Prompt

> Give this whole document to your AI agent. Section 0 has three distinct visual directions to choose from — pick one (or ask your friends to vote) and tell the agent "build Direction A/B/C" before it starts. Everything after Section 0 is direction-agnostic and applies no matter which one you pick.

---

## 0. Choose a Visual Direction

Each direction is a complete, self-consistent aesthetic system — not just a color swap. Each still supports your 6 accent themes (Violet, Sakura, Ocean, Sunset, Forest, Neon); the accent just gets reinterpreted through that direction's materials. Pick one.

### Direction A — "Midnight Reader"
*The feeling of reading a light novel under the blanket at 1am, phone brightness low, screen glowing.*

- **Color:** Canvas `#0A0B10` (near-black, slightly blue), surface `#14151D`, surface-raised `#1C1E2A`, text-primary `#EDEDF2`, text-muted `#8B8D9B`, accent (theme-driven, e.g. Violet `#8B7FE8`). Accent always appears as a *glow*, never a flat fill — soft box-shadow bloom, not a solid button.
- **Type:** Display face — a tall, slightly condensed serif (e.g. "Fraunces" or "Newsreader") for novel titles and headers, used large and restrained. Body — a warm humanist sans (e.g. "Inter" or "Manrope") for UI chrome. Reader body text uses a dedicated serif reading face (e.g. "Literata") — this is non-negotiable, reading text should never sit in a UI sans-serif.
- **Layout:** Cards float on the dark canvas with soft ambient shadows instead of borders — depth comes from light, not lines.
- **Signature element:** Novel covers have a subtle rim-light matching the current accent theme, as if backlit. The particle canvas (see §4) reads as dust/light motes drifting upward, not confetti.
- **Motion:** Slow, heavy, atmospheric — ease-out curves, longer durations (300–500ms), parallax drift on scroll.

### Direction B — "Paper & Ink"
*The feeling of an actual physical light-novel volume — the paper stock, the obi belt, the printed cover.*

- **Color:** Canvas `#F6F1E7` (warm paper), surface `#FFFFFF`, ink `#231F20`, text-muted `#6B6459`, accent per theme rendered as a printed "obi band" color (e.g. Sakura `#E8879E`). Dark mode flips to `#1A1712` canvas with cream ink — like reading a scanned page at night, not an inverted UI.
- **Type:** Display — a warm literary serif with real character (e.g. "Lora" or "Spectral") at a confident size for titles. Body UI — a clean grotesque (e.g. "Work Sans"). Reader text — the same serif as headers, book-typeset with generous leading, mimicking an actual printed page.
- **Layout:** Novel cards look like little book spines/covers with a colored "obi" strip across the bottom third carrying the tag/genre — a direct reference to Japanese book jacket design. Hairline rules (1px, ink-colored, low opacity) separate sections instead of shadows.
- **Signature element:** Page-turn transition between chapters — content exits/enters like a physical page turning, not a generic fade/slide.
- **Motion:** Tactile and precise — quick snaps (150–200ms) for taps, one deliberate page-turn animation as the hero motion moment.

### Direction C — "Neo-Tokyo Interface"
*The feeling of a stylish anime HUD/game menu — energetic, graphic, confident.*

- **Color:** Canvas `#101014`, surface `#18181F` with diagonal-cut panel edges, accent per theme rendered at full saturation as gradient (e.g. Neon `#00F0FF → #FF2FD8`). High contrast, graphic blocks of color rather than soft blooms.
- **Type:** Display — a geometric, slightly futuristic sans with tight tracking on caps (e.g. "Space Grotesk" or "Archivo Expanded") for UI labels/eyebrows. Titles of novels themselves get a bold serif or display face for contrast (mixing anime-HUD chrome with literary titles is the point). Reader text — a calm, highly legible serif (e.g. "Source Serif 4") so the HUD energy stays out of the actual reading experience.
- **Layout:** Cards and panels have one clipped/angled corner (diagonal cut, 12–16px), thin gradient border-glow on hover. Section headers use small-caps eyebrows with a diagonal divider tick.
- **Signature element:** Hover/active states get a brief scanline or chromatic-aberration flicker (very short, 80–120ms) — like a HUD element powering on.
- **Motion:** Snappy and energetic — quick eases (120–200ms), the 3D tilt effect is more pronounced here than other directions, particles read as data/light particles, not soft dust.

**Agent instruction:** Whichever direction is chosen, derive every color, spacing, and motion decision in the rest of this document from that direction's tokens — don't fall back to generic dark-mode-with-purple-accent defaults.

---

## 1. Design Tokens (fill in per chosen direction)

Ask the agent to produce an actual token file (CSS variables or Tailwind config) before building anything:

```
--color-canvas
--color-surface
--color-surface-raised
--color-text-primary
--color-text-muted
--color-border
--color-accent            (swapped by theme picker)
--color-accent-glow        (rgba version for shadows/blooms)
--font-display
--font-body
--font-reading             (used ONLY inside the Reader page content)
--font-mono                (for Typewriter reading mode)
--radius-sm / md / lg
--shadow-ambient
--space-scale (4/8/12/16/24/32/48/64px)
--motion-fast   (120–150ms)
--motion-base   (200–250ms)
--motion-slow   (350–500ms)
--ease-standard / --ease-out / --ease-spring
```

### The 6 Themes as Accent Swaps
Each theme changes `--color-accent` / `--color-accent-glow` only (plus, in Direction C, the gradient pair). Suggested hex starting points — adjust to taste:

| Theme | Accent | Accent Glow (rgba) |
|---|---|---|
| Violet | `#8B7FE8` | `rgba(139,127,232,0.35)` |
| Sakura | `#E8879E` | `rgba(232,135,158,0.35)` |
| Ocean | `#4FB8D8` | `rgba(79,184,216,0.35)` |
| Sunset | `#E89A5B` | `rgba(232,154,91,0.35)` |
| Forest | `#6EBE8A` | `rgba(110,190,138,0.35)` |
| Neon | `#39F5C8` | `rgba(57,245,200,0.4)` |

Theme dots in the sidebar/topbar should be small filled circles (18–20px) with the theme's actual accent color, a checkmark or ring on the active one, and a soft glow-on-hover using that same color — so users preview the mood before committing.

---

## 2. Global Layout & Responsive System

### Breakpoints
- **Mobile:** < 768px
- **Tablet:** 768–1024px (treat as mobile layout with more breathing room; sidebar still collapsed)
- **Desktop:** > 1024px

### Desktop (> 1024px)
- Persistent left sidebar, 240–280px wide, containing: logo/wordmark, primary nav (Library, Favorites, History, Profile), the 6 theme dots, dark/light toggle, and user avatar/login state pinned to the bottom.
- Main content area max-width ~1200px, centered, with responsive gutters (32–64px).
- Topbar only appears on Reader/Detail pages for contextual controls (search, settings gear) — not a duplicate nav.

### Mobile (< 768px)
- Sidebar becomes a **drawer**: hidden by default, triggered by a hamburger icon in a slim top bar (44–48px tall) that also carries the logo and active theme dot.
- Drawer slides in from the left (250–300ms ease-out) at ~85% viewport width, with a dimmed/blurred scrim behind it that closes the drawer on tap.
- **Bottom navigation bar**, fixed, 56–64px tall, safe-area-aware (respect iOS notch/home-indicator insets): 4–5 icons — Library, Favorites, History, Profile, (Reader items don't live here). Active icon gets the accent color + a small glow/underline; use filled vs outline icon variants for active/inactive.
- Touch targets minimum 44×44px everywhere.
- All 3-column grids collapse to a single column (novel cards) or 2-column for compact grids (achievements, stats) below 480px.

### Grid Behavior
- Novel card grid: 3 columns desktop → 2 columns tablet → 1 column mobile, with consistent gutter (16–24px). Grid should reflow, not just shrink cards to illegible sizes.

---

## 3. Page-by-Page Specification

### 3.1 Library (Homepage)
- **Hero: "Continue Reading" card.** Full-width on desktop (or ~2/3 width with a secondary "Discover" panel beside it), spanning full width on mobile. Shows: novel cover (left, backlit per Direction A / obi-strip per B / diagonal-cut per C), title, chapter name, a slim progress bar (accent-colored fill, rounded ends, subtle animated fill-in on load), and a prominent "Resume Reading →" button. If no reading history exists, this becomes an empty-state inviting the user to pick a novel — never show an empty progress bar.
- **Novel grid:** 3-column responsive grid of cards. Each card: cover art, title, 1–2 tag chips, rating (small stars). On hover (desktop only): 3D tilt following cursor position (max ~8–10° rotation, use `perspective` + `rotateX/Y`, damped with a spring so it doesn't feel jittery), plus a subtle lift (translateY -4px) and shadow/glow bloom growth. On mobile, replace tilt with a gentle scale-down (0.97) on tap for feedback — no tilt on touch devices.
- **Floating cover animation:** Covers idle with a very slow (4–6s loop), small (2–4px) vertical bob, offset per-card so they don't move in sync — feels alive without being distracting. Pause this animation for users who have `prefers-reduced-motion` set.
- **Skeleton loading:** While novel data loads (or during the static-JSON → live-API handoff), render card-shaped skeletons with a shimmer sweep (diagonal light band moving left-to-right, 1.2–1.5s loop) matching the current surface color, not a generic gray.
- **Particle canvas:** A `<canvas>` layer behind/around content that spawns theme-colored particles as the user scrolls (velocity-based spawn rate — scroll faster, more particles). Particles should be sparse and slow at rest, never obscure text, and respect `prefers-reduced-motion` (disable entirely, or reduce to near-zero).

### 3.2 Novel Detail
- **Header block:** Large cover (left on desktop, top-center on mobile), title, author/tags, and the user-actions cluster all visible without scrolling on desktop.
- **User actions:** A segmented control or dropdown for status (Reading / Plan to Read / Completed / Dropped) — each status gets a distinct small color accent (not necessarily the theme accent — e.g. green-ish for Completed, gray for Dropped) so status is scannable at a glance. Favorite = a heart/bookmark icon button with a satisfying fill+pulse micro-animation on toggle. Star rating = 5 tappable/clickable stars, hover-preview fill on desktop, direct tap on mobile, with a brief scale-bounce on selection.
- **Description & tags:** Tags as small pill chips, wrapping naturally, clickable (could filter library — nice-to-have).
- **Chapter list:** Searchable (instant filter-as-you-type, debounced), virtualized if the list is long, each row shows chapter number/title, a small "read" checkmark/dot if completed, and a subtle highlight on the last-read chapter so users can spot where they left off without scrolling to find it.
- **Comments section:** Standard threaded or flat comment list, avatar + username + timestamp + text, with a sticky/persistent comment composer at the bottom on mobile.
- **Reading analytics:** A small stat row/card — session count, total time — styled like a minimal dashboard widget, not a giant chart; this is supporting info, not the page's focus.

### 3.3 Reader (the core experience — get this right)
- **Content column:** max-width ~65–75ch for comfortable reading line length regardless of screen size; generous vertical rhythm; the reading font is whatever was set in Section 0/1 (`--font-reading`), never the UI font.
- **Settings panel:** Desktop — opens via a topbar gear icon as a slide-down or side panel that doesn't cover text. Mobile — tapping anywhere in the reading area (not on a link/button) opens a bottom sheet with the same controls: font family selector (2–4 curated options, shown as live text previews, not just names), font size (stepper, not a raw slider — easier to tap precisely), line-height (3–4 presets: Compact/Comfortable/Relaxed), and the 4 reading-mode toggles.
- **4 Reading Modes:**
  - *Normal:* standard themed background/text per current accent theme.
  - *Sepia:* warm off-white/tan background (`#F4ECD8`-ish) with dark warm-brown text, regardless of the site's dark/light mode — sepia is its own fixed palette, always warm paper-like.
  - *Focus:* all paragraphs dim to ~35–40% opacity except the one currently in the reading viewport-center, which is full opacity — recalculates on scroll (throttle this for performance, don't run on every scroll frame).
  - *Typewriter:* monospace font (`--font-mono`), tighter reading-column width, optionally a subtle static "paper" background texture — evokes an old word processor.
- **Keyboard navigation:** Left/Right arrows = prev/next chapter (or prev/next page if paginated), Up/Down = scroll, and show a brief on-screen hint the first time (dismissible, don't repeat).
- **Scroll progress bar:** Thin (2–3px), fixed to the very top of the viewport, accent-colored fill, updates smoothly (not stepped) as the user scrolls through the chapter.
- **Chapter bookmarking:** A small bookmark icon fixed near the progress bar or in a floating corner button; toggling shows a brief toast ("Bookmarked this chapter").
- **Chapter comments with likes:** Same visual language as novel-detail comments, appended after chapter content; each comment has a like button with an optimistic count bump animation.

### 3.4 Login
- Minimal, centered card (max ~400px wide) on both mobile and desktop — no sidebar/nav clutter on this page. Use the direction's signature texture subtly in the background (e.g. Direction A: soft ambient glow behind the card; Direction B: paper texture; Direction C: angled accent shape in a corner). Include a clear guest/local-only path if the user wants to browse without an account (localStorage fallback).

### 3.5 Profile
- **Header:** Avatar (with a subtle accent ring), username, and maybe a one-line "member since" or favorite-genre tag.
- **Stats grid:** 4 key numbers (novels read, chapters read, favorites, ratings given) as compact stat cards — big number, small label, 2×2 on mobile, 4-across on desktop.
- **Streak counter:** Current streak as a large number with a flame/spark icon, longest streak as a smaller secondary stat beside it.
- **365-day heatmap:** GitHub-style calendar grid, 7 rows × ~52-53 columns, cells colored by intensity using 4–5 steps of the accent color (light → saturated), tooltip on hover/tap showing date + chapters read that day. On mobile, this needs horizontal scroll with the current week/month visible by default (don't shrink cells illegibly) — scroll snap to make navigating months easy.
- **Reading speed (WPM):** A single clean stat, maybe with a small trend indicator (up/down vs. their average) — resist the urge to make this a full chart, it's a supporting metric.
- **Tabbed reading list:** Tabs = All / Reading / Plan to Read / Completed / Dropped, filtering a card or compact-row list of novels below.
- **Ratings:** List of rated novels with the star display (filled/outline stars, not just a number).
- **Achievement badges (10 total):** Grid of badge icons/tiles — locked badges shown as grayscale/outline silhouettes with a lock icon, unlocked ones full-color with the theme accent as a rim/glow. Tapping a locked badge shows its unlock condition (a little mystery/goal to chase). Badges: First Steps, Bookworm, Speed Reader, Marathon Runner, Night Owl, Streak Master, Century Club, Genre Explorer, Critic, Social Butterfly.
- **Unlock toast:** When a badge unlocks, show a toast/banner (top or bottom depending on platform convention) with the badge icon animating in (scale+rotate pop), badge name, and a short celebratory microcopy line ("Achievement unlocked!"). This should also trigger a brief, contained particle burst from the badge icon's position — reuse the particle canvas system from §3.1 rather than building a second particle system.

### 3.6 Favorites
- Same card grid component as the Library (reuse it, don't rebuild), just pre-filtered to favorited novels. Empty state: friendly illustration/icon + "You haven't favorited anything yet" + a CTA back to the Library.

### 3.7 History
- A list (not a grid) — each row: small cover thumbnail, novel title, chapter read, relative timestamp ("2 hours ago", "Yesterday"), tappable straight into the Reader at that point. Group rows by day with a sticky date-label header as the user scrolls (Today / Yesterday / this week's dates).

---

## 4. Cross-Cutting Systems

### Particle Canvas (used in Library, achievement unlocks)
One reusable component: an absolutely-positioned `<canvas>` behind content, low particle count (20–40 at once), theme-colored, spawn/velocity tied to scroll speed on the Library page and to a short celebratory burst on achievement unlock. Must not intercept pointer events (`pointer-events: none`) and must respect `prefers-reduced-motion` by disabling or reducing to a static/minimal state.

### Skeleton Shimmer
One shared skeleton component (card skeleton, row skeleton, text-line skeleton) used everywhere content loads from the static JSON → live API handoff, so loading states feel consistent site-wide rather than page-specific.

### Theme Switching Transition
When a user picks a new accent theme or toggles dark/light, animate the transition (200–300ms cross-fade or a soft radial wipe from the point of the click) rather than an instant, jarring color swap.

### Accessibility Floor (non-negotiable regardless of direction)
- Visible keyboard focus states on every interactive element (not just default browser outline removed with nothing replacing it).
- Color contrast: body text ≥ 4.5:1 against its background in every theme, including Sepia and Typewriter modes.
- `prefers-reduced-motion` disables/minimizes: particle canvas, floating cover bob, 3D tilt, page-turn transitions (fall back to a simple fade).
- All touch targets ≥ 44×44px on mobile.
- Reader font-size range must go large enough for accessibility (up to at least 24px body text).

---

## 5. Bonus Feature Suggestions (not in your original list — add if they fit)

1. **"Jump back in" floating pill on the Reader** — a small, dismissible pill that appears if the user scrolls away mid-chapter and comes back later, showing "You were here" with a one-tap scroll-to-position. Solves the annoying problem of losing your spot.
2. **Theme dot live-preview** — hovering (desktop) or long-pressing (mobile) a theme dot briefly tints the visible UI before committing, so users can "try before they buy" instead of clicking through all 6 blind.
3. **Achievement progress bars** — for badges like Century Club or Marathon Runner, show a thin progress bar under the locked badge ("62/100 chapters") instead of just a lock icon — turns a binary locked state into visible momentum.
4. **Heatmap day-detail popover** — tapping/hovering a heatmap cell on Profile shows exactly which novel(s)/chapters were read that day, not just a count — makes the heatmap actually useful, not just decorative.
5. **Reading session auto-resume prompt** — if a user closes the app mid-chapter and returns within a short window, a subtle one-line banner at the top of the Library offers to resume exactly where they left off, tied into the existing "Continue Reading" hero rather than being a separate feature.

---

## 6. What to Hand the Agent, In Order

1. This document, with your chosen Direction (A/B/C) stated explicitly.
2. Any brand assets you already have (logo, existing novel cover art) so the agent designs around real content, not placeholders.
3. Ask the agent to first produce the token system (Section 1) and a couple of key component mockups (novel card, reader settings panel, one achievement badge) for your sign-off *before* building all 7 pages — cheaper to redirect early than after everything's built.

---

*Questions I didn't ask but you may want to decide before handing this off: (1) Do you want the site to remember each friend's individual theme/mode choice, or is it one shared look for everyone? (2) Should chapter comments be visible to all your friends by default, or private/moderated? (3) Any real cover art yet, or should the agent design placeholder cover treatments per novel?*
