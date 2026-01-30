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
      .filter((o) =>
        term ? (o.name || "").toLowerCase().includes(term) : true,
      );

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

      <div className="sectionDivider" />

      <section className="rolesPage">

        <h1>Roles Defensores</h1>

        {/* DEFENSORES */}
        <div className="sectionDividerLeft" />
        <h2>Roamer</h2>
        <p>
          Defensor que juega fuera del site, buscando retrasar, flanquear y
          eliminar atacantes antes de que lleguen al objetivo.
        </p>
        <ul>
          <li>Caveira</li>
          <li>Vigil</li>
          <li>Bandit</li>
          <li>Jäger</li>
          <li>Pulse</li>
          <li>Oryx</li>
          <li>Ela</li>
          <li>Alibi</li>
        </ul>

        <div className="sectionDividerLeft" />
        <h2>Ancla (Anchor)</h2>
        <p>
          Defensor que permanece en el site protegiendo la bomba hasta el final
          de la ronda.
        </p>
        <ul>
          <li>Smoke</li>
          <li>Mira</li>
          <li>Maestro</li>
          <li>Kaid</li>
          <li>Echo</li>
          <li>Doc</li>
          <li>Rook</li>
          <li>Clash</li>
        </ul>

        <div className="sectionDividerLeft" />
        <h2>Flex Defender</h2>
        <p>
          Defensor híbrido entre roamer y ancla, capaz de adaptarse según el
          desarrollo de la ronda.
        </p>
        <ul>
          <li>Mozzie</li>
          <li>Valkyrie</li>
          <li>Wamai</li>
          <li>Melusi</li>
          <li>Lesion</li>
          <li>Aruni</li>
          <li>Thorn</li>
        </ul>

      <div className="sectionDivider" />
        {/* ATACANTES */}
        <h1>Roles de Atacantes</h1>

        <div className="sectionDividerLeft" />
        <h2>Entry Fragger</h2>
        <p>
          Primer atacante en entrar al edificio, encargado de buscar el primer
          duelo y abrir espacio.
        </p>
        <ul>
          <li>Ash</li>
          <li>Zofia</li>
          <li>Iana</li>
          <li>Amaru</li>
          <li>IQ</li>
          <li>Buck</li>
        </ul>

        <div className="sectionDividerLeft" />
        <h2>Soft Breacher</h2>
        <p>
          Especialista en destrucción blanda como paredes, suelos y techos no
          reforzados.
        </p>
        <ul>
          <li>Sledge</li>
          <li>Buck</li>
          <li>Ram</li>
          <li>Ash</li>
          <li>Zofia</li>
        </ul>

        <div className="sectionDividerLeft" />
        <h2>Hard Breacher</h2>
        <p>
          Atacante encargado de abrir paredes reforzadas y trampillas críticas.
        </p>
        <ul>
          <li>Thermite</li>
          <li>Hibana</li>
          <li>Ace</li>
          <li>Maverick</li>
        </ul>

        <div className="sectionDividerLeft" />
        <h2>Support</h2>
        <p>
          Atacante que apoya al equipo con utilidad, información o
          supervivencia.
        </p>
        <ul>
          <li>Thatcher</li>
          <li>Finka</li>
          <li>Lion</li>
          <li>Dokkaebi</li>
          <li>Gridlock</li>
          <li>Nomad</li>
        </ul>

        <div className="sectionDividerLeft" />
        <h2>Intel / Info</h2>
        <p>
          Especialista en recopilar información para coordinar ataques y evitar
          sorpresas.
        </p>
        <ul>
          <li>Zero</li>
          <li>Iana</li>
          <li>Jackal</li>
          <li>Dokkaebi</li>
          <li>Twitch</li>
          <li>Lion</li>
        </ul>

        <div className="sectionDividerLeft" />
        <h2>Post-Plant / Area Denial (ATK)</h2>
        <p>
          Atacantes diseñados para controlar zonas y asegurar la ronda tras
          plantar.
        </p>
        <ul>
          <li>Gridlock</li>
          <li>Nomad</li>
          <li>Capitão</li>
          <li>Ying</li>
          <li>Montagne</li>
        </ul>

      <div className="sectionDivider" />
        {/* ROLES ESPECIALES */}
        <h1>Roles Especiales</h1>

        <div className="sectionDividerLeft" />
        <h2>Shield Player</h2>
        <p>Jugador que empuja y toma espacio utilizando escudos balísticos.</p>
        <ul>
          <li>Montagne</li>
          <li>Blitz</li>
          <li>Clash (defensa)</li>
        </ul>

        <div className="sectionDividerLeft" />
        <h2>Trapper (Defensa)</h2>
        <p>Defensor que castiga las entradas con trampas y daño progresivo.</p>
        <ul>
          <li>Kapkan</li>
          <li>Frost</li>
          <li>Lesion</li>
          <li>Thorn</li>
          <li>Fenrir</li>
        </ul>
      </section>
    </div>
  );
}
