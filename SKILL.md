---
name: stardust
description: Stardust — personal grounding atlas app. Use when working on the Stardust React app, modifying code, fixing bugs, adding features, or deploying changes. Auto-loads when editing any file in this project.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash(npm *), Bash(git *)
---

# Stardust Dev Skill

## What This App Is — Read This First

Stardust is a **grounding tool** for people who spend too much time in front of screens and not enough time outside. The core user is an introvert who recharges in nature, quiet cafes, and libraries — and who occasionally wants to share that with the people they love.

The emotional core of the app:

> *Open it when you have a free hour. It suggests one place. You go. When you come back, you collect a stardust — a tiny memory of what happened there. Over time, you build a personal atlas of your relationship with the places you love.*

**This is not a discovery platform. Not a social network. Not a productivity tool.**
Every feature decision should be measured against: *does this make someone feel more grounded, or does it add anxiety?*

---

## Project Overview

- **GitHub repo:** `dongniw-auto/stardust`
- **Live site:** https://dongniw-auto.github.io/stardust/
- **Firebase project:** `stardust-8ee28` (GCP)

## Tech Stack

- React 19 + Vite 8 (no router — tab-based navigation)
- Leaflet for maps (secondary view, not default)
- Firebase Auth (Google sign-in) + Firestore
- Google Calendar REST API (via OAuth token) — reads free time only
- Deployed from `docs/` folder on `main` branch

---

## File Structure

```
src/
├── main.jsx                  # Entry point, mounts <App />
├── App.jsx                   # Root — state, tab switching, mode management
├── App.css                   # Layout: header, grid, tab bar
├── index.css                 # CSS variables, reset, typography (warm dark palette)
├── firebase.js               # Firebase config & initialization
├── data/
│   └── spots.js              # SAMPLE_SPOTS array + PACK_LIST_TEMPLATES
├── hooks/
│   ├── useAuth.js            # Firebase Google auth, access token management
│   ├── useFirestore.js       # Stars, plans, memories, bounties, family groups CRUD
│   ├── useSpots.js           # Seeds Firestore from static data, localStorage fallback
│   ├── useGoogleCalendar.js  # Google Calendar read/write via REST
│   └── useSuggestion.js      # Scoring engine — today's card suggestion
└── components/
    ├── TodayCard.jsx/css         # THE main screen — one suggestion, just go
    ├── CollectStardust.jsx/css   # Post-visit memory collection (bottom sheet modal)
    ├── TasteCard.jsx/css         # Cafe taste card capture + display
    ├── Bounty.jsx/css            # Family bounty creation + tracking
    ├── MapView.jsx/css           # Leaflet map with custom SVG markers
    ├── SpotList.jsx/css          # Browse view (fallback from TodayCard)
    ├── SearchBar.jsx/css         # Search + chip filters (browse mode only)
    ├── VisitPlanner.jsx/css      # Plan a visit modal
    ├── SavedPlans.jsx/css        # Stardust tab: plans + memories, calendar + list, edit modal
    ├── PlanCalendar.jsx/css      # Calendar with Google Calendar sync + memory blocks
    ├── AuthButton.jsx/css        # Sign in/out + avatar
    └── FamilyGroup.jsx/css       # Family group management

docs/                         # Vite build output → GitHub Pages
├── index.html
└── assets/
    ├── index.js              # Bundled app (stable filename, no hash)
    └── index.css             # Bundled styles (stable filename, no hash)
```

---

## Core Concepts & Data Models

### Spot Object

```js
{
  // identity
  id, name, location, region, lat, lng,

  // classification
  category: 'outdoors' | 'cafe' | 'library' | 'sports' | 'wellness',
  difficulty: 'easy' | 'moderate' | 'hard',  // outdoors only

  // suggestion engine inputs
  estimatedDuration: 60,          // minutes — KEY signal for TodayCard
  shaded: true,                   // boosts score in summer
  bestSeasons: ['spring','fall'],  // array of season strings
  bestTimeOfDay: ['morning','afternoon'], // morning/midday/afternoon/evening
  vibes: ['quiet','focused','restorative','family','social'],

  // filters
  petFriendly, petNotes,
  kidFriendly, kidNotes,
  libraryParkPass, libraryCardProgram,
  entranceFee,

  // content
  description, image, sourceUrl,

  // user state (Firestore, per-user)
  starred: boolean,
  visitCount: 0,           // increment on "Let's go" tap
  lastVisited: timestamp,  // log on "Let's go" tap — drives recency score
}
```

### Stardust Memory Object

A Stardust is a tiny personal memory attached to a place. Not a review. A feeling.

```js
{
  id: string,           // 'sd_<timestamp>_<random>'
  spotId: string,
  spotName: string,
  date: ISO string,     // start time of the visit
  endDate: ISO string,  // end time (defaults to start + 1hr)
  note: string,         // "found a snail, named it Gerald"
  withWho: string[],    // ['solo'] | ['spouse'] | ['kid','spouse'] etc.
  mood: string,         // how you felt leaving: 'restored','peaceful','energized','grateful','present'
  imageUrl?: string,    // optional photo (future)
  tasteCard?: {         // cafes only
    drink: string,      // "hojicha latte"
    flavors: string[],  // ["nutty", "earthy", "sweet"]
    vibe: string,       // "grounding"
  }
}
```

Stored in Firestore: `users/{uid}` doc under `memories` object (keyed by memory ID).
Memories are editable after collection — tap to edit note, date, start/end time, withWho, and mood.

### Taste Card

Inspired by the small printed cards specialty cafes use to describe a drink's character. In Stardust, it's a personal record of a cafe encounter — the drink you had, how it tasted, the feeling it left. What makes a cafe not just a pin on a map but a relationship.

Taste cards live inside Stardust memories (`memory.tasteCard`) and are also displayable as standalone cards in the spot detail view.

### Bounty Object

A bounty is a gentle family invitation — one member nominates a spot, the rest of the family sees it as a soft nudge. Not a task, not a deadline. An invitation with warmth behind it.

```js
{
  id: string,
  spotId: string,
  spotName: string,
  spotImage: string,
  createdBy: uid,
  createdByName: string,
  familyGroupId: string,
  createdAt: timestamp,
  note: string,           // optional — "I've always wanted to take you here"
  status: 'open' | 'claimed' | 'completed',
  claimedBy?: uid[],      // who's in
  completedAt?: timestamp,
  memoryIds?: string[],   // stardust memories collected from this outing
}
```

Rules:
- Each family member can only have **one active bounty** at a time (prevents pile-up)
- Family takes turns — the person who placed the last completed bounty can't place the next one
- When the group visits and collects stardust from that spot, the bounty is marked complete
- No expiry, no pressure — bounties sit open until someone acts on them

Stored in Firestore: `familyGroups/{groupId}/bounties/{bountyId}`

### Modes

The suggestion engine and UI adapt to the user's current mode:

```js
'solo'    // I have time for myself — quiet, restorative, introverted
'family'  // Bringing the crew — kid-friendly, accessible, shareable
'body'    // Physical restoration — swim, massage, movement
```

Mode affects scoring weights and UI messaging. Switch modes from the TodayCard setup screen.

---

## Suggestion Engine (useSuggestion.js / scoreSpot)

Pure function — no API calls, no ML. Runs locally, works offline.

```js
score = time_fit         (0–35 pts, highest weight)
      + recency          (0–25 pts)
      + starred_never_visited_bonus (15 pts)
      + seasonal_fit     (0–10 pts)
      + time_of_day_fit  (0–8 pts)
      + mood_match       (0–7 pts)
```

**Time fit** — `estimatedDuration <= availableMinutes`. Spots over budget get -20. Spots that use ~75% of available time score highest (leaves breathing room).

**Recency** — `daysSince(spot.lastVisited)`. Never visited = 999 days = max score. Visited yesterday = -10 penalty. Natural rotation without user effort.

**Starred but never visited** — +15. You saved it for a reason. Stardust should push you to actually go.

**Season** — current month mapped to spring/summer/fall/winter. `spot.shaded` gets +8 bonus in summer.

**Time of day** — cafes score higher morning/afternoon. Libraries afternoon/evening. Trails morning.

**Rejection flow:**
```
Card shown → "not today" → next ranked spot (no explanation)
After 2 rejections → soft prompt: "Want something closer? Try adjusting your time."
After 3 rejections → offer to browse (SpotList), never a filter panel
```

The rejection signal is valuable data. Log it to improve future rankings.

---

## TodayCard Component

The main screen. Three sub-screens:

**Setup** — how much time? (1hr / 2hr / half day / all day) + mood (need quiet / open to anything). One tap each. Optional. Skippable with defaults.

**Card** — full-bleed photo, spot name, location, description, soft meta tags (duration, shaded, pet-friendly). "Let's go ✦" or "not today". Clean. No map. No filter chips.

**Going** — you tapped Let's go. App shows "Have a beautiful time." + Maps deep link. When you're back: "Collect your stardust" button opens CollectStardust modal.

**Done** — memory collected. Shows the stardust you just made. Quiet, warm.

---

## Key Architecture Details

### State Management

- All top-level state in `App.jsx`: `filteredSpots`, `selectedSpot`, `planningSpot`, `mapCenter`, `activeTab`, `filters`, `mode`
- Filter shape: `{ petFriendly, kidFriendly, libraryParkPass, starredOnly, difficulty, category }`
- Tabs: `today` (default — TodayCard), `explore` (map + list), `stardust` (plans + memories calendar/list)
- Mode: `solo | family | body`

### Data Flow

- Spots loaded via `useSpots` — seeds Firestore from `SAMPLE_SPOTS` on first authenticated load
- Falls back to localStorage when offline/unauthenticated
- User data (starred, plans, memories, bounties) in Firestore via `useFirestore` — memories stored as object keyed by ID on user doc, with localStorage fallback
- `lastVisited` and `visitCount` written to Firestore when user taps "Let's go" on TodayCard

### CSS Design System

- **Palette**: warm dark — `--bg: #0e0d0b`, `--accent: #c8935a`, `--gold: #d4a96a`
- **Typography**: Georgia / Times serif — warm, unhurried, not a tech product
- **Feel**: iOS-style card surfaces, rounded (`--radius: 12px`), subtle shadows, never clinical
- **Responsive**: single column mobile-first. Map/list grid > 900px.
- Variables in `index.css :root`

---

## Build & Deploy

### Local .env

```bash
cp .env.example .env
# fill in Firebase values
```

Without `.env`, build succeeds but Firebase is not embedded — no auth, no spots.

Verify after build:
```bash
grep -o "stardust-8ee28" docs/assets/index.js | head -1
# should print: stardust-8ee28
```

### Commands

```bash
npm run dev      # hot-reload, port 5173
npm run preview  # serves docs/ output, port 4173
npm run build    # outputs to docs/
```

### Deploy

```bash
npm run build
touch docs/.nojekyll          # build wipes docs/ — must re-add every time
# bump ?v= in docs/index.html
# <script src="/stardust/assets/index.js?v=20260320a"></script>
git add docs/ && git commit -m "deploy" && git push
```

GitHub Pages serves from `docs/` on `main` automatically.

**Critical:** `npm run build` wipes the entire `docs/` directory. You MUST run `touch docs/.nojekyll` after every build, or GitHub Pages will run Jekyll and fail on `{{ }}` syntax in code blocks.

---

## Firestore Seeding

`useSpots.js` seeds `SAMPLE_SPOTS` into Firestore on first login, controlled by `SEED_VERSION`.

- Bump `SEED_VERSION` every time `spots.js` changes
- Seeding requires auth — Firestore write rules require login
- Reads work for all once data exists
- First logged-in user after version bump triggers re-seed for everyone

```js
const SEED_VERSION = 5  // bump when spots.js changes
```

---

## Map Markers

| Category | Color | Icon |
|---|---|---|
| `outdoors` | green/orange/red (difficulty) | mountain |
| `cafe` | brown `#8b5a2b` | mug |
| `library` | blue `#1a6b9a` | open book |
| `sports` | purple `#6b46c1` | dumbbell |
| `wellness` | rose `#b5637a` | leaf |

Adding a new category: add SVG + `createIcon()` call + handle in `getSpotIcon()`.

**Image guidelines:** facility/space-focused Unsplash photos. No people, faces, portraits.

**Safe default:** `photo-1500534314209-a25ddb2bd429` (Tennessee Valley Trail).

**Known bad photo IDs — never use:**
| Photo ID | Reason |
|---|---|
| `1507003211169` | Portrait |
| `1490730141103-6cac27aaab94` | Has people |
| `1501854140801-50d01698950b` | Person silhouette |
| `1432405972569-32d5c51e2f55` | 404s |
| `1439853949212-36089b0e7e42` | 404s |
| `1526139668667-76d8c985db83` | 404s |
| `1464823063530-08f10943b005` | 404s |
| `1544298177-e7f813c9f24d` | 404s |
| `1542856391-010f196b4859` | 404s |

---

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

- **`setDoc` with merge does NOT handle dot-notation as nested paths** — use `updateDoc` for nested updates
- **Google OAuth tokens expire after ~60 min** — persisted in sessionStorage with 55-min TTL; Firebase restores auth on refresh but NOT the Google token
- **`vite.config.js` has `base: '/stardust/'`** — do not change
- **`npm run build` wipes `docs/`** — always re-add `?v=` cache-buster AND run `touch docs/.nojekyll` after building. Without `.nojekyll`, Jekyll chokes on `{{ }}` in code blocks.
- **Firestore serves stale spot images until re-seed runs** — bump `SEED_VERSION` in `useSpots.js` when `spots.js` images change
- **Preview server must be stopped + restarted after rebuild** — `preview_stop` then `preview_start`
- **When fixing spot images, use line-by-line Python, NOT regex** — multi-line regex with `re.DOTALL` can silently delete entire spot entries
- **Always preview on real mobile (375px) before pushing `docs/`**

### CSS Responsive Patterns

- **CSS cascade: base `display: none` must come BEFORE `@media` block** — base rule after media query overrides it
- **Responsive state initialization with `window.innerWidth`** — use lazy `useState` initializer: `useState(() => window.innerWidth >= 600 ? 'week' : 'day')`
- **Mobile nav bar crowding** — `.cal-nav-title strong` at `13px` inside `@media (max-width: 767px)`
- **Mobile breakpoint is `≤ 767px`** — not 599px

### PlanCalendar Toggle & Sync Effect

- **`calView` guards the `weekStart` sync effect** — must check `if (calView !== 'day') return` first or clicking `>/<` is immediately undone
- **`fetchEvents` fetches full week window regardless of view** — day view filters client-side
- **Mobile breakpoint is `≤ 767px`**

### Bottom Sheet Modal Pattern (CollectStardust)

The collect memory modal is a bottom sheet anchored via `modalOverlay` with `alignItems: flex-end`. Key rules:

- **Modal must be flex column** — `display: flex`, `flexDirection: column`, `overflow: hidden` on `modalCard`
- **Header and action buttons get `flexShrink: 0`** — they stay pinned, never scroll away
- **Form body gets `overflowY: auto` + `flex: 1` + `minHeight: 0`** — only the body scrolls
- **Overlay needs `paddingBottom: 62`** — clears the fixed tab bar (62px). Without this, buttons hide behind the nav
- **Modal maxHeight uses `calc(100vh - 130px)`** — accounts for top gap + bottom nav
- **Button labels must be compact** — use "Skip" / "Save", not "Skip for now" / "Save memory". Long labels wrap to 2 rows on small screens
- **Both buttons get `flex: 1`** — equal width, balanced layout, always single row
- **Always preview on iPhone SE (375×667)** — shortest common viewport, forces overflow to test scroll behavior

---

## UI Principles

- **Feel like a deep breath, not a dashboard** — if opening the app creates anxiety, something is wrong
- **One thing at a time** — TodayCard shows one place. Memory collector asks small questions. Bounty is one invitation.
- **Never surface errors in UI** — use notify/message patterns for failures
- **iOS-style: clean, minimal, warm** — Georgia serif, dark warm backgrounds, rounded cards
- **No streaks, no badges, no points** — slow accumulation of real moments is the reward

---

## Supported Claude Code Skills

### Auto-triggered

| Skill | What it does |
|---|---|
| `stardust` (this file) | Loads full project context |
| `/simplify` | Reviews changed files for quality + reuse — spawns 3 parallel review agents |
| `/batch <instruction>` | Large-scale parallel changes |
| `/claude-api` | Loads Claude API reference — auto-triggers if you import `anthropic` |

### Manually invoked

| Skill | What it does | Why manual |
|---|---|---|
| `/deploy` | `npm run build` → bumps `?v=` → stages `docs/` | Side-effect: modifies build output |
| `/debug` | Reads session debug log, diagnoses what went wrong | Diagnostic, not automatic |
| `/loop 5m check if deploy finished` | Polls condition on interval | You control start/stop |

### MCP Servers Worth Adding

| MCP Server | Why useful |
|---|---|
| `github` | Read issues, open PRs, create commits |
| `firebase` | Query Firestore directly, inspect auth, check rules |
| `playwright` | Visual regression checks against live site after deploy |

---

## Roadmap Context (for AI coding sessions)

When helping build new features, respect this priority order:

**Now (the soul):**
- TodayCard as the default tab — one suggestion, just go
- `lastVisited` + `visitCount` logged to Firestore on "Let's go"
- CollectStardust modal — note, withWho, mood, taste card
- ~~Memories stored in Firestore~~ DONE — persisted to Firestore with start/end time, editable via Stardust tab

**Next (depth):**
- `useSuggestion.js` extracted scoring hook with calendar-aware time detection
- Taste card display in spot detail
- Mode switching (solo / family / body)

**Later (family):**
- Bounty system — place, claim, complete, collect shared stardust
- Shared family memory view

**Freeze until soul is working:**
- Weather API integration
- Push notifications
- Any new filter types
- Any new spot categories

The test for any new feature: *does this make someone feel more grounded, or does it add cognitive load?* If the latter, defer it.
