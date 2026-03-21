/**
 * TodayCard.jsx
 * 
 * The "just go" screen for Stardust.
 * Shows one suggested spot based on time, recency, season, and mood.
 * Gentle rejection flow — never more than 3 taps before somewhere useful.
 * 
 * Also introduces the Stardust Memory model:
 * a small, personal memory you collect when you visit a place.
 */

import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────
// SCORING ENGINE
// ─────────────────────────────────────────────

const SEASONS = {
  0: "winter", 1: "winter",
  2: "spring", 3: "spring", 4: "spring",
  5: "summer", 6: "summer", 7: "summer",
  8: "fall",   9: "fall",  10: "fall",
  11: "winter"
};

const HOUR_VIBES = {
  morning:   [6, 11],   // 6am–11am
  midday:    [11, 14],  // 11am–2pm
  afternoon: [14, 17],  // 2pm–5pm
  evening:   [17, 21],  // 5pm–9pm
};

function getCurrentTimeOfDay() {
  const h = new Date().getHours();
  for (const [vibe, [start, end]] of Object.entries(HOUR_VIBES)) {
    if (h >= start && h < end) return vibe;
  }
  return "evening";
}

function getCurrentSeason() {
  return SEASONS[new Date().getMonth()];
}

function daysSince(timestamp) {
  if (!timestamp) return 999; // never visited — high recency score
  const ms = Date.now() - new Date(timestamp).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * scoreSpot — pure function, no side effects
 * Returns a number 0–100. Higher = show this spot today.
 */
export function scoreSpot(spot, { availableMinutes, mood, season, timeOfDay }) {
  let score = 0;

  // 1. TIME FIT (0–35 pts) — most important signal
  const duration = spot.estimatedDuration ?? 60;
  if (duration <= availableMinutes) {
    // fits comfortably — score by how well it uses the time
    const fit = 1 - Math.abs(duration - availableMinutes * 0.75) / availableMinutes;
    score += Math.round(fit * 35);
  } else {
    score -= 20; // over time budget — strong penalty
  }

  // 2. RECENCY (0–25 pts) — longer unvisited = higher score
  const days = daysSince(spot.lastVisited);
  if (days >= 30)      score += 25;
  else if (days >= 14) score += 18;
  else if (days >= 7)  score += 10;
  else if (days >= 3)  score += 4;
  else                 score -= 10; // just went — rest it

  // 3. STARRED BUT NEVER VISITED bonus (15 pts)
  if (spot.starred && spot.visitCount === 0) score += 15;

  // 4. SEASONAL FIT (0–10 pts)
  if (spot.bestSeasons?.includes(season)) score += 10;
  if (spot.shaded && season === "summer")  score += 8;

  // 5. TIME OF DAY FIT (0–8 pts)
  if (spot.bestTimeOfDay?.includes(timeOfDay)) score += 8;
  // cafes are great in morning/afternoon
  if (spot.category === "cafe" && ["morning", "afternoon"].includes(timeOfDay)) score += 5;
  // libraries shine in afternoon/evening
  if (spot.category === "library" && ["afternoon", "evening"].includes(timeOfDay)) score += 5;

  // 6. MOOD MATCH (0–7 pts)
  if (mood === "need quiet" && spot.vibes?.includes("quiet")) score += 7;
  if (mood === "open"       && spot.vibes?.includes("social")) score += 3;

  return Math.max(0, score);
}

/**
 * getSuggestions — returns spots ranked by score, best first
 */
export function getSuggestions(spots, context) {
  return [...spots]
    .map(spot => ({ spot, score: scoreSpot(spot, context) }))
    .sort((a, b) => b.score - a.score)
    .map(({ spot }) => spot);
}

// ─────────────────────────────────────────────
// STARDUST MEMORY MODEL
// ─────────────────────────────────────────────

/**
 * A Stardust is a tiny personal memory attached to a place.
 * Not a review. Not a rating. A feeling.
 * 
 * {
 *   id: string,
 *   spotId: string,
 *   spotName: string,
 *   date: ISO string,
 *   note: string,          // "found a snail, named it Gerald"
 *   withWho: string[],     // ["solo"] | ["kid"] | ["spouse"] | ["kid","spouse"]
 *   mood: string,          // how you felt leaving
 *   imageUrl?: string,     // optional photo
 *   tasteCard?: {          // for cafes — the physical card, digitized
 *     drink: string,
 *     flavors: string[],
 *     vibe: string,
 *   }
 * }
 */

export function createStardust({ spotId, spotName, note, withWho = ["solo"], mood = "", tasteCard = null }) {
  return {
    id: `sd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    spotId,
    spotName,
    date: new Date().toISOString(),
    note,
    withWho,
    mood,
    tasteCard,
    imageUrl: null,
  };
}

// ─────────────────────────────────────────────
// TIME OPTIONS
// ─────────────────────────────────────────────

const TIME_OPTIONS = [
  { label: "1 hour",    minutes: 60,  emoji: "⚡" },
  { label: "2 hours",   minutes: 120, emoji: "🌿" },
  { label: "Half day",  minutes: 240, emoji: "☀️" },
  { label: "All day",   minutes: 480, emoji: "🌄" },
];

const MOOD_OPTIONS = [
  { label: "Need quiet",    value: "need quiet", emoji: "🤫" },
  { label: "Open to anything", value: "open",   emoji: "✨" },
];

// ─────────────────────────────────────────────
// SAMPLE SPOTS (replace with your real spots.js data)
// ─────────────────────────────────────────────

const SAMPLE_SPOTS = [
  {
    id: "1", name: "Lands End Trail", category: "outdoors",
    location: "San Francisco", estimatedDuration: 90,
    shaded: false, bestSeasons: ["spring", "fall", "winter"],
    bestTimeOfDay: ["morning", "afternoon"],
    vibes: ["quiet", "restorative", "views"],
    image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80",
    description: "Rugged coastal trail with sweeping Golden Gate views.",
    petFriendly: true, kidFriendly: true,
    starred: true, visitCount: 3,
    lastVisited: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: "2", name: "Redwood Regional Park", category: "outdoors",
    location: "Oakland Hills", estimatedDuration: 120,
    shaded: true, bestSeasons: ["spring", "summer", "fall"],
    bestTimeOfDay: ["morning", "midday", "afternoon"],
    vibes: ["quiet", "focused", "restorative"],
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80",
    description: "Old-growth redwoods. Completely shaded. The best summer trail in the East Bay.",
    petFriendly: true, kidFriendly: true,
    starred: true, visitCount: 0,
    lastVisited: null,
  },
  {
    id: "3", name: "Linea Caffe", category: "cafe",
    location: "Mission, SF", estimatedDuration: 60,
    shaded: false, bestSeasons: ["spring", "fall", "winter"],
    bestTimeOfDay: ["morning", "afternoon"],
    vibes: ["quiet", "focused", "refined"],
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
    description: "Serious, quiet coffee. No laptops encouraged. Perfect for reading.",
    petFriendly: false, kidFriendly: false,
    starred: true, visitCount: 1,
    lastVisited: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: "4", name: "Oakland Public Library — Main", category: "library",
    location: "Downtown Oakland", estimatedDuration: 90,
    shaded: false, bestSeasons: ["spring", "summer", "fall", "winter"],
    bestTimeOfDay: ["afternoon", "evening"],
    vibes: ["quiet", "focused", "restorative"],
    image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&q=80",
    description: "Calm, light-filled. Bring your book or your laptop. Nobody bothers you.",
    petFriendly: false, kidFriendly: true,
    starred: false, visitCount: 2,
    lastVisited: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: "5", name: "Tilden Park — Meadow Trail", category: "outdoors",
    location: "Berkeley Hills", estimatedDuration: 75,
    shaded: true, bestSeasons: ["spring", "summer", "fall"],
    bestTimeOfDay: ["morning", "afternoon"],
    vibes: ["quiet", "restorative", "family"],
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
    description: "Gentle, shaded meadow loop. Kid and dog perfect.",
    petFriendly: true, kidFriendly: true,
    starred: true, visitCount: 5,
    lastVisited: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

// ─────────────────────────────────────────────
// CATEGORY CONFIG
// ─────────────────────────────────────────────

const CATEGORY_META = {
  outdoors: { emoji: "🌿", label: "Trail" },
  cafe:     { emoji: "☕", label: "Café" },
  library:  { emoji: "📚", label: "Library" },
  sports:   { emoji: "🏊", label: "Sports" },
  wellness: { emoji: "🧘", label: "Wellness" },
};

// ─────────────────────────────────────────────
// COLLECT STARDUST MODAL
// ─────────────────────────────────────────────

function CollectStardustModal({ spot, onSave, onClose }) {
  const [note, setNote] = useState("");
  const [withWho, setWithWho] = useState(["solo"]);
  const [mood, setMood] = useState("");
  const [tasteCard, setTasteCard] = useState(null);
  const [showTasteCard, setShowTasteCard] = useState(false);
  const [drink, setDrink] = useState("");
  const [flavors, setFlavors] = useState("");
  const [tasteVibe, setTasteVibe] = useState("");

  const WHO_OPTIONS = ["solo", "spouse", "kid", "friend"];
  const MOOD_LEAVING = ["restored", "peaceful", "energized", "grateful", "present"];

  function toggleWho(who) {
    setWithWho(prev =>
      prev.includes(who) ? prev.filter(w => w !== who) : [...prev, who]
    );
  }

  function handleSave() {
    const memory = createStardust({
      spotId: spot.id,
      spotName: spot.name,
      note,
      withWho,
      mood,
      tasteCard: showTasteCard && drink ? { drink, flavors: flavors.split(",").map(f => f.trim()), vibe: tasteVibe } : null,
    });
    onSave(memory);
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span style={styles.modalStar}>✦</span>
          <h2 style={styles.modalTitle}>Collect a Stardust</h2>
          <p style={styles.modalSubtitle}>{spot.name}</p>
        </div>

        <div style={styles.modalBody}>
          {/* Note */}
          <label style={styles.fieldLabel}>What happened here?</label>
          <textarea
            style={styles.textarea}
            placeholder="found a snail, named it Gerald…"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
          />

          {/* With who */}
          <label style={styles.fieldLabel}>You were with…</label>
          <div style={styles.chipRow}>
            {WHO_OPTIONS.map(who => (
              <button
                key={who}
                style={{
                  ...styles.chip,
                  ...(withWho.includes(who) ? styles.chipActive : {})
                }}
                onClick={() => toggleWho(who)}
              >
                {who}
              </button>
            ))}
          </div>

          {/* Mood leaving */}
          <label style={styles.fieldLabel}>You left feeling…</label>
          <div style={styles.chipRow}>
            {MOOD_LEAVING.map(m => (
              <button
                key={m}
                style={{
                  ...styles.chip,
                  ...(mood === m ? styles.chipActive : {})
                }}
                onClick={() => setMood(m)}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Taste card — cafes only */}
          {spot.category === "cafe" && (
            <div>
              <button
                style={styles.tasteCardToggle}
                onClick={() => setShowTasteCard(v => !v)}
              >
                ☕ {showTasteCard ? "Hide taste card" : "Add a taste card"}
              </button>
              {showTasteCard && (
                <div style={styles.tasteCardFields}>
                  <input style={styles.input} placeholder="What did you order?" value={drink} onChange={e => setDrink(e.target.value)} />
                  <input style={styles.input} placeholder="Flavors (e.g. nutty, citrus, floral)" value={flavors} onChange={e => setFlavors(e.target.value)} />
                  <input style={styles.input} placeholder="Vibe in one word (e.g. grounding)" value={tasteVibe} onChange={e => setTasteVibe(e.target.value)} />
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.modalActions}>
          <button style={{ ...styles.btnGhost, width: "auto", flex: 1 }} onClick={onClose}>Skip for now</button>
          <button style={styles.btnPrimary} onClick={handleSave}>✦ Save memory</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TODAY CARD — MAIN COMPONENT
// ─────────────────────────────────────────────

export default function TodayCard({ spots = SAMPLE_SPOTS, memories = [], onMemoryAdd }) {
  const [step, setStep] = useState("setup"); // setup | card | going | collect | done
  const [availableMinutes, setAvailableMinutes] = useState(120);
  const [mood, setMood] = useState("open");
  const [suggestions, setSuggestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rejections, setRejections] = useState(0);
  const [collecting, setCollecting] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [animating, setAnimating] = useState(false);

  const season = getCurrentSeason();
  const timeOfDay = getCurrentTimeOfDay();
  const spot = suggestions[currentIndex] ?? null;

  function buildSuggestions() {
    const ranked = getSuggestions(spots, { availableMinutes, mood, season, timeOfDay });
    setSuggestions(ranked);
    setCurrentIndex(0);
    setRejections(0);
    setStep("card");
  }

  function handleReject() {
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      const next = currentIndex + 1;
      setRejections(r => r + 1);
      if (next >= suggestions.length) {
        setCurrentIndex(0); // wrap around
      } else {
        setCurrentIndex(next);
      }
    }, 300);
  }

  function handleGo() {
    setStep("going");
  }

  function handleCollect(memory) {
    if (onMemoryAdd) onMemoryAdd(memory);
    setCollecting(false);
    setStep("done");
  }

  function handleReset() {
    setStep("setup");
    setCurrentIndex(0);
    setRejections(0);
  }

  const meta = spot ? (CATEGORY_META[spot.category] ?? { emoji: "📍", label: "Place" }) : null;

  // ── SETUP SCREEN ──
  if (step === "setup") {
    return (
      <div style={styles.root}>
        <div style={styles.setupCard}>
          <div style={styles.logoMark}>✦</div>
          <h1 style={styles.appName}>stardust</h1>
          <p style={styles.setupPrompt}>How much time do you have?</p>
          <div style={styles.timeGrid}>
            {TIME_OPTIONS.map(opt => (
              <button
                key={opt.minutes}
                style={{
                  ...styles.timeBtn,
                  ...(availableMinutes === opt.minutes ? styles.timeBtnActive : {})
                }}
                onClick={() => setAvailableMinutes(opt.minutes)}
              >
                <span style={styles.timeEmoji}>{opt.emoji}</span>
                <span style={styles.timeLabel}>{opt.label}</span>
              </button>
            ))}
          </div>

          <p style={{ ...styles.setupPrompt, marginTop: 16 }}>How are you feeling?</p>
          <div style={styles.moodRow}>
            {MOOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                style={{
                  ...styles.moodBtn,
                  ...(mood === opt.value ? styles.moodBtnActive : {})
                }}
                onClick={() => setMood(opt.value)}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>

          <button style={styles.btnGo} onClick={buildSuggestions}>
            Show me somewhere →
          </button>

          {memories.length > 0 && (
            <button style={styles.btnGhost} onClick={() => setShowMemories(v => !v)}>
              ✦ {memories.length} stardust collected
            </button>
          )}

          {showMemories && (
            <div style={styles.memoriesList}>
              {memories.map(m => (
                <div key={m.id} style={styles.memoryItem}>
                  <div style={styles.memoryName}>{m.spotName}</div>
                  <div style={styles.memoryNote}>{m.note || "—"}</div>
                  {m.tasteCard && (
                    <div style={styles.tasteCardPreview}>
                      ☕ {m.tasteCard.drink} · {m.tasteCard.flavors.join(", ")}
                    </div>
                  )}
                  <div style={styles.memoryMeta}>
                    with {m.withWho.join(", ")} · left feeling {m.mood}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── CARD SCREEN ──
  if (step === "card" && spot) {
    return (
      <div style={styles.root}>
        <div style={{
          ...styles.spotCard,
          opacity: animating ? 0 : 1,
          transform: animating ? "translateY(12px)" : "translateY(0)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
        }}>
          {/* Hero image */}
          <div style={styles.imageWrap}>
            <img src={spot.image} alt={spot.name} style={styles.heroImg} />
            <div style={styles.imageOverlay} />
            <div style={styles.categoryBadge}>
              {meta.emoji} {meta.label}
            </div>
            <button style={styles.backBtn} onClick={handleReset}>←</button>
          </div>

          {/* Content */}
          <div style={styles.spotContent}>
            <h2 style={styles.spotName}>{spot.name}</h2>
            <p style={styles.spotLocation}>{spot.location}</p>
            <p style={styles.spotDesc}>{spot.description}</p>

            <div style={styles.spotMeta}>
              <span style={styles.metaTag}>~{spot.estimatedDuration} min</span>
              {spot.shaded && <span style={styles.metaTag}>🌲 shaded</span>}
              {spot.petFriendly && <span style={styles.metaTag}>🐾 pet friendly</span>}
              {spot.kidFriendly && <span style={styles.metaTag}>👶 kid friendly</span>}
            </div>

            {spot.starred && spot.visitCount === 0 && (
              <p style={styles.neverVisited}>✦ You starred this but never went. Today?</p>
            )}

            {/* Actions */}
            <div style={styles.cardActions}>
              <button style={styles.btnReject} onClick={handleReject}>
                not today
              </button>
              <button style={styles.btnPrimary} onClick={handleGo}>
                Let's go ✦
              </button>
            </div>

            {rejections >= 2 && (
              <p style={styles.softPrompt}>
                Want something closer? Try adjusting your time above.{" "}
                <button style={styles.inlineLink} onClick={handleReset}>Start over</button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── GOING SCREEN ──
  if (step === "going" && spot) {
    return (
      <div style={styles.root}>
        <div style={styles.goingCard}>
          <div style={styles.goingEmoji}>✦</div>
          <h2 style={styles.goingTitle}>Have a beautiful time</h2>
          <p style={styles.goingPlace}>{spot.name}</p>
          <p style={styles.goingHint}>When you're back, collect your stardust.</p>

          <a
            href={`https://maps.google.com/?q=${spot.lat ?? ""},${spot.lng ?? ""}&query=${encodeURIComponent(spot.name)}`}
            target="_blank"
            rel="noreferrer"
            style={styles.btnPrimary}
          >
            Open in Maps →
          </a>

          <button style={styles.btnGhost} onClick={() => setCollecting(true)}>
            ✦ I'm back — collect memory
          </button>

          <button style={styles.inlineLink} onClick={handleReset}>
            Start over
          </button>
        </div>

        {collecting && (
          <CollectStardustModal
            spot={spot}
            onSave={handleCollect}
            onClose={() => setCollecting(false)}
          />
        )}
      </div>
    );
  }

  // ── DONE SCREEN ──
  if (step === "done") {
    const latest = memories[0];
    return (
      <div style={styles.root}>
        <div style={styles.doneCard}>
          <div style={styles.doneStars}>✦ ✦ ✦</div>
          <h2 style={styles.doneTitle}>Stardust collected</h2>
          {latest && (
            <div style={styles.memoryCard}>
              <p style={styles.memoryCardPlace}>{latest.spotName}</p>
              {latest.note && <p style={styles.memoryCardNote}>"{latest.note}"</p>}
              {latest.tasteCard && (
                <div style={styles.tasteCardPreview}>
                  ☕ {latest.tasteCard.drink}
                  {latest.tasteCard.flavors.length > 0 && ` · ${latest.tasteCard.flavors.join(", ")}`}
                </div>
              )}
              <p style={styles.memoryCardMeta}>
                with {latest.withWho.join(", ")}
                {latest.mood ? ` · left feeling ${latest.mood}` : ""}
              </p>
            </div>
          )}
          <p style={styles.doneCount}>
            {memories.length} {memories.length === 1 ? "memory" : "memories"} in your collection
          </p>
          <button style={styles.btnGo} onClick={handleReset}>
            Find another place →
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// DESIGN SYSTEM — matches existing app (index.css + App.css)
// Light background, warm terra-cotta accents, Apple system font
// ─────────────────────────────────────────────

const COLORS = {
  bg:         "#faf8f5",       // warm off-white page background
  surface:    "#ffffff",       // card surfaces
  surfaceAlt: "#f5f2ee",       // input backgrounds, alt surfaces
  border:     "#e8e0d8",       // soft warm border
  borderFocus:"#c2703e",       // accent on focus
  accent:     "#c2703e",       // primary terra-cotta (--accent in index.css)
  accentDeep: "#a85e32",       // hover / pressed
  accentSoft: "#f0e4d8",       // accent tint for chips, badges
  orange:     "#d4872e",       // secondary warm orange
  text:       "#2c2420",       // near-black warm text
  textMuted:  "#7a6a5e",       // secondary text
  textDim:    "#b0a090",       // tertiary / placeholder
  shadow:     "rgba(44,36,32,0.08)",
  shadowMd:   "rgba(44,36,32,0.13)",
};

const FONT = `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif`;

const styles = {
  root: {
    minHeight: "calc(100vh - 140px)",
    backgroundColor: COLORS.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONT,
    padding: "12px 16px",
  },

  // ── Setup ──
  setupCard: {
    width: "100%",
    maxWidth: 400,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  logoMark: {
    fontSize: 28,
    color: COLORS.accent,
    marginBottom: 2,
    letterSpacing: 2,
  },
  appName: {
    fontSize: 26,
    fontWeight: 600,
    color: COLORS.text,
    letterSpacing: "0.04em",
    margin: 0,
    marginBottom: 16,
  },
  setupPrompt: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: "0.09em",
    textTransform: "uppercase",
    fontWeight: 600,
    margin: "0 0 10px 0",
    alignSelf: "flex-start",
  },
  timeGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    width: "100%",
  },
  timeBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "14px 12px",
    background: COLORS.surface,
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 14,
    cursor: "pointer",
    transition: "all 0.15s ease",
    gap: 4,
    boxShadow: `0 1px 3px ${COLORS.shadow}`,
  },
  timeBtnActive: {
    borderColor: COLORS.accent,
    background: COLORS.accentSoft,
    boxShadow: `0 1px 3px ${COLORS.shadow}`,
  },
  timeEmoji: { fontSize: 20 },
  timeLabel: { fontSize: 13, color: COLORS.text, fontFamily: FONT, fontWeight: 500 },

  moodRow: {
    display: "flex",
    gap: 8,
    width: "100%",
  },
  moodBtn: {
    flex: 1,
    padding: "12px 8px",
    background: COLORS.surface,
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 14,
    cursor: "pointer",
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONT,
    fontWeight: 500,
    transition: "all 0.15s ease",
    boxShadow: `0 1px 3px ${COLORS.shadow}`,
  },
  moodBtnActive: {
    borderColor: COLORS.accent,
    color: COLORS.accent,
    background: COLORS.accentSoft,
  },

  btnGo: {
    marginTop: 16,
    width: "100%",
    padding: "15px 24px",
    background: COLORS.accent,
    color: "#fff",
    border: "none",
    borderRadius: 14,
    fontSize: 15,
    fontFamily: FONT,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.02em",
    boxShadow: `0 2px 8px ${COLORS.shadowMd}`,
  },

  // ── Spot Card ──
  spotCard: {
    width: "100%",
    maxWidth: 420,
    background: COLORS.surface,
    borderRadius: 20,
    overflow: "hidden",
    border: `1px solid ${COLORS.border}`,
    boxShadow: `0 4px 20px ${COLORS.shadow}`,
  },
  imageWrap: {
    position: "relative",
    height: 180,
    overflow: "hidden",
  },
  heroImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  imageOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to bottom, transparent 45%, rgba(250,248,245,0.6) 100%)",
  },
  categoryBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(8px)",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 20,
    padding: "5px 12px",
    fontSize: 12,
    color: COLORS.text,
    fontWeight: 500,
    fontFamily: FONT,
    letterSpacing: "0.03em",
  },
  backBtn: {
    position: "absolute",
    top: 14,
    left: 14,
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(8px)",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 20,
    padding: "5px 12px",
    fontSize: 14,
    color: COLORS.textMuted,
    cursor: "pointer",
    fontFamily: FONT,
  },
  spotContent: {
    padding: "20px 20px 24px",
  },
  spotName: {
    fontSize: 21,
    fontWeight: 600,
    color: COLORS.text,
    margin: "0 0 4px 0",
    letterSpacing: "-0.01em",
  },
  spotLocation: {
    fontSize: 13,
    color: COLORS.textMuted,
    margin: "0 0 12px 0",
    fontWeight: 400,
  },
  spotDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 1.6,
    margin: "0 0 14px 0",
  },
  spotMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  metaTag: {
    fontSize: 12,
    color: COLORS.textMuted,
    background: COLORS.surfaceAlt,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "4px 9px",
    fontWeight: 500,
  },
  neverVisited: {
    fontSize: 12,
    color: COLORS.accent,
    margin: "0 0 16px 0",
    fontWeight: 500,
  },
  cardActions: {
    display: "flex",
    gap: 10,
    marginTop: 8,
  },
  btnReject: {
    flex: 1,
    padding: "13px 16px",
    background: "transparent",
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 12,
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONT,
    fontWeight: 500,
    cursor: "pointer",
  },
  btnPrimary: {
    flex: 2,
    padding: "13px 16px",
    background: COLORS.accent,
    border: "none",
    borderRadius: 12,
    color: "#fff",
    fontSize: 14,
    fontFamily: FONT,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.02em",
    textDecoration: "none",
    textAlign: "center",
    display: "inline-block",
    boxShadow: `0 2px 6px ${COLORS.shadowMd}`,
  },
  softPrompt: {
    fontSize: 12,
    color: COLORS.textDim,
    marginTop: 14,
    textAlign: "center",
    lineHeight: 1.5,
  },
  inlineLink: {
    background: "none",
    border: "none",
    color: COLORS.accent,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: FONT,
    padding: 0,
    textDecoration: "underline",
  },

  // ── Going ──
  goingCard: {
    maxWidth: 360,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  goingEmoji: {
    fontSize: 44,
    color: COLORS.accent,
    marginBottom: 4,
    letterSpacing: 4,
  },
  goingTitle: {
    fontSize: 22,
    fontWeight: 600,
    color: COLORS.text,
    margin: 0,
  },
  goingPlace: {
    fontSize: 16,
    color: COLORS.textMuted,
    margin: 0,
  },
  goingHint: {
    fontSize: 13,
    color: COLORS.textDim,
    margin: "0 0 8px 0",
  },
  btnGhost: {
    background: "transparent",
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 12,
    color: COLORS.textMuted,
    padding: "12px 20px",
    fontSize: 13,
    fontFamily: FONT,
    fontWeight: 500,
    cursor: "pointer",
    width: "100%",
    maxWidth: 280,
  },

  // ── Collect modal ──
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(44,36,32,0.4)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 100,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    background: COLORS.surface,
    borderRadius: "20px 20px 0 0",
    border: `1px solid ${COLORS.border}`,
    borderBottom: "none",
    padding: "24px 20px 40px",
    maxHeight: "85vh",
    overflowY: "auto",
    boxShadow: `0 -4px 24px ${COLORS.shadow}`,
  },
  modalHeader: {
    textAlign: "center",
    marginBottom: 24,
  },
  modalStar: {
    display: "block",
    fontSize: 22,
    color: COLORS.accent,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: 600,
    color: COLORS.text,
    margin: "0 0 4px 0",
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    margin: 0,
  },
  modalBody: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  modalActions: {
    display: "flex",
    gap: 10,
    marginTop: 24,
    alignItems: "stretch",
  },
  fieldLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontWeight: 600,
    marginBottom: 6,
    display: "block",
  },
  textarea: {
    width: "100%",
    background: COLORS.surfaceAlt,
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: "12px 14px",
    color: COLORS.text,
    fontFamily: FONT,
    fontSize: 14,
    lineHeight: 1.5,
    resize: "none",
    boxSizing: "border-box",
  },
  input: {
    width: "100%",
    background: COLORS.surfaceAlt,
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: "11px 14px",
    color: COLORS.text,
    fontFamily: FONT,
    fontSize: 14,
    boxSizing: "border-box",
    marginBottom: 8,
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    padding: "7px 14px",
    background: COLORS.surfaceAlt,
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 20,
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: FONT,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  chipActive: {
    borderColor: COLORS.accent,
    color: COLORS.accent,
    background: COLORS.accentSoft,
  },
  tasteCardToggle: {
    background: "none",
    border: `1.5px dashed ${COLORS.border}`,
    borderRadius: 10,
    color: COLORS.textMuted,
    padding: "10px 16px",
    fontSize: 13,
    fontFamily: FONT,
    fontWeight: 500,
    cursor: "pointer",
    width: "100%",
  },
  tasteCardFields: {
    marginTop: 12,
  },

  // ── Done ──
  doneCard: {
    maxWidth: 360,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  doneStars: {
    fontSize: 22,
    color: COLORS.accent,
    letterSpacing: 8,
    marginBottom: 4,
  },
  doneTitle: {
    fontSize: 22,
    fontWeight: 600,
    color: COLORS.text,
    margin: 0,
  },
  memoryCard: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: "16px 20px",
    width: "100%",
    textAlign: "left",
    boxShadow: `0 2px 8px ${COLORS.shadow}`,
  },
  memoryCardPlace: {
    fontSize: 15,
    color: COLORS.text,
    margin: "0 0 6px 0",
    fontWeight: 600,
  },
  memoryCardNote: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: "italic",
    margin: "0 0 8px 0",
    lineHeight: 1.5,
  },
  memoryCardMeta: {
    fontSize: 11,
    color: COLORS.textDim,
    letterSpacing: "0.03em",
    margin: 0,
  },
  doneCount: {
    fontSize: 12,
    color: COLORS.textDim,
    margin: 0,
    letterSpacing: "0.04em",
  },

  // ── Memory list ──
  memoriesList: {
    width: "100%",
    marginTop: 8,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  memoryItem: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
    padding: "12px 14px",
    textAlign: "left",
    boxShadow: `0 1px 4px ${COLORS.shadow}`,
  },
  memoryName: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: 600,
    marginBottom: 4,
  },
  memoryNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginBottom: 4,
    lineHeight: 1.4,
  },
  memoryMeta: {
    fontSize: 11,
    color: COLORS.textDim,
    letterSpacing: "0.02em",
  },
  tasteCardPreview: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: 500,
    marginBottom: 4,
  },
};
