# Site Audit — wmulvaney.github.io
*Last updated: May 2026*

Issues are grouped by type and roughly ordered by visual/professional impact within each group. Fix the Critical tier first for the biggest bang.

---

## 🔴 Critical — Immediately Visible / Breaks Professionalism

### Color & Theme Inconsistencies
- **ContactForm focus ring is green**, not blue. `ContactForm.css` line 73 uses `rgba(31, 107, 92, 0.08)` — completely off-brand. Should match `--accent: #479dc2`.
- **QualiaNotificationBanner uses a purple gradient** (`#667eea → #764ba2`) that has nothing to do with the site's blue/navy palette. Needs to be recolored or removed.
- **Hardcoded colors everywhere** instead of `var(--accent)`. `PersistentPlayer.css`, `PodcastModal.css`, and several others write `#479DC2` literally — if the brand color ever changes, it breaks in a dozen places.

### Incomplete / Placeholder Sections
- **YouTube Shorts "full view" is not implemented.** `YoutubeShorts.jsx` lines 44–52 render an empty `<div className="shorts-grid">` with a comment `// Full view implementation here...` — a blank section in production.
- **Business.jsx only lists one venture (Qualia/Grooves)** despite the component being named `Business` (implying multiple). Logos exist for Procal and Complete Canine in `/resources/` but they're never surfaced.
- **Luma calendar card is half-empty** below the single event — no "more events" link, no fallback copy, nothing below the fold.

### Naming / Identity Confusion
- `QualiaNotificationBanner.jsx` still says "Qualia" everywhere in its name and internal references, but the product is now called Grooves. Looks like an unfinished rebrand.
- `public/index.html` title is "Willpower Lifestyle" but `App.jsx` sets the page title to "William Mulvaney | Official Site" — inconsistent across tabs and search results.

---

## 🟠 High — Design Coherence & Visual Polish

### Layout & Spacing
- **Warm reddish-brown glow on section cards** — likely a leftover `box-shadow` or `border` somewhere using the old `#171411` warm brown. Needs to be hunted down and replaced with a cool-toned or transparent shadow.
- **Left sidebar "story rail" columns feel like template filler** — no real visual weight or content hierarchy. Needs either meaningful content or a redesigned layout.
- **`border-radius: 0 !important` in Dashboard.css line 18** is a blunt instrument. It strips border-radius from everything globally, including focus rings, which hurts both aesthetics and accessibility. Fix the specificity instead of using `!important`.
- **Hero section has double gradient overlay** — `Dashboard.css` lines 113–114 stack two overlapping gradients on `.hero-card`, making the video behind them murky. Simplify to one gradient.
- **`--header-offset` is defined three times** at different media queries with inconsistent values (`7.75rem`, then reset at 768px, then again at another breakpoint). This creates vertical alignment jank.

### Typography
- **`line-height: 0.94` on `.hero-title`** (Dashboard.css line 189) — below 1.0 causes descenders to clip at larger font sizes. Should be at least `1.0`, ideally `1.05–1.1`.
- **Inconsistent line-heights throughout**: hero lede uses `1.7`, story descriptions use `1.75`, body copy uses mixed values. Pick one scale and stick to it.
- **League Gothic font used in PersistentPlayer and PodcastModal** without being imported in those files — relies on it being imported elsewhere (Header.css, which is itself entirely unused). Very fragile dependency.
- **Episode titles forced uppercase** in both the persistent player and modal (`text-transform: uppercase`) — RSS feed titles aren't written to look good in all-caps. Some will look broken.

### Responsive / Mobile
- **Breakpoints are inconsistent across the codebase**: `640px`, `768px`, `900px`, `1100px` all appear in different files. Should standardize on two or three breakpoints.
- **YouTube Shorts `width: 315px` hardcoded** — doesn't scale on mobile.
- **SubstackFeed preview grid `repeat(4, ...)` on tablet** has no handling for the 768px–1100px range, likely causing horizontal scroll or misaligned cards.
- **PersistentPlayer on mobile** — image positioned with `margin-top: -70px` (a negative margin hack) that can break if the player height changes.

---

## 🟡 Medium — Accessibility & UX

- **Icon-only buttons have no visible label.** Podcast play buttons, Substack "open" button, and player controls all rely solely on `aria-label` — sighted users see no tooltip or text. At minimum, add `title` attributes.
- **Podcast episode cards have no keyboard support** — `onClick` handler with no `onKeyPress`/`onKeyDown`. Keyboard users can't select episodes.
- **`aria-label={link.href}` in PodcastFeed.jsx line 149** — a raw URL as an aria-label is meaningless to screen readers. Should be "Listen on Spotify", "Listen on Apple Podcasts", etc.
- **`dangerouslySetInnerHTML` for podcast episode descriptions** (PodcastModal.jsx line 51) — opens an XSS vector if the RSS feed is ever compromised. Should sanitize with DOMPurify or strip HTML manually.
- **Form placeholder text is the only indicator for some fields** — label exists but placeholder text doing double duty is an anti-pattern. The label should describe, the placeholder should show an example format.
- **ContactForm submit button is near-black (`#171411`)**, not brand blue. Inconsistent with every other CTA on the site.
- **QualiaNotificationBanner dismissal is permanent** — no TTL on the localStorage key. Once dismissed, it's gone forever even if the user clears cookies.

---

## 🟢 Polish — Code Quality & Performance

### Dead Code to Delete
- **`Header.css` (entire file, ~160 lines)** — completely orphaned. The site uses `.hero-header` in `Dashboard.css` instead. Safe to delete.
- **`NewsletterBox.css` lines 8–134** — only the `.newsletter-embed` rule at the bottom is used. The rest (`.newsletter-box`, `.newsletter-content`, `.newsletter-form`, etc.) are dead from an earlier refactor where the BeHiiv iframe replaced the custom form.

### Hardcoded IDs to Document
- **FormSubmit hash** (`8e1ece6d01afba749223e8cba5624874` in ContactForm.jsx) — if this is lost, the contact form silently breaks. Document it somewhere.
- **Luma calendar ID** (`cal-DEbnYgDbsEcgAcQ`) — same issue.
- **YouTube playlist / channel ID** used in LatestVideo and YoutubeShorts fetches.

### Caching / Network
- **`SubstackFeed.jsx` adds `?ts=${Date.now()}` to every fetch**, then also sets `cache: 'no-store'` — double cache-busting on a static JSON file. Remove both; let the browser cache it.
- **PodcastFeed re-fetches the full RSS feed on every mount** with no memoization. Should cache results in state or use `useMemo`.

### Console Noise
- `LatestVideo.jsx` lines 53–55 have `console.error()` and `console.log()` calls left in. Remove before deploying.

### Component Naming
- Rename `QualiaNotificationBanner` → `GroovesNotificationBanner` (file, component name, CSS class) to complete the rebrand.
- `spotify_default.png` → `spotify-logo.png` (the "default" suffix is confusing).

---

## Summary Scoreboard

| Category | Issues Found |
|---|---|
| Colors / theme | 5 |
| Incomplete features / placeholder content | 4 |
| Layout & spacing | 6 |
| Typography | 5 |
| Mobile responsiveness | 5 |
| Accessibility | 6 |
| Dead code to delete | 2 files |
| Hardcoded values to document | 3 |
| Performance / caching | 3 |
| Naming / identity confusion | 3 |

Fixing the 🔴 Critical tier alone will have the biggest visible impact. The 🟠 High tier covers the remaining design coherence issues. Everything in 🟡 and 🟢 is about maintaining and maturing the codebase over time.
