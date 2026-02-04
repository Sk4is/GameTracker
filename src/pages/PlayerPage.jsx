import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "./PlayerPage.css";

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

function rankScore(rank) {
  const i = RANK_ORDER.indexOf(rank);
  return i === -1 ? -1 : i;
}

function rankColor(rank) {
  if (!rank) return "#999";
  if (rank.startsWith("Cobre")) return "#8f0200";
  if (rank.startsWith("Bronce")) return "#b57227";
  if (rank.startsWith("Plata")) return "#a5a6a3";
  if (rank.startsWith("Oro")) return "#e8c612";
  if (rank.startsWith("Platino")) return "#45cdc1";
  if (rank.startsWith("Esmeralda")) return "#08ce7d";
  if (rank.startsWith("Diamante")) return "#b495f9";
  if (rank === "Campeón") return "#df1880";
  return "#999";
}

function toRoman(n) {
  return ["I", "II", "III", "IV", "V"][n - 1] ?? "";
}

function romanToNumber(roman) {
  const map = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
  return map[roman] ?? null;
}

function getRankIconPath(rank) {
  if (!rank || rank === "-") return null;

  // Campeón (sin número)
  if (rank === "Campeón" || rank === "Campeon") {
    return "/assets/ranks/campeon.png";
  }

  // Ej: "Oro II" => base="oro", roman="II" => num=2 => "oro-2.png"
  const [tierRaw, romanRaw] = String(rank).trim().split(/\s+/);
  const num = romanToNumber(romanRaw);

  if (!tierRaw || !num) return null;

  const tier = tierRaw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita acentos: "Campeón" -> "campeon"

  return `/assets/ranks/${tier}-${num}.png`;
}

function RankWithIcon({ rank, size = 18 }) {
  const src = getRankIconPath(rank);

  return (
    <span className="rankInline">
      {src ? (
        <img
          className="rankInline__icon"
          src={src}
          alt={rank}
          style={{ width: size, height: size }}
          loading="lazy"
        />
      ) : null}
      <span className="rankInline__text">{rank ?? "-"}</span>
    </span>
  );
}

function StatCard({ label, value, accent = "rgba(245,199,106,0.9)" }) {
  return (
    <div className="statCard" style={{ "--accent": accent }}>
      <div className="statCard__label">{label}</div>
      <div className="statCard__value">{value}</div>
    </div>
  );
}

export default function PlayerPage() {
  const { platform, name } = useParams();
  const decodedName = decodeURIComponent(name);
  const navigate = useNavigate();

  const [tab, setTab] = useState("ranked");
  const [state, setState] = useState({
    loading: true,
    error: "",
    payload: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      setState({ loading: true, error: "", payload: null });
      try {
        const r = await fetch(
          `/api/player/${platform}/${encodeURIComponent(decodedName)}`,
          {
            signal: controller.signal,
          },
        );
        const json = await r.json();
        if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
        if (!cancelled) setState({ loading: false, error: "", payload: json });
      } catch (e) {
        if (e.name === "AbortError") return;
        if (!cancelled)
          setState({
            loading: false,
            error: String(e.message || e),
            payload: null,
          });
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [platform, decodedName]);

  const computed = useMemo(() => {
    const d = state.payload?.data || {};
    const seasons = Array.isArray(d?.stats?.rankedSeasons)
      ? d.stats.rankedSeasons
      : [];

    // Peak por ranking “final de season” (si quieres peakSeason real, lo mostramos abajo con peakRank)
    const bestSeasonByRank = seasons.reduce((best, s) => {
      if (!best) return s;
      return rankScore(s.rank) > rankScore(best.rank) ? s : best;
    }, null);

    return { d, seasons, bestSeasonByRank };
  }, [state.payload]);

  if (state.loading) {
    return (
      <div className="app-container">
        <p>Cargando…</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="app-container">
        <Link to="/" className="backLink">
          ← Volver
        </Link>
        <div className="errorBox">Error: {state.error}</div>
      </div>
    );
  }

  const d = computed.d;

  const ranked = d?.stats?.ranked || null;
  const unranked = d?.stats?.unranked || null;

  const seasons = computed.seasons;

  // Peak “global”: si backend te manda ranked.peakRank/peakMmr úsalo.
  const peakValue = ranked?.peakRank ?? computed.bestSeasonByRank?.rank ?? "-";
  const peakMmr = ranked?.peakMmr ?? computed.bestSeasonByRank?.mmr ?? "-";
  const peakClr = rankColor(peakValue);

  // Banner operator (fallback)
  const mostUsedOp = Array.isArray(d?.topOperators) ? d.topOperators[0] : null;
  const bg = d?.topOperator?.imageUrl || null;

  // Tabla operadores
  const tableOps = Array.isArray(d?.topOperators)
    ? d.topOperators
    : Array.isArray(d?.operators)
      ? d.operators
      : [];

  return (
    <div className="app-container">
      <button className="opsBackBtn" onClick={() => navigate(-1)} type="button">
        ← Volver
      </button>

      {/* Banner */}
      <div
        className="banner"
        style={{
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="banner__overlay" />
        <div className="banner__content">
          <div className="banner__meta">
            Plataforma: <b>{platform}</b>{" "}
            {state.payload?.mock ? (
              <span className="banner__mock">
                (No se ha encontrado al jugador)
              </span>
            ) : null}
          </div>

          <div className="banner__name">{d?.username ?? decodedName}</div>

          <div className="banner__sub">
            Operador más usado:{" "}
            <b>{d?.topOperator?.name ?? mostUsedOp?.name ?? "-"}</b>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          type="button"
          className={`tab ${tab === "ranked" ? "is-active" : ""}`}
          onClick={() => setTab("ranked")}
        >
          Ranked
        </button>
        <button
          type="button"
          className={`tab ${tab === "unranked" ? "is-active" : ""}`}
          onClick={() => setTab("unranked")}
        >
          Unranked
        </button>
      </div>

      {tab === "ranked" ? (
        <div key={`ranked-${d?.username ?? decodedName}`}>
          {/* Peak */}
          <div
            className="peak"
            style={{
              "--accent": peakClr,
              borderColor: peakClr,
              boxShadow: `0 0 0 1px ${peakClr}, 0 0 24px ${peakClr}55`,
            }}
          >
            <div className="peak__label">Rango máximo histórico (Peak)</div>
            <div className="peak__value">
              <RankWithIcon rank={peakValue} size={75} />
            </div>

            <div className="peak__meta2">MMR: {peakMmr}</div>
          </div>

          {/* ✅ key también en el grid para asegurar animación */}
          <div
            className="statsGrid"
            key={`ranked-grid-${ranked?.currentRank ?? ""}-${ranked?.mmr ?? ""}`}
          >
            <StatCard
              label="Rango actual"
              value={
                <RankWithIcon rank={ranked?.currentRank ?? "-"} size={35} />
              }
              accent={rankColor(ranked?.currentRank ?? "")}
            />

            <StatCard
              label="MMR"
              value={ranked?.mmr ?? "-"}
              accent="rgba(69,205,193,0.95)"
            />
            <StatCard
              label="K/D"
              value={ranked?.kd ?? "-"}
              accent="rgba(180,149,249,0.95)"
            />
            <StatCard
              label="Winrate"
              value={ranked?.winRate != null ? `${ranked.winRate}%` : "-"}
              accent="rgba(8,206,125,0.95)"
            />
            <StatCard
              label="Kills"
              value={ranked?.kills ?? "-"}
              accent="rgba(223,24,128,0.95)"
            />
            <StatCard
              label="Muertes"
              value={ranked?.deaths ?? "-"}
              accent="rgba(255,100,100,0.95)"
            />
          </div>
        </div>
      ) : (
        <div key={`unranked-${d?.username ?? decodedName}`}>
          <div
            className="statsGrid"
            key={`unranked-grid-1-${unranked?.matches ?? ""}`}
          >
            <StatCard label="Partidas" value={unranked?.matches ?? "-"} />
            <StatCard label="Victorias" value={unranked?.wins ?? "-"} />
            <StatCard label="Derrotas" value={unranked?.losses ?? "-"} />
            <StatCard label="K/D" value={unranked?.kd ?? "-"} />
          </div>

          {/* ✅ aquí es donde te fallaba: forzamos remount */}
          <div
            className="statsGrid statsGrid--2"
            key={`unranked-kd-${unranked?.kills ?? ""}-${unranked?.deaths ?? ""}`}
          >
            <StatCard label="Kills" value={unranked?.kills ?? "-"} />
            <StatCard label="Muertes" value={unranked?.deaths ?? "-"} />
          </div>

          <div
            className="statsGrid statsGrid--2"
            key={`unranked-grid-3-${unranked?.winRate ?? ""}`}
          >
            <StatCard
              label="Winrate"
              value={unranked?.winRate != null ? `${unranked.winRate}%` : "-"}
            />
            <StatCard label="Modo" value="Unranked" />
          </div>
        </div>
      )}

      {/* Tabla operadores */}
      <div className="tableCard">
        <div className="tableCard__title">Top operadores</div>
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Operador</th>
                <th style={{ textAlign: "right" }}>Partidas</th>
                <th style={{ textAlign: "right" }}>Winrate</th>
                <th style={{ textAlign: "right" }}>Wins</th>
              </tr>
            </thead>

            <tbody>
              {tableOps.length ? (
                tableOps.map((op, i) => (
                  <tr key={op.slug ?? op.name ?? i}>
                    <td>{op.name ?? "-"}</td>
                    <td style={{ textAlign: "right" }}>
                      {op.played ?? op.matches ?? "-"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {op.winRate != null ? `${op.winRate}%` : "-"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {op.won ?? op.wins ?? "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ opacity: 0.75, padding: "10px" }}>
                    No hay datos de operadores (aún).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="tip">
        Aviso: No intentes buscar muchas veces seguidas un mismo perfil, ya que
        la request podría saturarse y no mostrar los datos de este perfil
        durante un corto periodo de tiempo.
      </div>
    </div>
  );
}
