#!/usr/bin/env node

/**
 * scripts/sync-spots-to-firestore.mjs
 *
 * One-off sync: reads SAMPLE_SPOTS from src/data/spots.js and writes them
 * all to Firestore's `spots` collection, replacing whatever is there.
 *
 * This is the lightweight stopgap for issue #23 (replace client-side
 * seeding with admin sync script). Uses the Firebase *client* SDK — the
 * same `firebase` package the app already uses — so no service account
 * key needed. Reads VITE_FIREBASE_* config from .env.
 *
 * Usage:
 *   node --env-file=.env scripts/sync-spots-to-firestore.mjs
 *   node --env-file=.env scripts/sync-spots-to-firestore.mjs --dry-run
 *
 * Behaviour:
 *   - Reads all docs currently in `spots` (except _meta)
 *   - For each SAMPLE_SPOT: set (idempotent)
 *   - For each existing Firestore doc not in SAMPLE_SPOTS: delete
 *   - Updates _meta.version to match SEED_VERSION from useSpots.js
 *
 * If Firestore rules block unauth writes, the script tries to sign in
 * anonymously as a fallback.
 */

import process from "node:process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

import { loadSpotsFile, REPO_ROOT } from "./lib/spots-file.mjs";

// ─────────────────────────────────────────────
// ARGS
// ─────────────────────────────────────────────
const DRY_RUN = process.argv.includes("--dry-run");

// ─────────────────────────────────────────────
// CONFIG FROM ENV
// ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("✗ Missing VITE_FIREBASE_API_KEY or VITE_FIREBASE_PROJECT_ID in .env");
  console.error("  Run with: node --env-file=.env scripts/sync-spots-to-firestore.mjs");
  process.exit(1);
}

// ─────────────────────────────────────────────
// READ SEED_VERSION from useSpots.js
// ─────────────────────────────────────────────
function readSeedVersion() {
  const useSpotsPath = path.join(REPO_ROOT, "src/hooks/useSpots.js");
  const src = readFileSync(useSpotsPath, "utf-8");
  const m = src.match(/const\s+SEED_VERSION\s*=\s*(\d+)/);
  if (!m) throw new Error("Could not find SEED_VERSION in useSpots.js");
  return Number(m[1]);
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  const { spots: sampleSpots } = await loadSpotsFile();
  const seedVersion = readSeedVersion();

  console.log(`Loaded ${sampleSpots.length} spots from src/data/spots.js`);
  console.log(`SEED_VERSION = ${seedVersion}`);
  console.log(`Project      = ${firebaseConfig.projectId}`);
  if (DRY_RUN) console.log("(DRY RUN — no writes)");
  console.log();

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Fetch existing Firestore spots
  let existingDocs;
  try {
    existingDocs = await getDocs(collection(db, "spots"));
  } catch (err) {
    if (err.code === "permission-denied") {
      console.log("Read permission denied — trying anonymous auth...");
      const auth = getAuth(app);
      await signInAnonymously(auth);
      existingDocs = await getDocs(collection(db, "spots"));
    } else {
      throw err;
    }
  }

  const existingIds = new Set();
  existingDocs.forEach((d) => {
    if (d.id !== "_meta") existingIds.add(d.id);
  });

  const sampleIds = new Set(sampleSpots.map((s) => String(s.id)));
  const toDelete = [...existingIds].filter((id) => !sampleIds.has(id));

  console.log(`Firestore currently has ${existingIds.size} spots + _meta doc`);
  console.log(`Will set    : ${sampleSpots.length}`);
  console.log(`Will delete : ${toDelete.length}${toDelete.length ? ` (${toDelete.join(", ")})` : ""}`);
  console.log();

  if (DRY_RUN) {
    console.log("Dry run — exiting without writes.");
    return;
  }

  // Firestore writeBatch supports up to 500 ops per batch
  const BATCH_LIMIT = 500;
  const allOps = [
    ...sampleSpots.map((s) => ({ type: "set", id: String(s.id), data: s })),
    ...toDelete.map((id) => ({ type: "delete", id })),
    { type: "set", id: "_meta", data: { version: seedVersion } },
  ];

  let batchCount = 0;
  for (let i = 0; i < allOps.length; i += BATCH_LIMIT) {
    const chunk = allOps.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const op of chunk) {
      const ref = doc(db, "spots", op.id);
      if (op.type === "set") batch.set(ref, op.data);
      else batch.delete(ref);
    }
    try {
      await batch.commit();
    } catch (err) {
      if (err.code === "permission-denied") {
        console.log("Write permission denied — trying anonymous auth...");
        const auth = getAuth(app);
        await signInAnonymously(auth);
        await batch.commit();
      } else {
        throw err;
      }
    }
    batchCount++;
  }

  console.log(`✓ Committed ${allOps.length} ops in ${batchCount} batch(es)`);
  console.log(`✓ Firestore now has ${sampleSpots.length} spots + _meta v${seedVersion}`);
}

main().catch((err) => {
  console.error("✗ Sync failed:", err.message || err);
  if (err.code) console.error("  code:", err.code);
  process.exit(1);
});
