export type MiniGameId = "bubblePop" | "flyCatch" | "rockPaperScissors";

export interface LeaderboardEntry {
  id: string;
  score: number;
  label: string;
  detail: string;
  date: string;
  timestamp: number;
}

const MAX_ENTRIES = 5;

const storageKey = (gameId: MiniGameId) => `mi-casa:${gameId}:leaderboard`;

const isLeaderboardEntry = (entry: unknown): entry is LeaderboardEntry => {
  if (!entry || typeof entry !== "object") return false;

  const candidate = entry as Partial<LeaderboardEntry>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.score === "number" &&
    typeof candidate.label === "string" &&
    typeof candidate.detail === "string" &&
    typeof candidate.date === "string" &&
    typeof candidate.timestamp === "number"
  );
};

const rankEntries = (entries: LeaderboardEntry[]) =>
  [...entries].sort(
    (a, b) => b.score - a.score || b.timestamp - a.timestamp
  );

export const readLeaderboard = (gameId: MiniGameId) => {
  if (typeof window === "undefined") return [];

  try {
    const savedEntries = window.localStorage.getItem(storageKey(gameId));
    if (!savedEntries) return [];

    const parsedEntries: unknown = JSON.parse(savedEntries);
    if (!Array.isArray(parsedEntries)) return [];

    return rankEntries(parsedEntries.filter(isLeaderboardEntry)).slice(
      0,
      MAX_ENTRIES
    );
  } catch {
    return [];
  }
};

export const addLeaderboardEntry = (
  gameId: MiniGameId,
  entry: Pick<LeaderboardEntry, "score" | "label" | "detail">
) => {
  const now = new Date();
  const newEntry: LeaderboardEntry = {
    ...entry,
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    date: now.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    timestamp: now.getTime(),
  };

  const entries = rankEntries([...readLeaderboard(gameId), newEntry]).slice(
    0,
    MAX_ENTRIES
  );

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(storageKey(gameId), JSON.stringify(entries));
    } catch {
      return entries;
    }
  }

  return entries;
};

export const formatLeaderboard = (entries: LeaderboardEntry[]) => {
  if (entries.length === 0) return "No scores yet";

  return entries
    .map(
      (entry, index) =>
        `${index + 1}. ${entry.label} - ${entry.detail} (${entry.date})`
    )
    .join("\n");
};
