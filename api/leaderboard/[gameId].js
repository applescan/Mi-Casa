import { randomUUID } from "node:crypto";

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;
const maxEntries = 5;
const miniGameIds = new Set([
  "bubblePop",
  "dustBunnyChase",
  "flyCatch",
  "laundrySort",
  "recipeRush",
  "remoteHunt",
  "rockPaperScissors",
  "waterPlants",
]);
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

let schemaPromise = null;

const ensureSchema = async () => {
  if (!sql) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS leaderboard_scores (
          id text PRIMARY KEY,
          game_id text NOT NULL,
          score integer NOT NULL,
          label text NOT NULL,
          detail text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS leaderboard_scores_game_rank_idx
        ON leaderboard_scores (game_id, score DESC, created_at DESC)
      `;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
};

const parseGameId = (value) => {
  const gameId = Array.isArray(value) ? value[0] : value;
  if (typeof gameId === "string" && miniGameIds.has(gameId)) return gameId;
  return null;
};

const parseScoreEntry = (body) => {
  if (!body || typeof body !== "object") return null;

  const score = Number(body.score);
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const detail = typeof body.detail === "string" ? body.detail.trim() : "";

  if (!Number.isFinite(score) || !Number.isInteger(score)) return null;
  if (Math.abs(score) > 1_000_000) return null;
  if (!label || label.length > 60) return null;
  if (!detail || detail.length > 60) return null;

  return { score, label, detail };
};

const toLeaderboardEntry = (row) => {
  const createdAt = new Date(row.created_at);

  return {
    id: row.id,
    score: Number(row.score),
    label: row.label,
    detail: row.detail,
    date: dateFormatter.format(createdAt),
    timestamp: createdAt.getTime(),
  };
};

const readLeaderboard = async (gameId) => {
  await ensureSchema();

  const rows = await sql`
    SELECT id, score, label, detail, created_at
    FROM leaderboard_scores
    WHERE game_id = ${gameId}
    ORDER BY score DESC, created_at DESC
    LIMIT ${maxEntries}
  `;

  return rows.map(toLeaderboardEntry);
};

const readBody = (request) => {
  const body = request.body;

  if (typeof body === "string") {
    return JSON.parse(body);
  }

  return body;
};

const describeError = (error) =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

export default async function handler(request, response) {
  const gameId = parseGameId(request.query?.gameId);

  if (!gameId) {
    response.status(404).json({ error: "Unknown leaderboard." });
    return;
  }

  if (!sql) {
    response
      .status(503)
      .json({ error: "Leaderboard database is not configured." });
    return;
  }

  if (request.method === "GET") {
    try {
      const entries = await readLeaderboard(gameId);
      response.status(200).json({ entries });
    } catch (error) {
      console.error("Leaderboard read failed:", describeError(error));
      response.status(500).json({ error: "Unable to read leaderboard." });
    }
    return;
  }

  if (request.method === "POST") {
    let body;

    try {
      body = readBody(request);
    } catch {
      response.status(400).json({ error: "Invalid JSON." });
      return;
    }

    const entry = parseScoreEntry(body);
    if (!entry) {
      response.status(400).json({ error: "Invalid score entry." });
      return;
    }

    try {
      await ensureSchema();
      const id = randomUUID();
      await sql`
        INSERT INTO leaderboard_scores (id, game_id, score, label, detail)
        VALUES (${id}, ${gameId}, ${entry.score}, ${entry.label}, ${entry.detail})
      `;

      const entries = await readLeaderboard(gameId);
      response.status(201).json({ entries, currentEntryId: id });
    } catch (error) {
      console.error("Leaderboard write failed:", describeError(error));
      response.status(500).json({ error: "Unable to save leaderboard score." });
    }
    return;
  }

  response.setHeader("Allow", "GET, POST");
  response.status(405).json({ error: "Method not allowed." });
}
