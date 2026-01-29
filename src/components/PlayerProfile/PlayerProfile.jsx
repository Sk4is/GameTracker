import "./PlayerProfile.css";

function Block({ title, children }) {
  return (
    <div className="pp-block">
      <h3 className="pp-block__title">{title}</h3>
      {children}
    </div>
  );
}

function pickOverviewSegment(trackerJson) {
  const segments = trackerJson?.data?.segments;
  if (!Array.isArray(segments)) return null;

  return (
    segments.find((s) => s.type === "overview") ||
    segments.find((s) => s.type === "default") ||
    segments[0] ||
    null
  );
}

export default function PlayerProfile({ data }) {
  const cached = data?.cached;
  const tracker = data?.data;

  const platformInfo = tracker?.data?.platformInfo;
  const overview = pickOverviewSegment(tracker);

  return (
    <div className="pp">
      <div className="pp__cache">{cached ? "Respuesta desde cache" : "Respuesta nueva"}</div>

      <Block title="Perfil">
        <div className="pp-profile">
          {platformInfo?.avatarUrl && (
            <img className="pp-profile__avatar" src={platformInfo.avatarUrl} alt="avatar" />
          )}

          <div>
            <div className="pp-profile__name">{platformInfo?.platformUserHandle ?? "Jugador"}</div>
            <div className="pp-profile__meta">
              {platformInfo?.platformSlug ? `Plataforma: ${platformInfo.platformSlug}` : ""}
            </div>
          </div>
        </div>
      </Block>

      <Block title="Stats (overview)">
        <pre className="pp-pre">{JSON.stringify(overview, null, 2)}</pre>
      </Block>

      <Block title="Respuesta completa (Tracker.gg JSON)">
        <pre className="pp-pre">{JSON.stringify(tracker, null, 2)}</pre>
      </Block>
    </div>
  );
}
