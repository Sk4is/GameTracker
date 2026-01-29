import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./PlayerPage.css";

const RANK_ORDER = [
  "Copper V",
  "Copper IV",
  "Copper III",
  "Copper II",
  "Copper I",
  "Bronze V",
  "Bronze IV",
  "Bronze III",
  "Bronze II",
  "Bronze I",
  "Silver V",
  "Silver IV",
  "Silver III",
  "Silver II",
  "Silver I",
  "Gold V",
  "Gold IV",
  "Gold III",
  "Gold II",
  "Gold I",
  "Platinum V",
  "Platinum IV",
  "Platinum III",
  "Platinum II",
  "Platinum I",
  "Emerald V",
  "Emerald IV",
  "Emerald III",
  "Emerald II",
  "Emerald I",
  "Diamond V",
  "Diamond IV",
  "Diamond III",
  "Diamond II",
  "Diamond I",
  "Champion",
];

function rankScore(rank) {
  const i = RANK_ORDER.indexOf(rank);
  return i === -1 ? -1 : i;
}

function rankColor(rank) {
  if (!rank) return "#999";

  if (rank.startsWith("Copper")) return "#b33a3a"; // Rojo
  if (rank.startsWith("Bronze")) return "#b87333"; // Bronce
  if (rank.startsWith("Silver")) return "#c0c0c0"; // Plata
  if (rank.startsWith("Gold")) return "#f5c76a"; // Oro
  if (rank.startsWith("Platinum")) return "#7fbfff"; // Azul claro
  if (rank.startsWith("Emerald")) return "#2ecc71"; // Verde
  if (rank.startsWith("Diamond")) return "#9b59b6"; // Morado
  if (rank === "Champion") return "#ff5fa2"; // Rosa

  return "#999";
}

function StatCard({ label, value }) {
  return (
    <div className="statCard">
      <div className="statCard__label">{label}</div>
      <div className="statCard__value">{value}</div>
    </div>
  );
}

export default function PlayerPage() {
  const { platform, name } = useParams();
  const decodedName = decodeURIComponent(name);

  const [tab, setTab] = useState("ranked"); // ranked | unranked
  const [state, setState] = useState({
    loading: true,
    error: "",
    payload: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ loading: true, error: "", payload: null });
      try {
        const r = await fetch(
          `/api/player/${platform}/${encodeURIComponent(decodedName)}`
        );
        const json = await r.json();
        if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
        if (!cancelled) setState({ loading: false, error: "", payload: json });
      } catch (e) {
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
    };
  }, [platform, decodedName]);

  const computed = useMemo(() => {
    const d = state.payload?.data;
    const seasons = Array.isArray(d?.stats?.rankedSeasons)
      ? d.stats.rankedSeasons
      : [];

    const peak = seasons.reduce((best, s) => {
      if (!best) return s;
      return rankScore(s.rank) > rankScore(best.rank) ? s : best;
    }, null);

    return { d, seasons, peak };
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
  const bg = d?.topOperator?.imageUrl;

  const ranked = d?.stats?.ranked;
  const unranked = d?.stats?.unranked;
  const seasons = computed.seasons;
  const peak = computed.peak;

  const peakClr = rankColor(peak?.rank);

  return (
    <div className="app-container">
      <Link to="/" className="backLink">
        ← Volver
      </Link>

      {/* Banner */}
      <div
        className="banner"
        style={{ backgroundImage: bg ? `url(${bg})` : "none" }}
      >
        <div className="banner__overlay" />
        <div className="banner__content">
          <div className="banner__meta">
            Plataforma: <b>{platform}</b>
            {state.payload?.mock ? (
              <span className="banner__mock">(mock)</span>
            ) : null}
          </div>

          <div className="banner__name">{d.username}</div>
          <div className="banner__sub">
            Operador más usado: <b>{d?.topOperator?.name}</b>
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

      {/* Contenido por pestaña */}
      {tab === "ranked" ? (
        <>
          {/* Peak destacado */}
          <div
            className="peak"
            style={{
              borderColor: peakClr,
              boxShadow: `0 0 0 1px ${peakClr}, 0 0 24px ${peakClr}55`,
            }}
          >
            <div className="peak__label">Rango máximo histórico (Peak)</div>

            {/* Texto BLANCO, solo caja coloreada */}
            <div className="peak__value">
              {peak?.rank ?? "-"}{" "}
              <span className="peak__meta">({peak?.season ?? "-"})</span>
            </div>

            <div className="peak__meta2">MMR: {peak?.mmr ?? "-"}</div>
          </div>

          <div className="statsGrid">
            <StatCard label="Rango actual" value={ranked?.currentRank ?? "-"} />
            <StatCard label="MMR" value={ranked?.mmr ?? "-"} />
            <StatCard label="K/D" value={ranked?.kd ?? "-"} />
            <StatCard
              label="Winrate"
              value={ranked ? `${ranked.winRate}%` : "-"}
            />
          </div>

          {/* Temporadas + highlight peak */}
          <div className="seasonCard">
            <div className="seasonCard__title">Historial de temporadas</div>
            <div className="seasonList">
              {seasons.map((s) => {
                const isPeak =
                  peak && s.season === peak.season && s.rank === peak.rank;

                const rowClr = rankColor(s.rank);

                return (
                  <div
                    key={s.season}
                    className={`seasonRow ${isPeak ? "is-peak" : ""}`}
                    style={
                      isPeak
                        ? {
                            borderColor: rowClr,
                            boxShadow: `0 0 0 1px ${rowClr}, 0 0 14px ${rowClr}44`,
                          }
                        : undefined
                    }
                  >
                    <div className="seasonRow__season">{s.season}</div>
                    <div className="seasonRow__rank">{s.rank}</div>
                    <div className="seasonRow__mmr">{s.mmr}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="statsGrid">
            <StatCard label="Partidas" value={unranked?.matches ?? "-"} />
            <StatCard label="Victorias" value={unranked?.wins ?? "-"} />
            <StatCard label="Derrotas" value={unranked?.losses ?? "-"} />
            <StatCard label="K/D" value={unranked?.kd ?? "-"} />
          </div>

          <div className="statsGrid statsGrid--2">
            <StatCard
              label="Winrate"
              value={unranked ? `${unranked.winRate}%` : "-"}
            />
            <StatCard label="Modo" value="Unranked" />
          </div>
        </>
      )}

      {/* Tabla operadores (siempre) */}
      <div className="tableCard">
        <div className="tableCard__title">Top operadores</div>
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Operador</th>
                <th style={{ textAlign: "right" }}>Partidas</th>
                <th style={{ textAlign: "right" }}>K/D</th>
                <th style={{ textAlign: "right" }}>Wins</th>
              </tr>
            </thead>
            <tbody>
              {d.operators.map((op) => (
                <tr key={op.slug}>
                  <td>{op.name}</td>
                  <td style={{ textAlign: "right" }}>{op.matches}</td>
                  <td style={{ textAlign: "right" }}>{op.kd}</td>
                  <td style={{ textAlign: "right" }}>{op.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="tip">
        Tip: cuando Tracker esté aprobado, este mock se reemplaza por datos
        reales sin cambiar la UI.
      </div>
    </div>
  );
}
