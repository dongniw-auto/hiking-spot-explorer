# scripts/

One-off and maintenance scripts for the Stardust app. None of these are run at
build time — they are developer tools for preparing seed data.

## enrich-spots.mjs

Adds scoring-engine fields to every spot in `src/data/spots.js`:

| Field | Type | Used by |
|---|---|---|
| `estimatedDuration` | number (minutes) | `useSuggestion.js` (free-time fit) |
| `bestSeasons` | `("spring"\|"summer"\|"fall"\|"winter")[]` | season scoring |
| `shaded` | boolean | weather / hot-day scoring |
| `bestTimeOfDay` | `("morning"\|"midday"\|"afternoon"\|"evening")[]` | time-of-day scoring |
| `vibes` | `("quiet"\|"restorative"\|"energized"\|"focused"\|"social"\|"family")[]` | mode matching |

Derivation rules live inside the script and are deterministic — rerunning is
idempotent as long as the underlying `category` / `difficulty` / `description`
are unchanged.

### Run it

```bash
npm run enrich:spots
```

### After running

1. `git diff src/data/spots.js` — sanity check the changes.
2. Bump `SEED_VERSION` in `src/hooks/useSpots.js` so Firestore re-seeds on the
   next authenticated load. (See SKILL.md → "Firestore Seeding".)
3. Commit `spots.js` and `useSpots.js` together.

### When to rerun

- You added new spots to `spots.js` by hand.
- You edited a spot's `category`, `difficulty`, or `description` in a way that
  would change its scoring classification.
- You changed the derivation rules in `enrich-spots.mjs` itself.
