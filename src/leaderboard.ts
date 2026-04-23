export type MiniGameId =
  | "bubblePop"
  | "dustBunnyChase"
  | "flyCatch"
  | "laundrySort"
  | "recipeRush"
  | "remoteHunt"
  | "rockPaperScissors"
  | "waterPlants";

export interface LeaderboardEntry {
  id: string;
  score: number;
  label: string;
  detail: string;
  date: string;
  timestamp: number;
  isCurrent?: boolean;
}

const MAX_ENTRIES = 5;
const LEADERBOARD_ENDPOINT = "/api/leaderboard";

const storageKey = (gameId: MiniGameId) => `mi-casa:${gameId}:leaderboard`;

const isLeaderboardEntry = (entry: unknown): entry is LeaderboardEntry => {
  if (!entry || typeof entry !== "object") return false;

  const candidate = entry as Partial<LeaderboardEntry>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.score === "number" &&
    Number.isFinite(candidate.score) &&
    typeof candidate.label === "string" &&
    typeof candidate.detail === "string" &&
    typeof candidate.date === "string" &&
    typeof candidate.timestamp === "number" &&
    Number.isFinite(candidate.timestamp)
  );
};

const rankEntries = (entries: LeaderboardEntry[]) =>
  [...entries].sort(
    (a, b) => b.score - a.score || b.timestamp - a.timestamp
  );

const stripCurrentMarkers = (entries: LeaderboardEntry[]) =>
  entries.map(({ id, score, label, detail, date, timestamp }) => ({
    id,
    score,
    label,
    detail,
    date,
    timestamp,
  }));

const readLocalLeaderboard = (gameId: MiniGameId) => {
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

const saveLocalLeaderboard = (
  gameId: MiniGameId,
  entries: LeaderboardEntry[]
) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      storageKey(gameId),
      JSON.stringify(stripCurrentMarkers(entries))
    );
  } catch {
    // The database is authoritative; localStorage is only a display fallback.
  }
};

const randomId = () => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const createLocalEntry = (
  entry: Pick<LeaderboardEntry, "score" | "label" | "detail">
) => {
  const now = new Date();

  return {
    ...entry,
    id: randomId(),
    date: now.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    timestamp: now.getTime(),
    isCurrent: true,
  };
};

const addLocalLeaderboardEntry = (
  gameId: MiniGameId,
  entry: Pick<LeaderboardEntry, "score" | "label" | "detail">
) => {
  const entries = rankEntries([
    ...readLocalLeaderboard(gameId),
    createLocalEntry(entry),
  ]).slice(0, MAX_ENTRIES);

  saveLocalLeaderboard(gameId, entries);

  return entries;
};

const parseLeaderboardResponse = async (response: Response) => {
  if (!response.ok) return null;

  const data: unknown = await response.json();
  if (!data || typeof data !== "object") return null;

  const responseData = data as {
    entries?: unknown;
    currentEntryId?: unknown;
  };
  const entries = responseData.entries;
  if (!Array.isArray(entries)) return null;

  const currentEntryId =
    typeof responseData.currentEntryId === "string"
      ? responseData.currentEntryId
      : null;

  return rankEntries(
    entries.filter(isLeaderboardEntry).map((entry) => ({
      ...entry,
      isCurrent: entry.id === currentEntryId,
    }))
  ).slice(0, MAX_ENTRIES);
};

export const readLeaderboard = async (gameId: MiniGameId) => {
  try {
    const entries = await parseLeaderboardResponse(
      await fetch(`${LEADERBOARD_ENDPOINT}/${encodeURIComponent(gameId)}`)
    );

    if (!entries) return readLocalLeaderboard(gameId);

    saveLocalLeaderboard(gameId, entries);
    return entries;
  } catch {
    return readLocalLeaderboard(gameId);
  }
};

export const addLeaderboardEntry = async (
  gameId: MiniGameId,
  entry: Pick<LeaderboardEntry, "score" | "label" | "detail">
) => {
  try {
    const entries = await parseLeaderboardResponse(
      await fetch(`${LEADERBOARD_ENDPOINT}/${encodeURIComponent(gameId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      })
    );

    if (!entries) return addLocalLeaderboardEntry(gameId, entry);

    saveLocalLeaderboard(gameId, entries);
    return entries;
  } catch {
    return addLocalLeaderboardEntry(gameId, entry);
  }
};

export const formatLeaderboard = (entries: LeaderboardEntry[]) => {
  if (entries.length === 0) return "No scores yet";

  return entries
    .map((entry, index) => formatLeaderboardEntry(entry, index))
    .join("\n");
};

export const formatLeaderboardEntry = (
  entry: LeaderboardEntry,
  index: number
) => `${index + 1}. ${entry.label} - ${entry.detail} (${entry.date})`;
