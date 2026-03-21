/**
 * MemoriesView.jsx
 * Displays all collected stardust memories.
 */

const FONT = `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif`;

const COLORS = {
  bg:         "#faf8f5",
  surface:    "#ffffff",
  border:     "#e8e0d8",
  accent:     "#c2703e",
  accentSoft: "#f0e4d8",
  text:       "#2c2420",
  textMuted:  "#7a6a5e",
  textDim:    "#b0a090",
  shadow:     "rgba(44,36,32,0.08)",
};

export default function MemoriesView({ memories = [] }) {
  if (memories.length === 0) {
    return (
      <div style={styles.root}>
        <div style={styles.emptyCard}>
          <div style={styles.emptyStar}>✦</div>
          <h2 style={styles.emptyTitle}>No stardust yet</h2>
          <p style={styles.emptyHint}>
            Visit a place and collect a memory to see it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <span style={styles.headerStar}>✦</span>
        <h2 style={styles.title}>{memories.length} {memories.length === 1 ? "memory" : "memories"}</h2>
      </div>
      <div style={styles.list}>
        {memories.map(m => (
          <div key={m.id} style={styles.card}>
            <p style={styles.place}>{m.spotName}</p>
            {m.note && <p style={styles.note}>"{m.note}"</p>}
            {m.tasteCard && (
              <div style={styles.taste}>
                ☕ {m.tasteCard.drink}
                {m.tasteCard.flavors.length > 0 && ` · ${m.tasteCard.flavors.join(", ")}`}
              </div>
            )}
            <p style={styles.meta}>
              with {m.withWho.join(", ")}
              {m.mood ? ` · left feeling ${m.mood}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "calc(100vh - 140px)",
    backgroundColor: COLORS.bg,
    fontFamily: FONT,
    padding: "16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  headerStar: {
    fontSize: 20,
    color: COLORS.accent,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: COLORS.text,
    margin: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  card: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: "16px 20px",
    boxShadow: `0 2px 8px ${COLORS.shadow}`,
  },
  place: {
    fontSize: 15,
    color: COLORS.text,
    margin: "0 0 6px 0",
    fontWeight: 600,
  },
  note: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: "italic",
    margin: "0 0 8px 0",
    lineHeight: 1.5,
  },
  taste: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: 500,
    marginBottom: 4,
  },
  meta: {
    fontSize: 11,
    color: COLORS.textDim,
    letterSpacing: "0.03em",
    margin: 0,
  },
  emptyCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "calc(100vh - 200px)",
    textAlign: "center",
    gap: 8,
  },
  emptyStar: {
    fontSize: 44,
    color: COLORS.accent,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: COLORS.text,
    margin: 0,
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.textMuted,
    margin: 0,
    maxWidth: 260,
    lineHeight: 1.5,
  },
};
