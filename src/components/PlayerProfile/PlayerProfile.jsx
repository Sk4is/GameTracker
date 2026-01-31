import "./PlayerProfile.css";

function Block({ title, children }) {
  return (
    <div className="pp-block">
      <h3 className="pp-block__title">{title}</h3>
      {children}
    </div>
  );
}

export default function PlayerProfile({ data }) {
  const cached = data?.cached;
  const payload = data?.data; // ✅ aquí viene lo de tu backend (r6data o mock)

  const ranked = payload?.ranked ?? payload?.stats?.ranked ?? null;
  const topOps = payload?.topOperators ?? payload?.operators ?? [];

  return (
    <div className="pp">
      <div className="pp__cache">
        {cached ? "Respuesta desde cache" : "Respuesta nueva"}
      </div>

      <Block title="Perfil">
        <div className="pp-profile">
          <div>
            <div className="pp-profile__name">{payload?.username ?? "Jugador"}</div>
            <div className="pp-profile__meta">
              {payload?.platform ? `Plataforma: ${payload.platform}` : ""}
            </div>
          </div>
        </div>
      </Block>

      <Block title="Ranked (normalizado)">
        <pre className="pp-pre">{JSON.stringify(ranked, null, 2)}</pre>
      </Block>

      <Block title="Top operadores (normalizado)">
        <pre className="pp-pre">{JSON.stringify(topOps, null, 2)}</pre>
      </Block>

      <Block title="Respuesta completa (payload)">
        <pre className="pp-pre">{JSON.stringify(payload, null, 2)}</pre>
      </Block>
    </div>
  );
}
