import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import OperatorModal from "../components/OperatorModal/OperatorModal";
import "./OperatorsPage.css";

export default function OperatorsPage() {
  const [ops, setOps] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: "" });

  const [side, setSide] = useState("all"); // all | attacker | defender
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);

  const navigate = useNavigate();

  const [sort, setSort] = useState("az"); // az | za
  const [sortBy, setSortBy] = useState("name"); // name | health | speed | difficulty
  const [sortDir, setSortDir] = useState("asc"); // asc | desc

  useEffect(() => {
    let cancel = false;

    async function load() {
      setStatus({ loading: true, error: "" });
      try {
        const r = await fetch("/api/operators");
        const json = await r.json();
        if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
        if (!cancel) {
          setOps(json.data || []);
          setStatus({ loading: false, error: "" });
        }
      } catch (e) {
        if (!cancel)
          setStatus({ loading: false, error: String(e.message || e) });
      }
    }

    load();
    return () => {
      cancel = true;
    };
  }, []);

  const filtered = useMemo(() => {
  const term = q.trim().toLowerCase();

  let list = ops
    .filter((o) => (side === "all" ? true : o.side === side))
    .filter((o) => (term ? (o.name || "").toLowerCase().includes(term) : true));

  const dir = sortDir === "asc" ? 1 : -1;

  list = [...list].sort((a, b) => {
    if (sortBy === "name") {
      return dir * a.name.localeCompare(b.name);
    }

    // health / speed / difficulty (num)
    const av = Number(a?.[sortBy] ?? 0);
    const bv = Number(b?.[sortBy] ?? 0);

    // Si empatan, ordena por nombre para que sea estable
    if (bv === av) return a.name.localeCompare(b.name);

    return dir * (av - bv);
  });

  return list;
}, [ops, side, q, sortBy, sortDir]);


  return (
    <div className="opsPage">
      <div className="opsHeader">
        <div>
          <button
            className="opsBackBtn"
            onClick={() => navigate(-1)}
            type="button"
          >
            ← Volver
          </button>
          <h1 className="opsTitle">Operadores</h1>
          <p className="opsSubtitle">
            {status.loading
              ? "Cargando…"
              : `${filtered.length} mostrados / ${ops.length} totales`}
          </p>
        </div>

        <div className="opsControls">
          <input
            className="opsSearch"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar operador…"
          />

          <div className="opsTabs">
            <select
    className="opsSortSelect"
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value)}
  >
    <option value="name">Nombre</option>
    <option value="health">Salud</option>
    <option value="speed">Velocidad</option>
    <option value="difficulty">Dificultad</option>
  </select>

  <button
    className="opsSortDirBtn"
    type="button"
    onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
    title="Cambiar sentido del orden"
  >
    {sortDir === "asc" ? "↑" : "↓"}
  </button>
            <button
              className={`opsTab ${side === "all" ? "isActive" : ""}`}
              onClick={() => setSide("all")}
            >
              Todos
            </button>
            <button
              className={`opsTab ${side === "attacker" ? "isActive" : ""}`}
              onClick={() => setSide("attacker")}
            >
              Atacantes
            </button>
            <button
              className={`opsTab ${side === "defender" ? "isActive" : ""}`}
              onClick={() => setSide("defender")}
            >
              Defensores
            </button>
          </div>
        </div>
      </div>

      {status.error ? (
        <div className="opsError">Error: {status.error}</div>
      ) : null}

      <div className="opsGrid">
        {filtered.map((op) => (
          <button
            key={op.slug}
            className="opCard"
            onClick={() => setSelected(op)}
            type="button"
          >
            <div className="opImageWrap">
              <img
                className="opImage"
                src={op.imageUrl}
                alt={op.name}
                loading="lazy"
                onError={(e) => {
                  // fallback por si falta imagen
                  e.currentTarget.src = "/assets/operators/placeholder.jpg";
                }}
              />
              <span className={`opBadge ${op.side}`}>
                {op.side === "attacker" ? "ATK" : "DEF"}
              </span>
            </div>

            <div className="opInfo">
              <div className="opName">{op.name}</div>
              <div className="opMeta">
                <span>Salud: {op.health}</span>
                <span>Vel: {op.speed}</span>
                <span>Dif: {op.difficulty}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected ? (
        <OperatorModal op={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}
