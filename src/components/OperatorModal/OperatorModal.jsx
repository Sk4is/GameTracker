import { useEffect } from "react";
import "./OperatorModal.css";

function StatPill({ label, value }) {
  return (
    <div className="statPill">
      <div className="statLabel">{label}</div>
      <div className="statValue">{value}/3</div>
    </div>
  );
}

export default function OperatorModal({ op, onClose }) {
  const side = op?.side === "attacker" ? "attacker" : "defender";

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    // ✅ bloquea scroll del body mientras el modal está abierto
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="opModalOverlay"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className={`opModal ${side}`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Operador ${op.name}`}
      >
        <button className="opModalClose" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        <div className="opModalTop">
          <div className="opModalImgWrap">
            <img
              className="opModalImg"
              src={op.imageUrl}
              alt={op.name}
              onError={(e) => {
                e.currentTarget.src = "/assets/operators/placeholder.jpg";
              }}
            />
          </div>

          <div className="opModalHead">
            <div className={`opModalSide ${side}`}>
              {side === "attacker" ? "ATACANTE" : "DEFENSOR"}
            </div>
            <h2 className="opModalName">{op.name}</h2>
            <p className="opModalDesc">{op.description}</p>
          </div>
        </div>

        <div className="opModalStats">
          <StatPill label="Salud" value={op.health} />
          <StatPill label="Velocidad" value={op.speed} />
          <StatPill label="Dificultad" value={op.difficulty} />
        </div>
      </div>
    </div>
  );
}