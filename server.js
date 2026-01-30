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

// --- MOCK OPERATORS (76) ---
// Imágenes esperadas en: /public/assets/operators/<slug>.jpg

const OPERATORS = [
  // ---------------- ATTACKERS (38) ----------------
  {
    slug: "rauora",
    name: "Rauora",
    side: "attacker",
    description: "Atacante centrada en presión y utilidad para abrir jugadas.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/rauora.jpg",
  },
  {
    slug: "striker",
    name: "Striker",
    side: "attacker",
    description: "Atacante flexible orientado a entrada y duelos.",
    health: 2, speed: 2, difficulty: 1,
    imageUrl: "/assets/operators/striker.jpg",
  },
  {
    slug: "deimos",
    name: "Deimos",
    side: "attacker",
    description: "Cazador agresivo: presiona y busca picks con información.",
    health: 2, speed: 2, difficulty: 3,
    imageUrl: "/assets/operators/deimos.jpg",
  },
  {
    slug: "ram",
    name: "Ram",
    side: "attacker",
    description: "Especialista en destrucción y limpieza de utilidad desde arriba.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/ram.jpg",
  },
  {
    slug: "brava",
    name: "Brava",
    side: "attacker",
    description: "Hackea gadgets defensivos para girar la ronda a tu favor.",
    health: 2, speed: 2, difficulty: 3,
    imageUrl: "/assets/operators/brava.jpg",
  },
  {
    slug: "grim",
    name: "Grim",
    side: "attacker",
    description: "Intel y control de zonas para forzar rotaciones.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/grim.jpg",
  },
  {
    slug: "sens",
    name: "Sens",
    side: "attacker",
    description: "Corta líneas de visión para facilitar planta/avance.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/sens.jpg",
  },
  {
    slug: "osa",
    name: "Osa",
    side: "attacker",
    description: "Escudos transparentes para empujar con seguridad.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/osa.jpg",
  },
  {
    slug: "flores",
    name: "Flores",
    side: "attacker",
    description: "Limpia gadgets con drones explosivos a distancia.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/flores.jpg",
  },
  {
    slug: "zero",
    name: "Zero",
    side: "attacker",
    description: "Cámaras para intel, apoyo y control de la ronda.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/zero.jpg",
  },
  {
    slug: "ace",
    name: "Ace",
    side: "attacker",
    description: "Hard breacher rápido y sencillo de ejecutar.",
    health: 2, speed: 2, difficulty: 1,
    imageUrl: "/assets/operators/ace.jpg",
  },
  {
    slug: "iana",
    name: "Iana",
    side: "attacker",
    description: "Intel para entradas: dron humano para despejar.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/iana.jpg",
  },
  {
    slug: "kali",
    name: "Kali",
    side: "attacker",
    description: "Antigadget a larga distancia con gran potencial de pick.",
    health: 2, speed: 2, difficulty: 3,
    imageUrl: "/assets/operators/kali.jpg",
  },
  {
    slug: "amaru",
    name: "Amaru",
    side: "attacker",
    description: "Entrada vertical rápida para agresión y sorpresas.",
    health: 2, speed: 3, difficulty: 2,
    imageUrl: "/assets/operators/amaru.jpg",
  },
  {
    slug: "nokk",
    name: "NOKK",
    side: "attacker",
    description: "Infiltración y sigilo: ideal para flancos.",
    health: 2, speed: 2, difficulty: 3,
    imageUrl: "/assets/operators/nokk.jpg",
  },
  {
    slug: "gridlock",
    name: "Gridlock",
    side: "attacker",
    description: "Control de rotaciones y post-plant con trampas.",
    health: 3, speed: 1, difficulty: 2,
    imageUrl: "/assets/operators/gridlock.jpg",
  },
  {
    slug: "nomad",
    name: "Nomad",
    side: "attacker",
    description: "Cierra flancos y protege la planta con empujes.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/nomad.jpg",
  },
  {
    slug: "maverick",
    name: "Maverick",
    side: "attacker",
    description: "Hard breach quirúrgico con soplete: alto skill ceiling.",
    health: 2, speed: 2, difficulty: 3,
    imageUrl: "/assets/operators/maverick.jpg",
  },
  {
    slug: "lion",
    name: "Lion",
    side: "attacker",
    description: "Escaneo global para coordinar pushes.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/lion.jpg",
  },
  {
    slug: "finka",
    name: "Finka",
    side: "attacker",
    description: "Soporte y sustain del equipo para entradas.",
    health: 2, speed: 2, difficulty: 1,
    imageUrl: "/assets/operators/finka.jpg",
  },
  {
    slug: "dokkaebi",
    name: "Dokkaebi",
    side: "attacker",
    description: "Disrupción e intel: fuerza llamadas y hackea cams.",
    health: 2, speed: 2, difficulty: 3,
    imageUrl: "/assets/operators/dokkaebi.jpg",
  },
  {
    slug: "zofia",
    name: "Zofia",
    side: "attacker",
    description: "Utilidad explosiva/aturdidora muy completa.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/zofia.jpg",
  },
  {
    slug: "ying",
    name: "Ying",
    side: "attacker",
    description: "Entry con flashes: ideal para ejecuciones rápidas.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/ying.jpg",
  },
  {
    slug: "jackal",
    name: "Jackal",
    side: "attacker",
    description: "Rastrea roamers y castiga rotaciones.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/jackal.jpg",
  },
  {
    slug: "hibana",
    name: "Hibana",
    side: "attacker",
    description: "Hard breacher para aperturas a distancia.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/hibana.jpg",
  },
  {
    slug: "capitao",
    name: "Capitão",
    side: "attacker",
    description: "Flechas de humo/fuego para cortar y negar áreas.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/capitao.jpg",
  },
  {
    slug: "blackbeard",
    name: "Blackbeard",
    side: "attacker",
    description: "Duelos con ventaja desde ángulos gracias a su escudo.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/blackbeard.jpg",
  },
  {
    slug: "buck",
    name: "Buck",
    side: "attacker",
    description: "Destrucción vertical y flex para abrir líneas.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/buck.jpg",
  },
  {
    slug: "sledge",
    name: "Sledge",
    side: "attacker",
    description: "Martillo para romper superficies y limpiar utilidad.",
    health: 3, speed: 1, difficulty: 1,
    imageUrl: "/assets/operators/sledge.jpg",
  },
  {
    slug: "thatcher",
    name: "Thatcher",
    side: "attacker",
    description: "Antigadget clásico para habilitar breachers.",
    health: 2, speed: 2, difficulty: 1,
    imageUrl: "/assets/operators/thatcher.jpg",
  },
  {
    slug: "ash",
    name: "Ash",
    side: "attacker",
    description: "Entry rápida con destrucción puntual.",
    health: 1, speed: 3, difficulty: 1,
    imageUrl: "/assets/operators/ash.jpg",
  },
  {
    slug: "thermite",
    name: "Thermite",
    side: "attacker",
    description: "Hard breach principal: aperturas grandes en refuerzo.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/thermite.jpg",
  },
  {
    slug: "montagne",
    name: "Montagne",
    side: "attacker",
    description: "Escudo extendible para empujar y plantar con cover.",
    health: 3, speed: 1, difficulty: 2,
    imageUrl: "/assets/operators/montagne.jpg",
  },
  {
    slug: "twitch",
    name: "Twitch",
    side: "attacker",
    description: "Drones para destruir gadgets y sacar info.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/twitch.jpg",
  },
  {
    slug: "blitz",
    name: "Blitz",
    side: "attacker",
    description: "Escudo con flash para entry agresiva a corta distancia.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/blitz.jpg",
  },
  {
    slug: "iq",
    name: "IQ",
    side: "attacker",
    description: "Detecta electrónica y abre rutas seguras.",
    health: 1, speed: 3, difficulty: 2,
    imageUrl: "/assets/operators/iq.jpg",
  },
  {
    slug: "fuze",
    name: "Fuze",
    side: "attacker",
    description: "Presión con cargas de racimo para limpiar defensas.",
    health: 3, speed: 1, difficulty: 2,
    imageUrl: "/assets/operators/fuze.jpg",
  },
  {
    slug: "glaz",
    name: "Glaz",
    side: "attacker",
    description: "Tirador: controla líneas largas y through-smoke plays.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/glaz.jpg",
  },

  // ---------------- DEFENDERS (38) ----------------
  {
    slug: "denari",
    name: "Denari",
    side: "defender",
    description: "Defensora orientada a control de zona y anclaje.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/denari.jpg",
  },
  {
    slug: "skopos",
    name: "Skopós",
    side: "defender",
    description: "Defensora con enfoque en control y utilidad táctica.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/skopos.jpg",
  },
  {
    slug: "sentry",
    name: "Sentry",
    side: "defender",
    description: "Defensora para sostener zonas y castigar pushes.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/sentry.jpg",
  },
  {
    slug: "tubarao",
    name: "Tubarão",
    side: "defender",
    description: "Control de ritmo: frena pushes y niega utilidad.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/tubarao.jpg",
  },
  {
    slug: "fenrir",
    name: "Fenrir",
    side: "defender",
    description: "Trampas para desorientar y ganar duelos.",
    health: 2, speed: 2, difficulty: 3,
    imageUrl: "/assets/operators/fenrir.jpg",
  },
  {
    slug: "solis",
    name: "Solis",
    side: "defender",
    description: "Caza drones y gadgets para negar intel.",
    health: 2, speed: 2, difficulty: 3,
    imageUrl: "/assets/operators/solis.jpg",
  },
  {
    slug: "azami",
    name: "Azami",
    side: "defender",
    description: "Moldea el mapa creando coberturas y bloqueos.",
    health: 2, speed: 2, difficulty: 3,
    imageUrl: "/assets/operators/azami.jpg",
  },
  {
    slug: "thorn",
    name: "Thorn",
    side: "defender",
    description: "Trapper con presión explosiva para frenar entradas.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/thorn.jpg",
  },
  {
    slug: "thunderbird",
    name: "Thunderbird",
    side: "defender",
    description: "Soporte con curación para aguantar el sitio.",
    health: 2, speed: 2, difficulty: 1,
    imageUrl: "/assets/operators/thunderbird.jpg",
  },
  {
    slug: "aruni",
    name: "Aruni",
    side: "defender",
    description: "Bloqueos láser para drenar utilidad y tiempo.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/aruni.jpg",
  },
  {
    slug: "melusi",
    name: "Melusi",
    side: "defender",
    description: "Control de zona ralentizando y forzando decisiones.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/melusi.jpg",
  },
  {
    slug: "oryx",
    name: "Oryx",
    side: "defender",
    description: "Roamer agresivo con movilidad para picks.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/oryx.jpg",
  },
  {
    slug: "wamai",
    name: "Wamai",
    side: "defender",
    description: "Antigrenadas: reposiciona y protege setups.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/wamai.jpg",
  },
  {
    slug: "goyo",
    name: "Goyo",
    side: "defender",
    description: "Negación de zona y control del tiempo con fuego.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/goyo.jpg",
  },
  {
    slug: "warden",
    name: "Warden",
    side: "defender",
    description: "Counter de humo/flash para sostener ángulos.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/warden.jpg",
  },
  {
    slug: "mozzie",
    name: "Mozzie",
    side: "defender",
    description: "Niega drones y gana intel capturándolos.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/mozzie.jpg",
  },
  {
    slug: "kaid",
    name: "Kaid",
    side: "defender",
    description: "Refuerza paredes/hatches con electricidad a distancia.",
    health: 3, speed: 1, difficulty: 2,
    imageUrl: "/assets/operators/kaid.jpg",
  },
  {
    slug: "clash",
    name: "Clash",
    side: "defender",
    description: "Escudo eléctrico para frenar pushes y dar info.",
    health: 3, speed: 1, difficulty: 3,
    imageUrl: "/assets/operators/clash.jpg",
  },
  {
    slug: "maestro",
    name: "Maestro",
    side: "defender",
    description: "Cámaras blindadas para info y presión constante.",
    health: 3, speed: 1, difficulty: 2,
    imageUrl: "/assets/operators/maestro.jpg",
  },
  {
    slug: "alibi",
    name: "Alibi",
    side: "defender",
    description: "Engaño e info: castiga disparos a señuelos.",
    health: 1, speed: 3, difficulty: 3,
    imageUrl: "/assets/operators/alibi.jpg",
  },
  {
    slug: "vigil",
    name: "Vigil",
    side: "defender",
    description: "Roamer sigiloso: niega drones y flanquea.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/vigil.jpg",
  },
  {
    slug: "ela",
    name: "Ela",
    side: "defender",
    description: "Entry denial con trampas de aturdimiento.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/ela.jpg",
  },
  {
    slug: "lesion",
    name: "Lesion",
    side: "defender",
    description: "Trampas para intel y desgaste en el tiempo.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/lesion.jpg",
  },
  {
    slug: "mira",
    name: "Mira",
    side: "defender",
    description: "Ventanas unidireccionales para control total del site.",
    health: 3, speed: 1, difficulty: 3,
    imageUrl: "/assets/operators/mira.jpg",
  },
  {
    slug: "echo",
    name: "Echo",
    side: "defender",
    description: "Drones para info y desorientar: gran post-plant.",
    health: 2, speed: 2, difficulty: 3,
    imageUrl: "/assets/operators/echo.jpg",
  },
  {
    slug: "caveira",
    name: "Caveira",
    side: "defender",
    description: "Roamer de sigilo: busca interrogatorios y picks.",
    health: 1, speed: 3, difficulty: 3,
    imageUrl: "/assets/operators/caveira.jpg",
  },
  {
    slug: "valkyrie",
    name: "Valkyrie",
    side: "defender",
    description: "Cámaras extra para info y control del mapa.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/valkyrie.jpg",
  },
  {
    slug: "frost",
    name: "Frost",
    side: "defender",
    description: "Trampas para castigar entradas y saltos.",
    health: 2, speed: 2, difficulty: 1,
    imageUrl: "/assets/operators/frost.jpg",
  },
  {
    slug: "mute",
    name: "Mute",
    side: "defender",
    description: "Inhibidores para negar drones y gadgets.",
    health: 2, speed: 2, difficulty: 1,
    imageUrl: "/assets/operators/mute.jpg",
  },
  {
    slug: "smoke",
    name: "Smoke",
    side: "defender",
    description: "Negación de zona en el late round con gas.",
    health: 3, speed: 1, difficulty: 3,
    imageUrl: "/assets/operators/smoke.jpg",
  },
  {
    slug: "castle",
    name: "Castle",
    side: "defender",
    description: "Refuerzos de barricada para moldear rutas.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/castle.jpg",
  },
  {
    slug: "pulse",
    name: "Pulse",
    side: "defender",
    description: "Intel: localiza enemigos a través de superficies.",
    health: 1, speed: 3, difficulty: 2,
    imageUrl: "/assets/operators/pulse.jpg",
  },
  {
    slug: "doc",
    name: "Doc",
    side: "defender",
    description: "Soporte con curación y revive para aguantar.",
    health: 3, speed: 1, difficulty: 1,
    imageUrl: "/assets/operators/doc.jpg",
  },
  {
    slug: "rook",
    name: "Rook",
    side: "defender",
    description: "Armadura para el equipo: fácil y sólido.",
    health: 3, speed: 1, difficulty: 1,
    imageUrl: "/assets/operators/rook.jpg",
  },
  {
    slug: "jager",
    name: "Jager",
    side: "defender",
    description: "Antiproyectiles para proteger el setup.",
    health: 2, speed: 2, difficulty: 2,
    imageUrl: "/assets/operators/jager.jpg",
  },
  {
    slug: "bandit",
    name: "Bandit",
    side: "defender",
    description: "Electricidad para negar breaches; juego activo.",
    health: 1, speed: 3, difficulty: 3,
    imageUrl: "/assets/operators/bandit.jpg",
  },
  {
    slug: "tachanka",
    name: "Tachanka",
    side: "defender",
    description: "Negación de zona con fuego y control del tiempo.",
    health: 3, speed: 1, difficulty: 2,
    imageUrl: "/assets/operators/tachanka.jpg",
  },
  {
    slug: "kapkan",
    name: "Kapkan",
    side: "defender",
    description: "Trampas explosivas en puertas para castigar rushes.",
    health: 2, speed: 2, difficulty: 1,
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

export default app;

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}
