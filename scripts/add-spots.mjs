#!/usr/bin/env node

/**
 * scripts/add-spots.mjs
 *
 * Fetch place data from the Google Places API (New, v1) and generate new
 * entries for src/data/spots.js, so you don't have to hand-write 20 fields
 * every time you want to add a spot to Stardust.
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *   # by exact place name (highest precision — use when you know the place)
 *   npm run add:spots -- --place "Philz Coffee Palo Alto" --category cafe
 *
 *   # by keyword + location (use for discovery — "find me 5 bubble tea spots")
 *   npm run add:spots -- --near "Palo Alto, CA" --keyword "bubble tea" \
 *                         --category cafe --limit 5
 *
 *   # by keyword + explicit lat/lng (use if you know exact coords)
 *   npm run add:spots -- --near "37.44,-122.16" --keyword "redwood hike" \
 *                         --category outdoors --limit 3
 *
 *   # dry run (default) prints the generated spot objects without writing
 *   npm run add:spots -- --place "Muir Woods" --category outdoors
 *
 *   # actually append to spots.js and bump SEED_VERSION automatically
 *   npm run add:spots -- --place "Muir Woods" --category outdoors --commit
 *
 * ── Required env ───────────────────────────────────────────────────────────
 *   GOOGLE_PLACES_API_KEY
 *     Enable the "Places API (New)" on your stardust-8ee28 GCP project,
 *     create a key, and put it in .env:
 *       GOOGLE_PLACES_API_KEY=AIza...
 *     The npm script is wired with `node --env-file=.env`, so .env is read
 *     automatically — no dotenv package needed (Node 20+).
 *
 * ── What it writes ─────────────────────────────────────────────────────────
 * Generates a Stardust spot object with:
 *   - id          auto-incremented
 *   - name, location, region, lat, lng, rating   from Places
 *   - category    from --category flag (required)
 *   - description from editorialSummary.text (Google) or a stub
 *   - sourceUrl   googleMapsUri from Places
 *   - image       a category-specific safe default from DEFAULT_IMAGES below
 *                 (Places photo URLs aren't persistable — you'll want to
 *                  swap in a hand-picked Unsplash later)
 *   - scoring fields (estimatedDuration, bestSeasons, shaded, bestTimeOfDay,
 *     vibes) are intentionally LEFT OUT — run `npm run enrich:spots` after
 *     committing to have them filled in by the deterministic enricher.
 *
 * ── Safety ─────────────────────────────────────────────────────────────────
 * - Dry run by default. You see the proposed objects and diff before anything
 *   touches spots.js.
 * - ID collisions are prevented (new IDs start at max(existing) + 1).
 * - Duplicate detection: if a fetched place has the same (name, lat, lng) as
 *   an existing spot (within 0.0005° ≈ 50m), it's skipped with a warning.
 */

import process from "node:process";
import { loadSpotsFile, writeSpotsFile, spotToString, SPOTS_PATH } from "./lib/spots-file.mjs";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const CATEGORIES = ["outdoors", "cafe", "library", "sports", "wellness"];

/**
 * Safe default images per category, all already used in spots.js and
 * verified against SKILL.md's "known bad photo IDs" list.
 */
const DEFAULT_IMAGES = {
  outdoors: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=500&fit=crop",
  cafe:     "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=500&fit=crop",
  library:  "https://images.unsplash.com/photo-1568667256549-094345857637?w=800&h=500&fit=crop",
  sports:   "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=500&fit=crop",
  // no wellness spot exists in current data — fall back to nature default
  wellness: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&h=500&fit=crop",
};

/** Per-category defaults for booleans and notes. */
const CATEGORY_DEFAULTS = {
  outdoors: { petFriendly: true,  kidFriendly: true,  libraryParkPass: false },
  cafe:     { petFriendly: false, kidFriendly: true,  libraryParkPass: false },
  library:  { petFriendly: false, kidFriendly: true,  libraryParkPass: true  },
  sports:   { petFriendly: false, kidFriendly: false, libraryParkPass: false },
  wellness: { petFriendly: false, kidFriendly: false, libraryParkPass: false },
};

const PLACES_BASE = "https://places.googleapis.com/v1";
// Field mask tells Places API which fields to return (billing is per-field).
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.shortFormattedAddress",
  "places.location",
  "places.rating",
  "places.editorialSummary",
  "places.googleMapsUri",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.addressComponents",
].join(",");

// ─────────────────────────────────────────────
// CLI PARSING
// ─────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    place: null,
    near: null,
    keyword: null,
    category: null,
    limit: 5,
    commit: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--place")         args.place    = next();
    else if (a === "--near")     args.near     = next();
    else if (a === "--keyword")  args.keyword  = next();
    else if (a === "--category") args.category = next();
    else if (a === "--limit")    args.limit    = Number(next());
    else if (a === "--commit")   args.commit   = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else {
      console.error(`Unknown flag: ${a}`);
      process.exit(2);
    }
  }
  return args;
}

function validate(args) {
  if (args.help) return { error: null, help: true };
  if (!args.category) {
    return { error: "missing --category (outdoors|cafe|library|sports|wellness)" };
  }
  if (!CATEGORIES.includes(args.category)) {
    return { error: `invalid --category "${args.category}". must be one of: ${CATEGORIES.join(", ")}` };
  }
  if (!args.place && !(args.near && args.keyword)) {
    return { error: "need either --place, or both --near and --keyword" };
  }
  if (args.place && (args.near || args.keyword)) {
    return { error: "use --place OR (--near + --keyword), not both" };
  }
  return { error: null };
}

function printHelp() {
  console.log(`
scripts/add-spots.mjs — fetch spots from Google Places and append to spots.js

Usage:
  npm run add:spots -- --place "NAME" --category CAT
  npm run add:spots -- --near "LOC" --keyword "KW" --category CAT [--limit N]

Flags:
  --place <name>      Exact place name (single result)
  --near <loc>        "City, ST" or "lat,lng" — used with --keyword
  --keyword <query>   Search query — used with --near
  --category <cat>    outdoors | cafe | library | sports | wellness  (required)
  --limit <n>         Max results for keyword search (default 5)
  --commit            Actually write to spots.js (default: dry run)
  --help              Show this

Required env:
  GOOGLE_PLACES_API_KEY   (set in .env — loaded via --env-file)
`.trim());
}

// ─────────────────────────────────────────────
// PLACES API
// ─────────────────────────────────────────────

/**
 * Call the Places API Text Search endpoint.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 */
async function placesTextSearch({ query, maxResults, apiKey }) {
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: maxResults,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = await res.json();
  return data.places || [];
}

// ─────────────────────────────────────────────
// PLACE → SPOT CONVERSION
// ─────────────────────────────────────────────

/**
 * Convert a single Google Places result into a Stardust spot object.
 * Intentionally omits scoring fields — run `npm run enrich:spots` after.
 */
export function placeToSpot(place, { id, category }) {
  const defaults = CATEGORY_DEFAULTS[category];
  const location = buildLocation(place);
  const region = inferRegion(place);
  const description =
    place.editorialSummary?.text?.trim() ||
    `${place.displayName?.text || "A place"} — ${place.primaryTypeDisplayName?.text || category}.`;

  return {
    id,
    name: place.displayName?.text || "Unknown place",
    location,
    region,
    lat: round5(place.location?.latitude),
    lng: round5(place.location?.longitude),
    // Outdoors-only fields are kept as nullish so the shape matches existing spots.
    ...(category === "outdoors" ? { difficulty: "easy", distance: null, elevationGain: null, estimatedHikingTime: null } : {}),
    rating: place.rating ?? null,
    petFriendly: defaults.petFriendly,
    kidFriendly: defaults.kidFriendly,
    libraryParkPass: defaults.libraryParkPass,
    entranceFee: null,
    petNotes: null,
    kidNotes: null,
    description,
    highlights: buildHighlights(place),
    bestSeason: "Year-round",
    parkingInfo: null,
    sourceUrl: place.googleMapsUri || null,
    category,
    image: DEFAULT_IMAGES[category],
    // Scoring fields intentionally omitted — enrich-spots.mjs will fill them.
  };
}

function buildLocation(place) {
  // Prefer short address ("123 Main St, Palo Alto") → trim to just locality.
  const short = place.shortFormattedAddress || place.formattedAddress || "";
  // Try to extract "City, ST" from address components.
  const comps = place.addressComponents || [];
  const city = comps.find((c) => c.types?.includes("locality"))?.shortText;
  const state = comps.find((c) => c.types?.includes("administrative_area_level_1"))?.shortText;
  if (city && state) return `${city}, ${state}`;
  // Fall back to last two comma-separated segments of the short address.
  const parts = short.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.slice(-2).join(", ");
  return short || "Unknown";
}

function inferRegion(place) {
  const comps = place.addressComponents || [];
  const admin = comps.find((c) => c.types?.includes("administrative_area_level_2"))?.longText;
  if (admin) {
    // "Santa Clara County" → "San Francisco Bay Area" heuristic
    if (/santa clara|san mateo|san francisco|alameda|contra costa|marin|napa|sonoma|solano/i.test(admin)) {
      return "San Francisco Bay Area";
    }
    return admin;
  }
  return "Unknown region";
}

function buildHighlights(place) {
  const highlights = [];
  if (place.primaryTypeDisplayName?.text) {
    highlights.push(place.primaryTypeDisplayName.text);
  }
  if (place.rating) {
    highlights.push(`${place.rating}★ on Google`);
  }
  return highlights.length > 0 ? highlights : ["Added from Google Places"];
}

function round5(n) {
  if (n == null) return null;
  return Math.round(n * 10000) / 10000;
}

// ─────────────────────────────────────────────
// DUPLICATE DETECTION
// ─────────────────────────────────────────────

/** Treat two spots as the same if they're within ~50m. */
const DUPE_EPSILON = 0.0005;

export function isDuplicate(newSpot, existingSpots) {
  return existingSpots.some(
    (s) =>
      s.name?.toLowerCase() === newSpot.name?.toLowerCase() &&
      typeof s.lat === "number" &&
      typeof s.lng === "number" &&
      Math.abs(s.lat - newSpot.lat) < DUPE_EPSILON &&
      Math.abs(s.lng - newSpot.lng) < DUPE_EPSILON
  );
}

// ─────────────────────────────────────────────
// SEED_VERSION BUMPING
// ─────────────────────────────────────────────

async function bumpSeedVersion() {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const here = path.dirname(fileURLToPath(import.meta.url));
  const target = path.resolve(here, "..", "src/hooks/useSpots.js");
  const src = fs.readFileSync(target, "utf-8");
  const match = src.match(/const SEED_VERSION\s*=\s*(\d+)/);
  if (!match) {
    console.warn(`⚠ couldn't find SEED_VERSION in ${target} — bump it manually`);
    return null;
  }
  const current = Number(match[1]);
  const bumped = current + 1;
  const updated = src.replace(
    /const SEED_VERSION\s*=\s*\d+/,
    `const SEED_VERSION = ${bumped}`
  );
  fs.writeFileSync(target, updated, "utf-8");
  return { from: current, to: bumped };
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

export { parseArgs, validate, CATEGORIES, CATEGORY_DEFAULTS, DEFAULT_IMAGES };

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const { error } = validate(args);
  if (error) {
    console.error(`✗ ${error}\n`);
    printHelp();
    process.exit(2);
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("✗ GOOGLE_PLACES_API_KEY not set. Add it to .env and try again.");
    console.error("  See script header for setup instructions.");
    process.exit(2);
  }

  // Build the text query.
  const query = args.place
    ? args.place
    : `${args.keyword} near ${args.near}`;
  const maxResults = args.place ? 1 : args.limit;

  console.log(`→ searching Places: "${query}" (max ${maxResults})`);
  const places = await placesTextSearch({ query, maxResults, apiKey });
  if (places.length === 0) {
    console.log("  (no results)");
    return;
  }
  console.log(`✓ ${places.length} result(s) from Places API\n`);

  // Load existing spots so we can assign IDs and detect duplicates.
  const { spots: existing, tail } = await loadSpotsFile();
  let nextId = Math.max(...existing.map((s) => Number(s.id) || 0)) + 1;

  const newSpots = [];
  const skipped = [];
  for (const place of places) {
    const candidate = placeToSpot(place, { id: nextId, category: args.category });
    if (isDuplicate(candidate, existing.concat(newSpots))) {
      skipped.push(`${candidate.name} (already in spots.js)`);
      continue;
    }
    newSpots.push(candidate);
    nextId += 1;
  }

  if (skipped.length > 0) {
    console.log("Skipped duplicates:");
    for (const s of skipped) console.log(`  • ${s}`);
    console.log();
  }

  if (newSpots.length === 0) {
    console.log("Nothing new to add.");
    return;
  }

  console.log(`Proposed ${newSpots.length} new spot(s):\n`);
  for (const s of newSpots) {
    console.log(spotToString(s) + ",");
  }
  console.log();

  if (!args.commit) {
    console.log("Dry run — nothing written. Re-run with --commit to append.");
    console.log("After committing, also run: npm run enrich:spots  # fills scoring fields");
    return;
  }

  // --commit path: append + write + bump SEED_VERSION
  const merged = existing.concat(newSpots);
  writeSpotsFile(merged, tail);
  const bump = await bumpSeedVersion();
  console.log(`✓ Wrote ${newSpots.length} new spot(s) to ${SPOTS_PATH}`);
  if (bump) {
    console.log(`✓ Bumped SEED_VERSION ${bump.from} → ${bump.to} in src/hooks/useSpots.js`);
  }
  console.log(`\nNext:`);
  console.log(`  1. npm run enrich:spots           # fill scoring fields for the new spots`);
  console.log(`  2. git diff src/data/spots.js     # review`);
  console.log(`  3. commit spots.js + useSpots.js together`);
}

// Only run main() when invoked directly (not when this module is imported
// by a test harness or another script).
import { fileURLToPath } from "node:url";
const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main().catch((err) => {
    console.error(`✗ ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  });
}
