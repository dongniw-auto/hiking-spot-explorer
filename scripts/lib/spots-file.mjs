/**
 * scripts/lib/spots-file.mjs
 *
 * Shared helpers for reading/writing src/data/spots.js.
 * Used by enrich-spots.mjs and add-spots.mjs so they produce byte-identical
 * output (and only diff on the spots they actually change).
 *
 * The file layout is:
 *
 *   export const SAMPLE_SPOTS = [ ... ]
 *   export const PACK_LIST_TEMPLATES = { ... }
 *
 * We re-serialize SAMPLE_SPOTS deterministically and preserve everything
 * from `export const PACK_LIST_TEMPLATES` onward byte-for-byte.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/lib → scripts → repo root
export const REPO_ROOT = path.resolve(__dirname, "..", "..");
export const SPOTS_PATH = path.join(REPO_ROOT, "src/data/spots.js");

/**
 * Load the current spots.js state:
 *   - spots: SAMPLE_SPOTS array (live objects, import cache-busted)
 *   - tail: the "export const PACK_LIST_TEMPLATES ..." section as raw text
 */
export async function loadSpotsFile() {
  const fileContent = fs.readFileSync(SPOTS_PATH, "utf-8");
  // Cache-bust the dynamic import so repeated calls in a single process
  // (tests, watch mode) see fresh data.
  const importUrl = new URL(`../../src/data/spots.js?t=${Date.now()}`, import.meta.url).href;
  const mod = await import(importUrl);
  const tailIdx = fileContent.indexOf("export const PACK_LIST_TEMPLATES");
  if (tailIdx === -1) {
    throw new Error("spots.js missing PACK_LIST_TEMPLATES export — refusing to rewrite");
  }
  return {
    spots: mod.SAMPLE_SPOTS,
    tail: fileContent.substring(tailIdx),
  };
}

/**
 * Write a new spots.js from a spots array and a preserved tail string.
 * Deterministic: repeat calls with identical input produce identical output.
 */
export function writeSpotsFile(spots, tail) {
  const body = [
    "export const SAMPLE_SPOTS = [",
    spots.map((s, i) => spotToString(s) + (i < spots.length - 1 ? "," : "")).join("\n"),
    "]",
    "",
    tail,
  ].join("\n");
  fs.writeFileSync(SPOTS_PATH, body, "utf-8");
}

/**
 * Serialize one spot as a pretty JS object literal matching the style
 * already in spots.js — 2-space indent, keys unquoted, trailing-comma-free.
 *
 * Field order follows whatever Object.keys() returns for the given object.
 * Both scripts feed us objects built from spread + new fields, which keeps
 * existing field order stable and appends new fields at the end.
 */
export function spotToString(spot) {
  const lines = ["  {"];
  const keys = Object.keys(spot);
  keys.forEach((key, idx) => {
    const value = spot[key];
    const valueStr = formatValue(key, value);
    const comma = idx === keys.length - 1 ? "" : ",";
    lines.push(`    ${key}: ${valueStr}${comma}`);
  });
  lines.push("  }");
  return lines.join("\n");
}

/** Format a single value — arrays of strings go on one line, objects are JSON-ified. */
function formatValue(key, value) {
  if (value === null) return "null";
  if (value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    // Short string arrays on one line — highlights, bestSeasons, bestTimeOfDay, vibes
    return `[${value.map((v) => JSON.stringify(v)).join(", ")}]`;
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
