# Stardust

Discover trails, museums, heritage sites & hidden gems in the Bay Area. Built with React + Vite, backed by Firebase (Auth + Firestore).

## Prerequisites

- Node.js 18+
- A Firebase project with Authentication (Google provider) and Firestore enabled

## Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create a `.env` file from the example:

```bash
cp .env.example .env
```

3. Fill in your Firebase config values in `.env`:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

## Development

```bash
npm run dev
```

Opens the app at `http://localhost:5173/stardust/`.

## Build & Deploy

The site is deployed to GitHub Pages from the `docs/` folder on the `main` branch.

### Build

```bash
npm run build
```

This runs `vite build` which outputs to `docs/`. The Vite config uses stable filenames (`assets/index.js`, `assets/index.css`) to avoid accumulating stale hashed files in the repo.

### Cache busting

After building, update the query params in `docs/index.html` to bust browser caches:

```html
<script type="module" crossorigin src="/stardust/assets/index.js?v=YYYYMMDD"></script>
<link rel="stylesheet" crossorigin href="/stardust/assets/index.css?v=YYYYMMDD">
```

Increment the `?v=` value (e.g. `20260319d` -> `20260319e`) each time you deploy.

### Deploy

Commit and push the updated `docs/` folder to the `main` branch. GitHub Pages serves from `docs/` automatically.

## Project Structure

```
src/
  main.jsx              # App entry point
  App.jsx               # Root component with routing, filters, search
  App.css               # Global app styles
  index.css             # Base CSS reset/variables
  firebase.js           # Firebase initialization
  data/spots.js         # Seed data for spots
  hooks/
    useAuth.js           # Firebase Auth + Google sign-in
    useFirestore.js      # Firestore reads/writes (stars, plans, family groups)
    useSpots.js          # Spots data from Firestore with local cache
    useGoogleCalendar.js # Google Calendar integration
  components/
    MapView.jsx/css      # Leaflet map with colored markers (mountain/coffee icons)
    SpotList.jsx/css     # Filterable list of spots
    SearchBar.jsx/css    # Search + filter controls
    VisitPlanner.jsx/css # Plan a visit modal
    SavedPlans.jsx/css   # Saved plans view with family sharing
    AuthButton.jsx/css   # Google sign-in button
    FamilyGroup.jsx/css  # Family group management
    PlanCalendar.jsx/css # Calendar date picker for plans
public/
  favicon.svg            # Site favicon
  icons.svg              # SVG icon sprites
docs/                    # Built output (served by GitHub Pages)
```
