// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

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
function setCache(key, data, ms = CACHE_MS) {
  cache.set(key, { data, expiresAt: Date.now() + ms });
}

app.get("/api/health", (req, res) => res.json({ ok: true }));

/**
 * ✅ Último vídeo de @Ubisoft relacionado con Rainbow Six Siege (sin API key)
 * RSS por username clásico (suele funcionar para cuentas antiguas):
 * https://www.youtube.com/feeds/videos.xml?user=ubisoft
 *
 * Si algún día no funcionase, lo cambiamos a channel_id.
 */
app.get("/api/youtube/latest-r6", async (req, res) => {
  const cacheKey = "yt:latest-r6";
  const cached = getCache(cacheKey);
  if (cached) return res.json({ cached: true, ...cached });

  try {
    const feedUrl = "https://www.youtube.com/feeds/videos.xml?user=ubisoft";
    const r = await fetch(feedUrl, {
      headers: {
        "user-agent": "Mozilla/5.0",
        accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      },
    });

    const xml = await r.text();

    if (!r.ok) {
      return res.status(r.status).json({
        error: "No se pudo obtener el feed de YouTube",
        status: r.status,
      });
    }

    // Sacamos entries del XML (sin librerías)
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);

    const want = (title = "") => {
      const t = title.toLowerCase();
      // Ajusta palabras clave si quieres:
      return (
        t.includes("rainbow six") ||
        t.includes("rainbow6") ||
        t.includes("siege") ||
        t.includes("r6")
      );
    };

    function pickTag(block, tag) {
      const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
      return m ? m[1].trim() : "";
    }

    // Busca el primer vídeo que sea de R6 (más reciente arriba)
    let best = null;

    for (const e of entries) {
      const title = pickTag(e, "title");
      if (!title || !want(title)) continue;

      const videoId = pickTag(e, "yt:videoId") || pickTag(e, "videoId");
      const published = pickTag(e, "published");
      const linkMatch = e.match(/<link[^>]*href="([^"]+)"/);
      const link = linkMatch ? linkMatch[1] : "";
      const thumbMatch = e.match(/<media:thumbnail[^>]*url="([^"]+)"/);
      const thumbnail = thumbMatch ? thumbMatch[1] : "";

      if (videoId) {
        best = { videoId, title, published, link, thumbnail };
        break;
      }
    }

    if (!best) {
      return res.status(404).json({
        error: "No encontré un vídeo reciente de R6 en @Ubisoft (según el feed).",
      });
    }

    const payload = { cached: false, feed: "user=ubisoft", video: best };
    setCache(cacheKey, payload, 1000 * 60 * 10); // 10 min
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: "Server error", details: String(e) });
  }
});

// ---- TU MOCK DE PLAYER (déjalo igual) ----
app.get("/api/player/:platform/:name", (req, res) => {
  const { platform, name } = req.params;

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
      // (tu mock aquí...)
      overview: {
        rank: "Oro II",
        mmr: 2784,
        kd: 1.12,
        winRate: 54.3,
        matches: 312,
        wins: 169,
        losses: 143,
      },
      operators: [
        { name: "Ash", slug: "ash", matches: 120, kd: 1.25, wins: 65 },
        { name: "Jäger", slug: "jager", matches: 95, kd: 1.18, wins: 51 },
        { name: "Sledge", slug: "sledge", matches: 82, kd: 1.05, wins: 43 },
        { name: "Thermite", slug: "thermite", matches: 70, kd: 1.01, wins: 39 },
      ],
      // stats mock si quieres...
      stats: {
        ranked: { currentRank: "Oro II", mmr: 2784, kd: 1.12, winRate: 54.3 },
        unranked: { matches: 220, wins: 118, losses: 102, kd: 1.08, winRate: 53.6 },
        rankedSeasons: [
          { season: "Y9S4", rank: "Oro II", mmr: 2784 },
          { season: "Y9S3", rank: "Oro I", mmr: 2901 },
          { season: "Y9S2", rank: "Platino V", mmr: 3200 },
        ],
      },
    },
  });
});

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
