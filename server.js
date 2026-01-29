// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const TRACKER_API_KEY = process.env.TRACKER_API_KEY;

// Cache en memoria simple (MVP)
const cache = new Map(); // key -> { data, expiresAt }
const CACHE_MS = 1000 * 60 * 5; // 5 min

function getCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}
function setCache(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_MS });
}

function requireApiKey(req, res, next) {
  if (!TRACKER_API_KEY) {
    return res.status(500).json({ error: "Missing TRACKER_API_KEY in .env" });
  }
  next();
}

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/debug/tracker", requireApiKey, async (req, res) => {
  try {
    const r = await fetch("https://api.tracker.gg/api/v2/status", {
      headers: { "TRN-Api-Key": TRACKER_API_KEY },
    });
    const data = await r.json().catch(() => ({}));
    res.status(r.status).json({ ok: r.ok, status: r.status, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

/**
 * GET /api/player/xbl/:name
 * Devuelve el JSON completo de Tracker.gg para ese jugador de Xbox
 */
app.get("/api/player/:platform/:name", (req, res) => {
  const { platform, name } = req.params;

  // Mock: puedes “variar” el operador según el nombre para que no sea siempre igual
  const ops = ["sledge", "ash", "jager", "thermite", "mute", "hibana", "smoke", "iq"];
  const idx = Math.abs([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) % ops.length;
  const topOperatorSlug = ops[idx];

    res.json({
    cached: false,
    mock: true,
    data: {
      platform,
      username: name,
      topOperator: {
        slug: topOperatorSlug,
        name: topOperatorSlug.charAt(0).toUpperCase() + topOperatorSlug.slice(1),
        imageUrl: `/assets/operators/${topOperatorSlug}.jpg`,
      },

      // 👇 NUEVO: stats para Ranked / Unranked + histórico de temporadas
      stats: {
        ranked: {
          currentRank: "Gold II",
          mmr: 2784,
          kd: 1.12,
          winRate: 54.3,
          matches: 312,
          wins: 169,
          losses: 143,
        },
        unranked: {
          kd: 1.24,
          winRate: 51.1,
          matches: 540,
          wins: 276,
          losses: 264,
        },
        rankedSeasons: [
          { season: "Y9S4", rank: "Emerald III", mmr: 3342 },
          { season: "Y9S3", rank: "Platinum II", mmr: 3610 },
          { season: "Y9S2", rank: "Diamond V", mmr: 4120 }, // <- peak
          { season: "Y9S1", rank: "Gold I", mmr: 2990 },
          { season: "Y8S4", rank: "Platinum III", mmr: 3401 },
        ],
      },

      operators: [
        { name: "Ash", slug: "ash", matches: 120, kd: 1.25, wins: 65 },
        { name: "Jäger", slug: "jager", matches: 95, kd: 1.18, wins: 51 },
        { name: "Sledge", slug: "sledge", matches: 82, kd: 1.05, wins: 43 },
        { name: "Thermite", slug: "thermite", matches: 70, kd: 1.01, wins: 39 },
      ],
    },
  });

});

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
