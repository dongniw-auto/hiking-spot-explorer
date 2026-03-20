---
name: stardust
description: >
  Stardust parks & spots explorer app. Use when working on the Stardust React app,
  modifying code, fixing bugs, adding features, or deploying changes. Auto-loads
  when editing any file in this project.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(npm *), Bash(git *)
---

# Stardust Dev Skill

## Project Overview
**Stardust** is a React + Vite single-page app for exploring parks, trails, cafes, and hidden gems in the Bay Area. Deployed to GitHub Pages.

- **GitHub repo:** `dongniw-auto/stardust`
- **Live site:** https://dongniw-auto.github.io/stardust/
- **Firebase project:** `stardust-8ee28` (GCP)

## Tech Stack
- React 19 + Vite 8 (no router — tab-based navigation)
- Leaflet for maps
- Firebase Auth (Google sign-in) + Firestore
- Google Calendar REST API (via OAuth token)
- Deployed from `docs/` folder on `main` branch

## File Structure

```
src/
├── main.jsx              # Entry point, mounts <App />
├── App.jsx               # Root component — state, filtering, tab switching (explore/plans)
├── App.css               # Layout: header, grid, tab bar
├── index.css             # CSS variables, reset, typography (warm terra-cotta palette)
├── firebase.js           # Firebase config & initialization
├── data/
│   └── spots.js          # SAMPLE_SPOTS array + PACK_LIST_TEMPLATES
├── hooks/
│   ├── useAuth.js        # Firebase Google auth, access token management
│   ├── useFirestore.js   # Starred, plans, family groups CRUD
│   ├── useGoogleCalendar.js  # Google Calendar read/write via REST
│   └── useSpots.js       # Seeds Firestore from static data, localStorage fallback
└── components/
    ├── SearchBar.jsx/css     # Search input + chip-based filters (single scrollable row)
    ├── SpotList.jsx/css      # Spot cards (image, name, compact stats, inline plan button)
    ├── MapView.jsx/css       # Leaflet map with custom SVG markers
    ├── VisitPlanner.jsx/css  # Modal: time breakdown, pack list, companion toggles
    ├── SavedPlans.jsx/css    # Plans tab: calendar + list views
    ├── PlanCalendar.jsx/css  # Calendar with Google Calendar sync; week view on desktop, day strip + Day/Week toggle on mobile (≤ 767px)
    ├── AuthButton.jsx/css    # Sign in/out button + avatar
    └── FamilyGroup.jsx/css   # Create/join family groups with invite codes

docs/                     # Vite build output (deployed to GitHub Pages)
├── index.html            # References /stardust/assets/index.js and index.css
└── assets/
    ├── index.js          # Bundled app (stable filename, no hash)
    └── index.css         # Bundled styles (stable filename, no hash)
```

## Key Architecture Details

### State Management
- All top-level state in `App.jsx`: `filteredSpots`, `selectedSpot`, `planningSpot`, `mapCenter`, `activeTab`, `filters`
- Filter shape: `{ petFriendly, kidFriendly, libraryParkPass, starredOnly, difficulty, category }`
- Two tabs: `explore` (default — map + list) and `plans`

### Data Flow
- Spots data loaded via `useSpots` hook — seeds Firestore `spots` collection from static `SAMPLE_SPOTS` on first authenticated load
- Falls back to localStorage cache when offline/unauthenticated
- User data (starred, plans, family groups) in Firestore via `useFirestore`

### Spot Object Shape
```js
{
  id, name, location, region, lat, lng,
  difficulty: 'easy' | 'moderate' | 'hard',
  category: 'outdoors' | 'cafe' | 'library' | 'sports',
  distance, elevationGain, estimatedHikingTime,
  rating, petFriendly, petNotes, kidFriendly, kidNotes,
  libraryParkPass, libraryCardProgram,
  entranceFee, description, image, sourceUrl
}
```

### CSS Design System
- Palette: warm terra-cotta (`--accent: #c2703e`, `--orange: #d4872e`)
- iOS-style: `-apple-system` font stack, rounded cards (`--radius: 12px`), subtle shadows
- Responsive: 2-column grid > 900px, single column below
- Variables defined in `index.css :root`

## Build & Deploy

### Prerequisites — local .env file
Before building, a `.env` file must exist at the project root. It is gitignored and not committed.
Create it once from the template:
```bash
cp .env.example .env
# then fill in the Firebase values
```
If `.env` is missing, the build succeeds but Firebase config is NOT embedded — the app will silently skip auth and Firestore entirely (no Sign In button, no spots seeding).

**Verify config was embedded after build:**
```bash
grep -o "stardust-8ee28" docs/assets/index.js | head -1
# should print: stardust-8ee28
```

### Local dev & preview
```bash
npm run dev      # hot-reload dev server (port 5173+)
npm run preview  # serves the built docs/ output (port 4173)
```

**Firebase auth on localhost:** if you see `auth/requests-from-referer-http://localhost:PORT-are-blocked`, that is a **GCP API key HTTP referrer restriction** — not a Firebase Authorized Domains issue. Fix it at:
`GCP Console → APIs & Services → Credentials → your Browser API key → HTTP referrers`
Add `localhost:4173/*`, `localhost:5173/*`, `localhost:5176/*` etc.

### Build for production
```bash
npm run build

# After building, bump ?v= cache-buster in docs/index.html:
# <script src="/stardust/assets/index.js?v=20260319e"></script>
# <link href="/stardust/assets/index.css?v=20260319e">
# Increment the letter suffix (a → b → c ...) on each deploy
```

Deploy by committing `docs/` changes to `main` branch — GitHub Pages serves from there automatically.

## Firestore Seeding

`useSpots.js` seeds `SAMPLE_SPOTS` into Firestore on first login, controlled by `SEED_VERSION`.

**Rules:**
- Bump `SEED_VERSION` (e.g. 3 → 4) every time you add or change data in `spots.js`
- Seeding requires login — Firestore write rules require auth. Reads work for everyone once data exists.
- Without a version bump, existing Firestore data is not updated even if `spots.js` changes
- After a version bump, the first user to log in triggers the re-seed for everyone

```js
// src/hooks/useSpots.js
const SEED_VERSION = 5  // bump this when spots.js changes
```

## Map Markers

Each spot category has a dedicated icon in `MapView.jsx`:

| Category | Color | Icon |
|---|---|---|
| `outdoors` | green/orange/red (by difficulty) | mountain |
| `cafe` | brown `#8b5a2b` | mug with handle |
| `library` | blue `#1a6b9a` | open book |
| `sports` (gym) | purple `#6b46c1` | dumbbell |

When adding a new category, add a new SVG + `createIcon()` call and handle it in `getSpotIcon()`.

**Image guidelines:** use facility/space-focused Unsplash photos — no people, faces, or portraits. The photo ID `1507003211169` (Jake Nackos portrait) is a known bad one to avoid.

**Known bad photo IDs — never use these:**
| Photo ID | Reason |
|---|---|
| `1507003211169` | Portrait (Jake Nackos) |
| `1490730141103-6cac27aaab94` | Has people in it |
| `1501854140801-50d01698950b` | Person silhouette (sunset) |
| `1432405972569-32d5c51e2f55` | 404s on Unsplash |
| `1439853949212-36089b0e7e42` | 404s on Unsplash |
| `1526139668667-76d8c985db83` | 404s on Unsplash |
| `1464823063530-08f10943b005` | 404s on Unsplash |
| `1544298177-e7f813c9f24d` | 404s on Unsplash |
| `1542856391-010f196b4859` | 404s on Unsplash |

**Safe default image:** `photo-1500534314209-a25ddb2bd429` (Tennessee Valley Trail — landscape, no people). Use this when no better option exists.

## Common Mistakes — Read Before Writing Code

- **`setDoc` with merge does NOT handle dot-notation as nested paths** — use `updateDoc` for nested field updates
- **Google OAuth tokens expire after ~60 min** — persisted in sessionStorage with 55-min TTL; Firebase restores auth state on refresh but NOT the Google access token
- **`vite.config.js` has `base: '/stardust/'`** — do not change
- **Vite outputs stable filenames** (`index.js`, `index.css`) with `?v=` cache-busting in HTML
- **Firestore security rules** need `spots/{spotId}` allow read/write
- **Minimize new JS files in deploys** — edit existing files when possible
- **`npm run build` resets `docs/index.html`** — every build regenerates the file with bare paths, stripping your `?v=` params. Always re-add the cache-buster after building. Use the `/deploy` skill to avoid forgetting this step.
- **Firestore serves stale spot images until re-seed runs** — when `spots.js` images change, bump `SEED_VERSION` in `useSpots.js`. The re-seed only runs when a logged-in user visits with a new SEED_VERSION. Until then, the app shows cached Firestore data even after rebuild. Users may need to sign out and back in.
- **Preview server must be stopped + restarted after rebuild** — `preview_eval(window.location.reload())` is not enough; the static file server caches the old bundle. Use `preview_stop` then `preview_start` to pick up new `docs/assets/index.js`.
- **When fixing spot images, use line-by-line Python, NOT regex** — multi-line regex with `re.DOTALL` and `\s+` can match across many lines, silently deleting entire spot entries. Instead: split by `\n`, find the `sourceUrl` line containing the anchor, then find the next `image:` line within 5 lines and replace it directly.
- **Always preview on a real mobile device before pushing `docs/`** — the dev server (`npm run dev`) won't show you layout bugs that only appear at phone widths. At minimum, use browser DevTools at 375px width before committing the build.

### CSS Responsive Patterns

- **CSS cascade: base `display: none` must come BEFORE `@media` block** — if the base rule appears after the media query, it overrides the media query's `display: flex` in specificity order. Always put `display: none` defaults above the media query block, then override inside it.
- **Responsive state initialization with `window.innerWidth`** — use a lazy `useState` initializer to set the correct default based on viewport at mount time. Example: `useState(() => window.innerWidth >= 600 ? 'week' : 'day')`. This prevents desktop users getting stuck in a CSS-hidden UI state (e.g., toggle hidden but state still `'day'`).
- **Mobile nav bar crowding** — `.cal-nav` must fit `<` · date label · Day/Week toggle · Today button · `>` on one line. At `≤ 767px`, "March 20, 2026" at `16px` overflows and wraps to 2 rows. Keep `.cal-nav-title strong` at `13px` inside `@media (max-width: 767px)`. General rule: when adding new controls to the nav bar on mobile, verify the date label still fits on one line.

### PlanCalendar Toggle & Sync Effect

- **`calView` guards the `weekStart` sync effect** — `PlanCalendar` syncs `weekStart` to the week containing `selectedDay` when in day view. This effect MUST check `if (calView !== 'day') return` first. Without the guard, clicking `>` / `<` to advance weeks is immediately undone by the effect resetting `weekStart` back to the selected day's week.
- **`fetchEvents` fetches the full week window regardless of day/week view** — the day view just client-side filters `gcalByDate[selectedDateStr]`. No extra API calls per day tap.
- **Mobile breakpoint is `≤ 767px`** — not 599px. Covers larger Android phones and iPads in portrait. The Day/Week toggle and day strip are hidden above this breakpoint via `display: none` base rule + media query override.

## UI Preferences
- iOS-style: clean, minimal, not cluttered
- Do NOT surface errors in the app UI — use notify/message patterns for failures instead

---

## Supported Claude Code Skills

These skills are available in Claude Code for this project. Invoke with `/skill-name` or let Claude trigger them automatically.

### Auto-triggered (Claude decides when to use)

| Skill | What it does |
|---|---|
| `stardust` (this file) | Loads full project context when editing any file in this repo |
| `/simplify` | Reviews recently changed files for code quality, reuse, and efficiency — spawns 3 parallel review agents |
| `/batch <instruction>` | Large-scale codebase changes in parallel (e.g. `/batch migrate all components to use CSS variables`) |
| `/claude-api` | Loads Claude API + Agent SDK reference — auto-triggers if you import `anthropic` |

### Manually invoked (you type the `/` command)

| Skill | What it does | Why manual-only |
|---|---|---|
| `/deploy` | Runs `npm run build`, bumps `?v=` cache-buster in `docs/index.html`, stages `docs/` for commit | Side-effect: modifies build output — don't let Claude decide when to deploy |
| `/debug` | Reads session debug log and diagnoses what went wrong in the current Claude Code session | Diagnostic tool, not needed automatically |
| `/loop 5m check if deploy finished` | Polls a condition on an interval while session is open | You control when to start/stop polling |

### Subagent patterns for this project

Claude Code can spawn specialized subagents. Useful patterns for Stardust:

- **`context: fork` + `agent: Explore`** — research a bug across hooks/components without touching files
- **`context: fork` + `agent: Plan`** — design a new feature (e.g. a new filter type) before any code is written
- **`/batch`** — use for refactors that touch many components at once (e.g. renaming a prop across all components)

### MCP servers worth adding

Claude Code supports MCP (Model Context Protocol) servers that give it live access to external tools:

| MCP Server | Why useful for Stardust |
|---|---|
| `github` | Read issues, open PRs, create commits — pairs with the deploy workflow |
| `firebase` | Query Firestore directly, inspect auth users, check security rules without leaving Claude Code |
| `playwright` / `puppeteer` | Run the live site in a headless browser for visual regression checks after deploy |

Add MCP servers in your Claude Code settings (`~/.claude/settings.json` → `mcpServers`).

### Dynamic context injection (advanced)

Skills can run shell commands before Claude sees the prompt, injecting live data:

```yaml
# Example: a pr-review skill that fetches live diff before Claude reads it
allowed-tools: Bash(gh *)
---
PR diff: !`gh pr diff`
Changed files: !`gh pr diff --name-only`
```

This is useful for a Stardust-specific `/spot-audit` skill that could run
`!`grep -r "SAMPLE_SPOTS" src/`` to inject the current spots count before asking
Claude to suggest new ones.
