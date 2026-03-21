# ✦ Stardust

> *A personal atlas for people who spend too much time online and not enough time outside.*

Stardust helps you reconnect with the physical world — trails with shade, quiet libraries, non-chain cafes, the places that restore you. It's built for introverts who recharge in nature, in beauty, in stillness. People who care deeply about their people, and want to share those moments too.

The app knows your time. It suggests one place. You go.

When you come back, you collect a **stardust** — a tiny personal memory of what happened there. Over time, you build a private atlas of your relationship with the places you love.

---

## What Stardust is

- A **grounding tool**, not a discovery platform
- A **personal atlas** of your Bay Area — trails, cafes, libraries, the places that feel like yours
- A **"just go" experience** — one suggestion, not a list to browse
- A **memory collector** — small, irreplaceable moments attached to places
- A **gentle family nudge** — bounties that invite the people you love to go somewhere together

## What Stardust is not

- Not a social network
- Not a review platform
- Not a productivity tool
- Not another map full of pins

---

## Core Concepts

### The Today Card
The main screen. One place, suggested for right now based on your available time, the season, time of day, and how long since you last visited. If it doesn't land, tap "not today" — you'll see the next best option. Never more than 3 taps before you're somewhere you want to go.

### Stardust Memories
When you return from a place, you collect a stardust — a small personal memory:
- What happened there
- Who you were with (solo, spouse, kid, friend)
- How you felt leaving
- For cafes: an optional **taste card** — the drink, the flavors, the vibe in one word

Not a review. Not a rating. A feeling. A love letter to a moment.

### Taste Cards
Inspired by the small printed cards some cafes produce describing the character of a drink. In Stardust, a taste card is your personal record of a cafe encounter — digitized, collected, yours. It's what makes a cafe not just a location but a relationship.

### Modes
Stardust understands you're not always the same person:
- **Solo mode** — I have 90 minutes, I need quiet and air
- **Family mode** — Sunday adventure, kid-friendly, nobody driving more than 20 min
- **Body mode** — swim, massage, physical restoration

The suggestion engine adjusts to the mode so family chaos doesn't bleed into your solo restoration time.

### Bounties
Any family member can place a bounty on a spot — a gentle, playful nudge to visit somewhere together. It's not a schedule, not a task. It's an invitation with a little warmth behind it. Family members take turns, so no one person is always the one suggesting. When the group goes and collects their stardust from that spot, the bounty closes.

---

## Tech Stack

- React 19 + Vite 8 (tab-based navigation, no router)
- Leaflet for maps
- Firebase Auth (Google sign-in) + Firestore
- Google Calendar REST API (via OAuth token) — reads free time, never colonizes it
- Deployed from `docs/` on `main` branch → GitHub Pages

---

## Prerequisites

- Node.js 18+
- A Firebase project with Authentication (Google provider) and Firestore enabled

---

## Setup

```bash
# 1. Install
npm install

# 2. Create your .env
cp .env.example .env
# Fill in Firebase config values
```

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

---

## Development

```bash
npm run dev
# http://localhost:5173/stardust/
```

---

## Build & Deploy

```bash
npm run build
```

Outputs to `docs/`. After building, bump the `?v=` cache-buster in `docs/index.html`:

```html
<script type="module" crossorigin src="/stardust/assets/index.js?v=YYYYMMDD"></script>
<link rel="stylesheet" crossorigin href="/stardust/assets/index.css?v=YYYYMMDD">
```

Increment the suffix each deploy (e.g. `20260319d` → `20260319e`). Then commit and push — GitHub Pages serves from `docs/` automatically.

---

## Project Structure

```
src/
  main.jsx                  # Entry point
  App.jsx                   # Root — state, tab switching, mode management
  App.css                   # Layout: header, grid, tab bar
  index.css                 # CSS variables, reset (warm dark palette)
  firebase.js               # Firebase init
  data/
    spots.js                # Curated spot data + PACK_LIST_TEMPLATES
  hooks/
    useAuth.js              # Firebase Google auth + access token
    useFirestore.js         # Starred, plans, memories, bounties, family groups
    useSpots.js             # Spots from Firestore, localStorage fallback
    useGoogleCalendar.js    # Calendar read/write (free time detection)
    useSuggestion.js        # Scoring engine — today's suggestion
  components/
    TodayCard.jsx/css       # THE main screen — one suggestion, just go
    CollectStardust.jsx/css # Post-visit memory collection modal
    TasteCard.jsx/css       # Cafe taste card capture + display
    Bounty.jsx/css          # Family bounty creation + tracking
    MapView.jsx/css         # Leaflet map (secondary — not the default view)
    SpotList.jsx/css        # Browse view (fallback from TodayCard)
    SearchBar.jsx/css       # Filters (only visible in browse mode)
    SavedPlans.jsx/css      # Plans tab with calendar
    PlanCalendar.jsx/css    # Calendar + Google Calendar sync
    AuthButton.jsx/css      # Sign in/out + avatar
    FamilyGroup.jsx/css     # Family group management
public/
  favicon.svg
  icons.svg
docs/                       # Built output → GitHub Pages
```

---

## Design Principles

**Feel like a deep breath, not a dashboard.**
The default experience should make you want to go outside within 10 seconds of opening the app. If it makes you think about logistics, something is wrong.

**One thing at a time.**
The Today Card shows one place. The memory collector asks a few small questions. The bounty is one invitation. Resist the urge to add more to any screen.

**Never colonize the escape.**
Calendar integration exists to detect free time — not to make nature feel like a meeting. The app should feel like a friend who knows your schedule, not another calendar.

**Personal over social.**
Memories are yours. Taste cards are yours. The atlas is yours. Sharing is opt-in and intimate (family group only), never broadcast.

**Slow accumulation over streaks.**
There are no streaks, no badges, no points. Just a quietly growing collection of moments that remind you: I have a life outside the screen. It has texture. It's beautiful.

---

## Roadmap

### Now — the soul
- [x] Spot data with `estimatedDuration`, `shaded`, `vibes`, `bestSeasons`
- [ ] `TodayCard.jsx` — the "just go" screen with scoring engine
- [ ] `lastVisited` + `visitCount` logged to Firestore on "Let's go" tap
- [ ] `CollectStardust` modal — note, withWho, mood, taste card
- [ ] Stardust memory collection in Firestore

### Next — depth
- [ ] `useSuggestion.js` — extracted scoring hook with calendar-aware time detection
- [ ] Taste card display in spot detail view
- [ ] Memory timeline — your atlas over time
- [ ] Mode switching (solo / family / body)

### Later — family
- [ ] `Bounty.jsx` — place a bounty on a spot, family takes turns
- [ ] Bounty notification (soft, not push)
- [ ] Shared family memory view — group stardust from the same outing

### Someday
- [ ] Weather-aware scoring (cafe boost on rainy days)
- [ ] Seasonal trail highlights
- [ ] Offline-first (full PWA)
- [ ] iOS app (React Native or Swift)

---

## The Metric That Matters

Not DAU. Not retention.

**Did you go outside more this week because of Stardust?**

That's it.
