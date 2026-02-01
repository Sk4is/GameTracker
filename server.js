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
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(
      (m) => m[1],
    );

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
        error:
          "No encontré un vídeo reciente de R6 en @Ubisoft (según el feed).",
      });
    }

    const payload = { cached: false, feed: "user=ubisoft", video: best };
    setCache(cacheKey, payload, 1000 * 60 * 10); // 10 min
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: "Server error", details: String(e) });
  }
});

// --- timeout para fetch ---
async function fetchWithTimeout(url, options = {}, timeoutMs = 6500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...options, signal: controller.signal });
    return r;
  } finally {
    clearTimeout(id);
  }
}

// --- json seguro ---
async function safeJson(resp) {
  const txt = await resp.text();
  try {
    return JSON.parse(txt);
  } catch {
    return { _raw: txt };
  }
}

// --- rank id -> nombre (sin /api/ranks) ---
const RANK_ORDER = [
  "Cobre V",
  "Cobre IV",
  "Cobre III",
  "Cobre II",
  "Cobre I",
  "Bronce V",
  "Bronce IV",
  "Bronce III",
  "Bronce II",
  "Bronce I",
  "Plata V",
  "Plata IV",
  "Plata III",
  "Plata II",
  "Plata I",
  "Oro V",
  "Oro IV",
  "Oro III",
  "Oro II",
  "Oro I",
  "Platino V",
  "Platino IV",
  "Platino III",
  "Platino II",
  "Platino I",
  "Esmeralda V",
  "Esmeralda IV",
  "Esmeralda III",
  "Esmeralda II",
  "Esmeralda I",
  "Diamante V",
  "Diamante IV",
  "Diamante III",
  "Diamante II",
  "Diamante I",
  "Campeón",
];

function rankNameFromId(id) {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return "Sin rango";
  return RANK_ORDER[n - 1] || `#${n}`;
}

app.get("/api/player/:platform/:name", async (req, res) => {
  const { platform, name } = req.params;
  const noCache = req.query.nocache === "1";
  const started = Date.now();

  // ---------- MOCK base ----------
  const opsFallback = [
    "sledge",
    "ash",
    "jager",
    "thermite",
    "mute",
    "hibana",
    "smoke",
    "iq",
  ];
  const idx =
    Math.abs([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) %
    opsFallback.length;
  const topSlug = opsFallback[idx];

  const mockPayload = {
    cached: false,
    mock: true,
    source: "mock",
    debug: { tookMs: Date.now() - started },
    data: {
      platform,
      username: name,
      topOperator: {
        slug: topSlug,
        name: topSlug.charAt(0).toUpperCase() + topSlug.slice(1),
        imageUrl: `/assets/operators/${topSlug}.jpg`,
      },
      topOperators: [],
      operators: [],
      stats: {
        ranked: {
          currentRank: "-",
          mmr: "-",
          kd: "-",
          winRate: "-",
          matches: "-",
          wins: "-",
          losses: "-",
          kills: "-",
          deaths: "-",
          peakRank: "-",
          peakMmr: "-",
        },
        unranked: {
          matches: "-",
          wins: "-",
          losses: "-",
          kd: "-",
          winRate: "-",
          kills: "-",
          deaths: "-",
        },

        rankedSeasons: [],
      },
    },
  };

  // ---------- Solo uplay ----------
  if (platform !== "uplay") {
    console.log(`[PLAYER] platform=${platform} (solo uplay) -> MOCK`);
    return res.json(mockPayload);
  }

  // ---------- API KEY ----------
  const apiKey = process.env.R6DATA_API_KEY;
  if (!apiKey) {
    console.log("[R6DATA] Falta R6DATA_API_KEY en .env -> MOCK");
    return res.json({
      ...mockPayload,
      debug: { error: "Missing R6DATA_API_KEY" },
    });
  }

  // ---------- CACHE ----------
  const cacheKey = `r6data:player:uplay:${name.toLowerCase()}`;
  const staleKey = `${cacheKey}:stale`;

  if (!noCache) {
    const cached = getCache(cacheKey);
    if (cached) {
      console.log(`[R6DATA] cache HIT (fresh) uplay/${name}`);
      return res.json({
        cached: true,
        mock: false,
        source: "r6data",
        debug: { cache: "fresh", tookMs: Date.now() - started },
        data: cached,
      });
    }
  } else {
    console.log("[R6DATA] nocache=1 (debug)");
  }

  const stale = cache.get(staleKey)?.data || null;

  try {
    // ---------- 1) STATS ----------
    const statsUrl =
      `https://api.r6data.eu/api/stats?type=stats` +
      `&nameOnPlatform=${encodeURIComponent(name)}` +
      `&platformType=uplay&platform_families=pc`;

    const r1 = await fetchWithTimeout(
      statsUrl,
      { headers: { "api-key": apiKey, Accept: "application/json" } },
      6500,
    );
    const statsJson = await safeJson(r1);

    console.log(`[R6DATA] stats HTTP ${r1.status}`);

    // 429 rate limit
    if (r1.status === 429) {
      const retryAfter = statsJson?.retryAfter ?? 3600;
      console.log("[R6DATA] 429 rate limit. retryAfter:", retryAfter);

      if (stale) {
        return res.json({
          cached: true,
          mock: false,
          source: "r6data",
          debug: {
            cache: "stale",
            reason: "rate_limited",
            retryAfter,
            tookMs: Date.now() - started,
          },
          data: stale,
        });
      }
      return res.json({
        ...mockPayload,
        debug: {
          error: "R6DATA rate limited",
          retryAfter,
          tookMs: Date.now() - started,
        },
      });
    }

    if (!r1.ok) {
      console.log("[R6DATA] stats error:", r1.status, statsJson);
      if (stale) {
        return res.json({
          cached: true,
          mock: false,
          source: "r6data",
          debug: {
            cache: "stale",
            reason: `stats_http_${r1.status}`,
            tookMs: Date.now() - started,
          },
          data: stale,
        });
      }
      return res.json(mockPayload);
    }

    // ---------- 2) operatorStats ----------
    const opsUrl =
      `https://api.r6data.eu/api/stats?type=operatorStats` +
      `&nameOnPlatform=${encodeURIComponent(name)}` +
      `&platformType=uplay&modes=ranked`;

    let topOperators = [];
    try {
      const r2 = await fetchWithTimeout(
        opsUrl,
        { headers: { "api-key": apiKey, Accept: "application/json" } },
        6500,
      );
      const opsJson = await safeJson(r2);
      console.log(`[R6DATA] operatorStats HTTP ${r2.status}`);

      const playlists = opsJson?.split?.pc?.playlists || {};

      let opsObj = playlists?.ranked?.operators || null;
      let opsMode = "ranked";

      if (!opsObj) {
        opsObj = playlists?.unranked?.operators || null;
        opsMode = "unranked";
      }
      if (!opsObj) {
        opsObj = playlists?.casual?.operators || null;
        opsMode = "casual";
      }
      if (!opsObj) {
        opsObj = null;
        opsMode = "none";
      }

      if (opsObj) {
        topOperators = Object.values(opsObj)
          .map((o) => {
            const life = o?.rounds?.lifetime;
            return {
              name: o?.operator ?? o?.name ?? "-",
              played: Number(life?.played ?? 0),
              won: Number(life?.won ?? 0),
              winRate:
                typeof life?.winRate === "number"
                  ? +life.winRate.toFixed(1)
                  : null,
            };
          })
          .sort((a, b) => (b.played ?? 0) - (a.played ?? 0))
          .slice(0, 10);
      }
    } catch (e) {
      console.log(
        "[R6DATA] operatorStats timeout/error:",
        String(e?.message || e),
      );
    }

    // ---------- Parse boards ----------
    const pffp = statsJson?.platform_families_full_profiles;
    const profile0 = Array.isArray(pffp) ? pffp[0] : null;
    const boards = profile0?.board_ids_full_profiles || [];

    const findBoard = (id) =>
      Array.isArray(boards) ? boards.find((b) => b?.board_id === id) : null;

    const rankedBoard = findBoard("ranked");
    const standardBoard =
      findBoard("standard") || findBoard("living_game_mode");

    // ---------- Ranked seasons (histórico) ----------
    const rankedFps = Array.isArray(rankedBoard?.full_profiles)
      ? rankedBoard.full_profiles
      : [];

    const rankedSeasons = rankedFps
      .map((fp, i) => {
        const profS = fp?.profile || {};
        const stS = fp?.season_statistics || {};

        // Intentamos sacar algún identificador de temporada si existe:
        const season =
          fp?.seasonYear ??
          fp?.season_year ??
          fp?.season ??
          fp?.season_id ??
          fp?.seasonId ??
          fp?.metadata?.season ??
          `#${i + 1}`;

        const peakRankIdS = Number(profS?.max_rank ?? 0);
        const peakMmrS = profS?.max_rank_points ?? "-";

        const finalRankIdS = Number(profS?.rank ?? 0);
        const finalMmrS = profS?.rank_points ?? "-";

        const winsS = Number(stS?.match_outcomes?.wins ?? 0);
        const lossesS = Number(stS?.match_outcomes?.losses ?? 0);
        const abandonsS = Number(stS?.match_outcomes?.abandons ?? 0);
        const matchesS = winsS + lossesS + abandonsS;

        return {
          season,
          matches: matchesS,
          wins: winsS,
          losses: lossesS,
          // peak de ESA temporada
          peakRank: rankNameFromId(peakRankIdS),
          peakMmr: peakMmrS,
          // (opcional) “final”/snapshot de esa temporada
          rank: rankNameFromId(finalRankIdS),
          mmr: finalMmrS,
        };
      })
      // quita temporadas sin partidas (opcional)
      .filter((s) => (s?.matches ?? 0) > 0);

    // ---------- Ranked “temporada actual” ----------
    const rankedFp0 = Array.isArray(rankedBoard?.full_profiles)
      ? rankedBoard.full_profiles[0]
      : null;

    const prof = rankedFp0?.profile || {};
    const st = rankedFp0?.season_statistics || {};

    const rankId = Number(prof?.rank ?? 0);
    const peakRankId = Number(prof?.max_rank ?? 0);

    const mmr = prof?.rank_points ?? "-";
    const peakMmr = prof?.max_rank_points ?? "-";

    const wins = Number(st?.match_outcomes?.wins ?? 0);
    const losses = Number(st?.match_outcomes?.losses ?? 0);
    const abandons = Number(st?.match_outcomes?.abandons ?? 0);
    const matches = wins + losses + abandons;

    const kills = Number(st?.kills ?? 0);
    const deaths = Number(st?.deaths ?? 0);
    const kd =
      deaths > 0 ? +(kills / deaths).toFixed(2) : kills > 0 ? kills : 0;
    const winRate = matches > 0 ? +((wins / matches) * 100).toFixed(1) : 0;

    const currentRankName = rankNameFromId(rankId);
    const peakRankName = rankNameFromId(peakRankId);

    // ---------- Unranked ----------
    const unFp0 = Array.isArray(standardBoard?.full_profiles)
      ? standardBoard.full_profiles[0]
      : null;

    const unSt = unFp0?.season_statistics || {};
    const unWins = Number(unSt?.match_outcomes?.wins ?? 0);
    const unLosses = Number(unSt?.match_outcomes?.losses ?? 0);
    const unAbandons = Number(unSt?.match_outcomes?.abandons ?? 0);
    const unMatches = unWins + unLosses + unAbandons;

    const unKills = Number(unSt?.kills ?? 0);
    const unDeaths = Number(unSt?.deaths ?? 0);
    const unKd =
      unDeaths > 0
        ? +(unKills / unDeaths).toFixed(2)
        : unKills > 0
          ? unKills
          : 0;
    const unWinRate =
      unMatches > 0 ? +((unWins / unMatches) * 100).toFixed(1) : 0;

    // ---------- Banner topOperator ----------
    const bestOpName = topOperators[0]?.name ?? topSlug;

    // ---------- Payload final (SIN rankedSeasons) ----------
    const payload = {
      platform,
      username: name,
      topOperator: {
        slug: topSlug,
        name: bestOpName,
        imageUrl: `/assets/operators/${topSlug}.jpg`,
      },
      topOperators,
      operators: [],
      stats: {
        ranked: {
          currentRank: currentRankName,
          mmr,
          kd,
          winRate,
          matches,
          wins,
          losses,
          kills,
          deaths,
          peakRank: peakRankName,
          peakMmr,
        },
        unranked: {
          matches: unMatches,
          wins: unWins,
          losses: unLosses,
          kd: unKd,
          winRate: unWinRate,
          kills: unKills,
          deaths: unDeaths,
        },

        rankedSeasons,
      },
    };

    console.log("======================================================");
    console.log(`[R6DATA] uplay/${name}`);
    console.log(
      "Current:",
      currentRankName,
      "| RankId:",
      rankId,
      "| MMR:",
      mmr,
    );
    console.log(
      "Peak:",
      peakRankName,
      "| PeakRankId:",
      peakRankId,
      "| Peak MMR:",
      peakMmr,
    );
    console.log("Ranked:", { matches, wins, losses, kd, winRate });
    console.log("Unranked:", { unMatches, unWins, unLosses, unKd, unWinRate });
    console.log(
      "TopOperators:",
      topOperators.length
        ? topOperators.map((x) => `${x.name}(${x.played})`).join(", ")
        : "N/A",
    );
    console.log("======================================================");

    // cache fresh (10 min)
    setCache(cacheKey, payload, 1000 * 60 * 10);

    // cache stale (24h)
    cache.set(staleKey, {
      data: payload,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24,
    });

    return res.json({
      cached: false,
      mock: false,
      source: "r6data",
      debug: { tookMs: Date.now() - started },
      data: payload,
    });
  } catch (e) {
    const msg = String(e?.message || e);
    console.log("[R6DATA] Error/timeout:", msg);

    if (stale) {
      return res.json({
        cached: true,
        mock: false,
        source: "r6data",
        debug: {
          cache: "stale",
          reason: "exception_or_timeout",
          tookMs: Date.now() - started,
          error: msg,
        },
        data: stale,
      });
    }

    return res.json({
      ...mockPayload,
      debug: { error: msg, tookMs: Date.now() - started },
    });
  }
});

// --- MOCK OPERATORS (76) ---
// Imágenes esperadas en: /public/assets/operators/<slug>.jpg

const OPERATORS = [
  // ---------------- ATTACKERS (38) ----------------
  {
    slug: "rauora",
    name: "Rauora",
    side: "attacker",
    description: "Atacante centrada en presión y utilidad para abrir jugadas.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/rauora.jpg",
  },
  {
    slug: "striker",
    name: "Striker",
    side: "attacker",
    description: "Atacante flexible orientado a entrada y duelos.",
    health: 2,
    speed: 2,
    difficulty: 1,
    imageUrl: "/assets/operators/striker.jpg",
  },
  {
    slug: "deimos",
    name: "Deimos",
    side: "attacker",
    description: "Cazador agresivo: presiona y busca picks con información.",
    health: 2,
    speed: 2,
    difficulty: 3,
    imageUrl: "/assets/operators/deimos.jpg",
  },
  {
    slug: "ram",
    name: "Ram",
    side: "attacker",
    description:
      "Especialista en destrucción y limpieza de utilidad desde arriba.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/ram.jpg",
  },
  {
    slug: "brava",
    name: "Brava",
    side: "attacker",
    description: "Hackea gadgets defensivos para girar la ronda a tu favor.",
    health: 2,
    speed: 2,
    difficulty: 3,
    imageUrl: "/assets/operators/brava.jpg",
  },
  {
    slug: "grim",
    name: "Grim",
    side: "attacker",
    description: "Intel y control de zonas para forzar rotaciones.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/grim.jpg",
  },
  {
    slug: "sens",
    name: "Sens",
    side: "attacker",
    description: "Corta líneas de visión para facilitar planta/avance.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/sens.jpg",
  },
  {
    slug: "osa",
    name: "Osa",
    side: "attacker",
    description: "Escudos transparentes para empujar con seguridad.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/osa.jpg",
  },
  {
    slug: "flores",
    name: "Flores",
    side: "attacker",
    description: "Limpia gadgets con drones explosivos a distancia.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/flores.jpg",
  },
  {
    slug: "zero",
    name: "Zero",
    side: "attacker",
    description: "Cámaras para intel, apoyo y control de la ronda.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/zero.jpg",
  },
  {
    slug: "ace",
    name: "Ace",
    side: "attacker",
    description: "Hard breacher rápido y sencillo de ejecutar.",
    health: 2,
    speed: 2,
    difficulty: 1,
    imageUrl: "/assets/operators/ace.jpg",
  },
  {
    slug: "iana",
    name: "Iana",
    side: "attacker",
    description: "Intel para entradas: dron humano para despejar.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/iana.jpg",
  },
  {
    slug: "kali",
    name: "Kali",
    side: "attacker",
    description: "Antigadget a larga distancia con gran potencial de pick.",
    health: 2,
    speed: 2,
    difficulty: 3,
    imageUrl: "/assets/operators/kali.jpg",
  },
  {
    slug: "amaru",
    name: "Amaru",
    side: "attacker",
    description: "Entrada vertical rápida para agresión y sorpresas.",
    health: 2,
    speed: 3,
    difficulty: 2,
    imageUrl: "/assets/operators/amaru.jpg",
  },
  {
    slug: "nokk",
    name: "NOKK",
    side: "attacker",
    description: "Infiltración y sigilo: ideal para flancos.",
    health: 2,
    speed: 2,
    difficulty: 3,
    imageUrl: "/assets/operators/nokk.jpg",
  },
  {
    slug: "gridlock",
    name: "Gridlock",
    side: "attacker",
    description: "Control de rotaciones y post-plant con trampas.",
    health: 3,
    speed: 1,
    difficulty: 2,
    imageUrl: "/assets/operators/gridlock.jpg",
  },
  {
    slug: "nomad",
    name: "Nomad",
    side: "attacker",
    description: "Cierra flancos y protege la planta con empujes.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/nomad.jpg",
  },
  {
    slug: "maverick",
    name: "Maverick",
    side: "attacker",
    description: "Hard breach quirúrgico con soplete: alto skill ceiling.",
    health: 2,
    speed: 2,
    difficulty: 3,
    imageUrl: "/assets/operators/maverick.jpg",
  },
  {
    slug: "lion",
    name: "Lion",
    side: "attacker",
    description: "Escaneo global para coordinar pushes.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/lion.jpg",
  },
  {
    slug: "finka",
    name: "Finka",
    side: "attacker",
    description: "Soporte y sustain del equipo para entradas.",
    health: 2,
    speed: 2,
    difficulty: 1,
    imageUrl: "/assets/operators/finka.jpg",
  },
  {
    slug: "dokkaebi",
    name: "Dokkaebi",
    side: "attacker",
    description: "Disrupción e intel: fuerza llamadas y hackea cams.",
    health: 2,
    speed: 2,
    difficulty: 3,
    imageUrl: "/assets/operators/dokkaebi.jpg",
  },
  {
    slug: "zofia",
    name: "Zofia",
    side: "attacker",
    description: "Utilidad explosiva/aturdidora muy completa.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/zofia.jpg",
  },
  {
    slug: "ying",
    name: "Ying",
    side: "attacker",
    description: "Entry con flashes: ideal para ejecuciones rápidas.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/ying.jpg",
  },
  {
    slug: "jackal",
    name: "Jackal",
    side: "attacker",
    description: "Rastrea roamers y castiga rotaciones.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/jackal.jpg",
  },
  {
    slug: "hibana",
    name: "Hibana",
    side: "attacker",
    description: "Hard breacher para aperturas a distancia.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/hibana.jpg",
  },
  {
    slug: "capitao",
    name: "Capitão",
    side: "attacker",
    description: "Flechas de humo/fuego para cortar y negar áreas.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/capitao.jpg",
  },
  {
    slug: "blackbeard",
    name: "Blackbeard",
    side: "attacker",
    description: "Duelos con ventaja desde ángulos gracias a su escudo.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/blackbeard.jpg",
  },
  {
    slug: "buck",
    name: "Buck",
    side: "attacker",
    description: "Destrucción vertical y flex para abrir líneas.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/buck.jpg",
  },
  {
    slug: "sledge",
    name: "Sledge",
    side: "attacker",
    description: "Martillo para romper superficies y limpiar utilidad.",
    health: 3,
    speed: 1,
    difficulty: 1,
    imageUrl: "/assets/operators/sledge.jpg",
  },
  {
    slug: "thatcher",
    name: "Thatcher",
    side: "attacker",
    description: "Antigadget clásico para habilitar breachers.",
    health: 2,
    speed: 2,
    difficulty: 1,
    imageUrl: "/assets/operators/thatcher.jpg",
  },
  {
    slug: "ash",
    name: "Ash",
    side: "attacker",
    description: "Entry rápida con destrucción puntual.",
    health: 1,
    speed: 3,
    difficulty: 1,
    imageUrl: "/assets/operators/ash.jpg",
  },
  {
    slug: "thermite",
    name: "Thermite",
    side: "attacker",
    description: "Hard breach principal: aperturas grandes en refuerzo.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/thermite.jpg",
  },
  {
    slug: "montagne",
    name: "Montagne",
    side: "attacker",
    description: "Escudo extendible para empujar y plantar con cover.",
    health: 3,
    speed: 1,
    difficulty: 2,
    imageUrl: "/assets/operators/montagne.jpg",
  },
  {
    slug: "twitch",
    name: "Twitch",
    side: "attacker",
    description: "Drones para destruir gadgets y sacar info.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/twitch.jpg",
  },
  {
    slug: "blitz",
    name: "Blitz",
    side: "attacker",
    description: "Escudo con flash para entry agresiva a corta distancia.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/blitz.jpg",
  },
  {
    slug: "iq",
    name: "IQ",
    side: "attacker",
    description: "Detecta electrónica y abre rutas seguras.",
    health: 1,
    speed: 3,
    difficulty: 2,
    imageUrl: "/assets/operators/iq.jpg",
  },
  {
    slug: "fuze",
    name: "Fuze",
    side: "attacker",
    description: "Presión con cargas de racimo para limpiar defensas.",
    health: 3,
    speed: 1,
    difficulty: 2,
    imageUrl: "/assets/operators/fuze.jpg",
  },
  {
    slug: "glaz",
    name: "Glaz",
    side: "attacker",
    description: "Tirador: controla líneas largas y through-smoke plays.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/glaz.jpg",
  },

  // ---------------- DEFENDERS (38) ----------------
  {
    slug: "denari",
    name: "Denari",
    side: "defender",
    description: "Defensora orientada a control de zona y anclaje.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/denari.jpg",
  },
  {
    slug: "skopos",
    name: "Skopós",
    side: "defender",
    description: "Defensora con enfoque en control y utilidad táctica.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/skopos.jpg",
  },
  {
    slug: "sentry",
    name: "Sentry",
    side: "defender",
    description: "Defensora para sostener zonas y castigar pushes.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/sentry.jpg",
  },
  {
    slug: "tubarao",
    name: "Tubarão",
    side: "defender",
    description: "Control de ritmo: frena pushes y niega utilidad.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/tubarao.jpg",
  },
  {
    slug: "fenrir",
    name: "Fenrir",
    side: "defender",
    description: "Trampas para desorientar y ganar duelos.",
    health: 2,
    speed: 2,
    difficulty: 3,
    imageUrl: "/assets/operators/fenrir.jpg",
  },
  {
    slug: "solis",
    name: "Solis",
    side: "defender",
    description: "Caza drones y gadgets para negar intel.",
    health: 2,
    speed: 2,
    difficulty: 3,
    imageUrl: "/assets/operators/solis.jpg",
  },
  {
    slug: "azami",
    name: "Azami",
    side: "defender",
    description: "Moldea el mapa creando coberturas y bloqueos.",
    health: 2,
    speed: 2,
    difficulty: 3,
    imageUrl: "/assets/operators/azami.jpg",
  },
  {
    slug: "thorn",
    name: "Thorn",
    side: "defender",
    description: "Trapper con presión explosiva para frenar entradas.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/thorn.jpg",
  },
  {
    slug: "thunderbird",
    name: "Thunderbird",
    side: "defender",
    description: "Soporte con curación para aguantar el sitio.",
    health: 2,
    speed: 2,
    difficulty: 1,
    imageUrl: "/assets/operators/thunderbird.jpg",
  },
  {
    slug: "aruni",
    name: "Aruni",
    side: "defender",
    description: "Bloqueos láser para drenar utilidad y tiempo.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/aruni.jpg",
  },
  {
    slug: "melusi",
    name: "Melusi",
    side: "defender",
    description: "Control de zona ralentizando y forzando decisiones.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/melusi.jpg",
  },
  {
    slug: "oryx",
    name: "Oryx",
    side: "defender",
    description: "Roamer agresivo con movilidad para picks.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/oryx.jpg",
  },
  {
    slug: "wamai",
    name: "Wamai",
    side: "defender",
    description: "Antigrenadas: reposiciona y protege setups.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/wamai.jpg",
  },
  {
    slug: "goyo",
    name: "Goyo",
    side: "defender",
    description: "Negación de zona y control del tiempo con fuego.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/goyo.jpg",
  },
  {
    slug: "warden",
    name: "Warden",
    side: "defender",
    description: "Counter de humo/flash para sostener ángulos.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/warden.jpg",
  },
  {
    slug: "mozzie",
    name: "Mozzie",
    side: "defender",
    description: "Niega drones y gana intel capturándolos.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/mozzie.jpg",
  },
  {
    slug: "kaid",
    name: "Kaid",
    side: "defender",
    description: "Refuerza paredes/hatches con electricidad a distancia.",
    health: 3,
    speed: 1,
    difficulty: 2,
    imageUrl: "/assets/operators/kaid.jpg",
  },
  {
    slug: "clash",
    name: "Clash",
    side: "defender",
    description: "Escudo eléctrico para frenar pushes y dar info.",
    health: 3,
    speed: 1,
    difficulty: 3,
    imageUrl: "/assets/operators/clash.jpg",
  },
  {
    slug: "maestro",
    name: "Maestro",
    side: "defender",
    description: "Cámaras blindadas para info y presión constante.",
    health: 3,
    speed: 1,
    difficulty: 2,
    imageUrl: "/assets/operators/maestro.jpg",
  },
  {
    slug: "alibi",
    name: "Alibi",
    side: "defender",
    description: "Engaño e info: castiga disparos a señuelos.",
    health: 1,
    speed: 3,
    difficulty: 3,
    imageUrl: "/assets/operators/alibi.jpg",
  },
  {
    slug: "vigil",
    name: "Vigil",
    side: "defender",
    description: "Roamer sigiloso: niega drones y flanquea.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/vigil.jpg",
  },
  {
    slug: "ela",
    name: "Ela",
    side: "defender",
    description: "Entry denial con trampas de aturdimiento.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/ela.jpg",
  },
  {
    slug: "lesion",
    name: "Lesion",
    side: "defender",
    description: "Trampas para intel y desgaste en el tiempo.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/lesion.jpg",
  },
  {
    slug: "mira",
    name: "Mira",
    side: "defender",
    description: "Ventanas unidireccionales para control total del site.",
    health: 3,
    speed: 1,
    difficulty: 3,
    imageUrl: "/assets/operators/mira.jpg",
  },
  {
    slug: "echo",
    name: "Echo",
    side: "defender",
    description: "Drones para info y desorientar: gran post-plant.",
    health: 2,
    speed: 2,
    difficulty: 3,
    imageUrl: "/assets/operators/echo.jpg",
  },
  {
    slug: "caveira",
    name: "Caveira",
    side: "defender",
    description: "Roamer de sigilo: busca interrogatorios y picks.",
    health: 1,
    speed: 3,
    difficulty: 3,
    imageUrl: "/assets/operators/caveira.jpg",
  },
  {
    slug: "valkyrie",
    name: "Valkyrie",
    side: "defender",
    description: "Cámaras extra para info y control del mapa.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/valkyrie.jpg",
  },
  {
    slug: "frost",
    name: "Frost",
    side: "defender",
    description: "Trampas para castigar entradas y saltos.",
    health: 2,
    speed: 2,
    difficulty: 1,
    imageUrl: "/assets/operators/frost.jpg",
  },
  {
    slug: "mute",
    name: "Mute",
    side: "defender",
    description: "Inhibidores para negar drones y gadgets.",
    health: 2,
    speed: 2,
    difficulty: 1,
    imageUrl: "/assets/operators/mute.jpg",
  },
  {
    slug: "smoke",
    name: "Smoke",
    side: "defender",
    description: "Negación de zona en el late round con gas.",
    health: 3,
    speed: 1,
    difficulty: 3,
    imageUrl: "/assets/operators/smoke.jpg",
  },
  {
    slug: "castle",
    name: "Castle",
    side: "defender",
    description: "Refuerzos de barricada para moldear rutas.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/castle.jpg",
  },
  {
    slug: "pulse",
    name: "Pulse",
    side: "defender",
    description: "Intel: localiza enemigos a través de superficies.",
    health: 1,
    speed: 3,
    difficulty: 2,
    imageUrl: "/assets/operators/pulse.jpg",
  },
  {
    slug: "doc",
    name: "Doc",
    side: "defender",
    description: "Soporte con curación y revive para aguantar.",
    health: 3,
    speed: 1,
    difficulty: 1,
    imageUrl: "/assets/operators/doc.jpg",
  },
  {
    slug: "rook",
    name: "Rook",
    side: "defender",
    description: "Armadura para el equipo: fácil y sólido.",
    health: 3,
    speed: 1,
    difficulty: 1,
    imageUrl: "/assets/operators/rook.jpg",
  },
  {
    slug: "jager",
    name: "Jager",
    side: "defender",
    description: "Antiproyectiles para proteger el setup.",
    health: 2,
    speed: 2,
    difficulty: 2,
    imageUrl: "/assets/operators/jager.jpg",
  },
  {
    slug: "bandit",
    name: "Bandit",
    side: "defender",
    description: "Electricidad para negar breaches; juego activo.",
    health: 1,
    speed: 3,
    difficulty: 3,
    imageUrl: "/assets/operators/bandit.jpg",
  },
  {
    slug: "tachanka",
    name: "Tachanka",
    side: "defender",
    description: "Negación de zona con fuego y control del tiempo.",
    health: 3,
    speed: 1,
    difficulty: 2,
    imageUrl: "/assets/operators/tachanka.jpg",
  },
  {
    slug: "kapkan",
    name: "Kapkan",
    side: "defender",
    description: "Trampas explosivas en puertas para castigar rushes.",
    health: 2,
    speed: 2,
    difficulty: 1,
    imageUrl: "/assets/operators/kapkan.jpg",
  },
];

// ✅ Endpoint: lista completa
app.get("/api/operators", (req, res) => {
  res.json({
    cached: false,
    mock: true,
    total: OPERATORS.length,
    attackers: OPERATORS.filter((o) => o.side === "attacker").length,
    defenders: OPERATORS.filter((o) => o.side === "defender").length,
    data: OPERATORS,
  });
});

// ✅ Endpoint opcional: uno por slug
app.get("/api/operators/:slug", (req, res) => {
  const op = OPERATORS.find((o) => o.slug === req.params.slug);
  if (!op) return res.status(404).json({ error: "Operator not found" });
  res.json({ mock: true, data: op });
});

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
