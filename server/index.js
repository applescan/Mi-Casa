import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import express from "express";

config({ quiet: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT) || 5173;
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

const app = express();

app.use(express.json({ limit: "16kb" }));

const redact = (value) => {
  if (!databaseUrl || typeof value !== "string") return value;
  return value.split(databaseUrl).join("[DATABASE_URL]");
};

const describeError = (error) => {
  if (error instanceof Error) {
    return `${error.name}: ${redact(error.message)}`;
  }

  return redact(String(error));
};

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
  if (typeof value === "string" && miniGameIds.has(value)) return value;
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

app.get("/api/leaderboard/:gameId", async (req, res) => {
  const gameId = parseGameId(req.params.gameId);
  if (!gameId) {
    res.status(404).json({ error: "Unknown leaderboard." });
    return;
  }

  if (!sql) {
    res.status(503).json({ error: "Leaderboard database is not configured." });
    return;
  }

  try {
    const entries = await readLeaderboard(gameId);
    res.json({ entries });
  } catch (error) {
    console.error("Leaderboard read failed:", describeError(error));
    res.status(500).json({ error: "Unable to read leaderboard." });
  }
});

app.post("/api/leaderboard/:gameId", async (req, res) => {
  const gameId = parseGameId(req.params.gameId);
  if (!gameId) {
    res.status(404).json({ error: "Unknown leaderboard." });
    return;
  }

  if (!sql) {
    res.status(503).json({ error: "Leaderboard database is not configured." });
    return;
  }

  const entry = parseScoreEntry(req.body);
  if (!entry) {
    res.status(400).json({ error: "Invalid score entry." });
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
    res.status(201).json({ entries, currentEntryId: id });
  } catch (error) {
    console.error("Leaderboard write failed:", describeError(error));
    res.status(500).json({ error: "Unable to save leaderboard score." });
  }
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError) {
    res.status(400).json({ error: "Invalid JSON." });
    return;
  }

  next(error);
});

if (isProduction) {
  const clientDist = path.resolve(__dirname, "../dist");
  app.use(express.static(clientDist));
  app.use((_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    appType: "spa",
    server: { middlewareMode: true },
  });

  app.use(vite.middlewares);
}

app.listen(port, () => {
  console.log(`Mi Casa server running at http://localhost:${port}`);
});
