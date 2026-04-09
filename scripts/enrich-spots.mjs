#!/usr/bin/env node

/**
 * Enrich src/data/spots.js with scoring engine fields consumed by the
 * TodayCard scoring engine:
 *   - estimatedDuration  (minutes)
 *   - bestSeasons        (array: spring|summer|fall|winter)
 *   - shaded             (boolean — indoor or forested)
 *   - bestTimeOfDay      (array: morning|midday|afternoon|evening)
 *   - vibes              (array: quiet|restorative|energized|focused|social|family)
 *
 * Idempotent: re-running produces a stable file (values are derived
 * deterministically from category/difficulty/description, so re-enriching an
 * already-enriched spot just overwrites with the same values).
 *
 * After running:
 *   1. git diff src/data/spots.js           # review changes
 *   2. bump SEED_VERSION in src/hooks/useSpots.js
 *   3. commit together so Firestore re-seeds on next login
 *
 * Usage:
 *   npm run enrich:spots
 *   # or: node scripts/enrich-spots.mjs
 */

import { loadSpotsFile, writeSpotsFile, SPOTS_PATH } from "./lib/spots-file.mjs";

const { spots: SAMPLE_SPOTS, tail } = await loadSpotsFile();

console.log(`Loaded ${SAMPLE_SPOTS.length} spots`);

/**
 * Parse bestSeason string into array of seasons
 */
function parseBestSeasons(bestSeasonStr, description, category) {
  const desc = (description || "").toLowerCase();
  const seasons = new Set();

  if (!bestSeasonStr) {
    return ["spring", "summer", "fall", "winter"];
  }

  const s = bestSeasonStr.toLowerCase();

  // Handle "Year-round"
  if (s.includes("year-round")) {
    return ["spring", "summer", "fall", "winter"];
  }

  // Parse individual seasons
  if (
    s.includes("spring") ||
    s.includes("wildflower") ||
    s.includes("bloom")
  ) {
    seasons.add("spring");
  }
  if (s.includes("summer")) {
    seasons.add("summer");
  }
  if (s.includes("fall") || s.includes("autumn")) {
    seasons.add("fall");
  }
  if (s.includes("winter")) {
    seasons.add("winter");
  }

  // Indoor spots and cafes are year-round good
  if (category === "cafe" || category === "library" || category === "sports") {
    return ["spring", "summer", "fall", "winter"];
  }

  // If empty, use smart defaults
  if (seasons.size === 0) {
    return ["spring", "summer", "fall"];
  }

  // For shaded trails/redwoods, summer is also good
  if ((desc.includes("redwood") || desc.includes("shade") || desc.includes("forest")) && !seasons.has("summer")) {
    seasons.add("summer");
  }

  return Array.from(seasons).sort((a, b) => {
    const order = { spring: 0, summer: 1, fall: 2, winter: 3 };
    return order[a] - order[b];
  });
}

/**
 * Determine estimated duration in minutes
 */
function estimateDuration(spot) {
  const { category, difficulty, estimatedHikingTime, description } =
    spot;
  const desc = (description || "").toLowerCase();

  if (category === "outdoors") {
    if (estimatedHikingTime) {
      return estimatedHikingTime;
    }
    // Estimate based on difficulty
    switch (difficulty) {
      case "easy":
        return 60;
      case "moderate":
        return 100; // Middle of 90-120
      case "hard":
        return 180; // Middle of 150-240
      default:
        return 60;
    }
  }

  if (category === "cafe") {
    // Bubble tea places: 30, others: 45-60
    if (desc.includes("bubble") || desc.includes("tea")) {
      return 30;
    }
    if (desc.includes("boba")) {
      return 30;
    }
    return 50; // Middle of 45-60
  }

  if (category === "library") {
    return 90; // Middle of 60-120
  }

  if (category === "sports") {
    return 105; // Middle of 90-120
  }

  return 60;
}

/**
 * Determine if spot is shaded/indoor
 */
function isShaded(spot) {
  const { category, description } = spot;
  const desc = (description || "").toLowerCase();

  if (
    category === "cafe" ||
    category === "library" ||
    category === "sports"
  ) {
    return true;
  }

  if (category === "outdoors") {
    // Check for forest/redwood/shade indicators
    if (
      desc.includes("redwood") ||
      desc.includes("forest") ||
      desc.includes("canopy") ||
      desc.includes("shade") ||
      desc.includes("grove")
    ) {
      return true;
    }
    // Check for exposed/sunny indicators
    if (
      desc.includes("exposed") ||
      desc.includes("summit") ||
      desc.includes("peak") ||
      desc.includes("coastal")
    ) {
      return false;
    }
    // Default: assume some shade for nature
    return true;
  }

  return false;
}

/**
 * Determine best times of day
 */
function determineBestTimeOfDay(spot) {
  const { category, difficulty, description } = spot;
  const desc = (description || "").toLowerCase();

  if (category === "outdoors") {
    // Hard hikes: morning only (early start)
    if (difficulty === "hard") {
      return ["morning"];
    }
    // Most outdoor: morning and afternoon (avoid midday heat)
    return ["morning", "afternoon"];
  }

  if (category === "cafe") {
    return ["morning", "afternoon"];
  }

  if (category === "library") {
    return ["afternoon", "evening"];
  }

  if (category === "sports") {
    return ["morning", "midday", "afternoon"];
  }

  return ["morning", "afternoon"];
}

/**
 * Determine vibes
 */
function determineVibes(spot) {
  const { category, description, name } = spot;
  const desc = (description || "").toLowerCase();
  const nm = (name || "").toLowerCase();
  const vibes = [];

  if (category === "outdoors") {
    // Nature spots are quiet and restorative
    vibes.push("quiet", "restorative");

    // Hard hikes are energized
    if (spot.difficulty === "hard") {
      vibes.pop(); // Remove one if we have 2
      vibes.push("energized");
    }

    // Popular family spots
    if (
      spot.kidFriendly &&
      (desc.includes("family") || desc.includes("beach"))
    ) {
      vibes.push("family");
    }

    return Array.from(new Set(vibes)).slice(0, 3);
  }

  if (category === "cafe") {
    vibes.push("focused");

    // Quiet cafes
    if (
      desc.includes("quiet") ||
      nm.includes("quiet") ||
      nm.includes("library")
    ) {
      vibes.push("quiet");
    } else {
      // Social/busy cafes
      vibes.push("social");
    }

    return vibes.slice(0, 3);
  }

  if (category === "library") {
    return ["quiet", "focused", "restorative"];
  }

  if (category === "sports") {
    return ["energized", "social"];
  }

  return ["focused"];
}

/**
 * Enrich a single spot
 */
function enrichSpot(spot) {
  const enriched = { ...spot };

  enriched.estimatedDuration = estimateDuration(spot);
  enriched.bestSeasons = parseBestSeasons(
    spot.bestSeason,
    spot.description,
    spot.category
  );
  enriched.shaded = isShaded(spot);
  enriched.bestTimeOfDay = determineBestTimeOfDay(spot);
  enriched.vibes = determineVibes(spot);

  return enriched;
}

// Enrich all spots
const enrichedSpots = SAMPLE_SPOTS.map((spot, idx) => {
  const enriched = enrichSpot(spot);
  if ((idx + 1) % 10 === 0) {
    console.log(`✓ Enriched spot ${idx + 1}/${SAMPLE_SPOTS.length}`);
  }
  return enriched;
});

writeSpotsFile(enrichedSpots, tail);

console.log(`\nSuccessfully enriched and wrote ${enrichedSpots.length} spots`);
console.log(`Wrote to: ${SPOTS_PATH}`);
console.log(`\nNext steps:`);
console.log(`  1. git diff src/data/spots.js            # review`);
console.log(`  2. bump SEED_VERSION in src/hooks/useSpots.js`);
console.log(`  3. commit both files together`);
