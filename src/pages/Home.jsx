import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar/SearchBar";
import "./Home.css";

export default function Home() {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("uplay");
  const navigate = useNavigate();

  const [yt, setYt] = useState({ loading: true, error: "", video: null });

  useEffect(() => {
    let cancel = false;

    async function loadLatestR6() {
      setYt({ loading: true, error: "", video: null });
      try {
        const r = await fetch("/api/youtube/latest-r6");
        const json = await r.json();
        if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
        if (!cancel) setYt({ loading: false, error: "", video: json.video });
      } catch (e) {
        if (!cancel) setYt({ loading: false, error: String(e.message || e), video: null });
      }
    }

    loadLatestR6();
    return () => {
      cancel = true;
    };
  }, []);

  function handleSearch(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    navigate(`/player/${platform}/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="app-container">
      <h1 className="homeTitle">R6 Tracker</h1>
      <p className="homeSub">
        Busca por Ubisoft (uplay), Xbox (xbl) o PlayStation (psn).
      </p>

      <div className="homePlatformRow">
        <select
          className="platform-select"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        >
          <option value="uplay">Ubisoft (uplay)</option>
          <option value="xbl">Xbox (xbl)</option>
          <option value="psn">PlayStation (psn)</option>
        </select>
      </div>

      <SearchBar
        value={query}
        onChange={setQuery}
        onSubmit={handleSearch}
        loading={false}
        platform={platform}
      />

      {/* ✅ Botón a Operadores */}
      <div className="homeActions">
        <button className="homeBtn" onClick={() => navigate("/operators")}>
          Ver operadores (76)
        </button>
      </div>

      {/* --- Último vídeo Ubisoft relacionado con R6 --- */}
      <div className="homeVideo">
        <div className="homeVideo__title">Último vídeo de Ubisoft sobre Rainbow Six Siege</div>

        {yt.loading ? <div className="homeVideo__hint">Cargando vídeo…</div> : null}

        {yt.error ? (
          <div className="homeVideo__error">
            No pude cargar el vídeo: {yt.error}
          </div>
        ) : null}

        {yt.video ? (
          <div className="homeVideo__card">
            <iframe
              src={`https://www.youtube.com/embed/${yt.video.videoId}?autoplay=1&mute=1&loop=1&playlist=${yt.video.videoId}&controls=1&rel=0`}
              title={yt.video.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <div className="homeVideo__meta">
              <div className="homeVideo__videoTitle">{yt.video.title}</div>
              {yt.video.published ? (
                <div className="homeVideo__date">
                  Publicado: {new Date(yt.video.published).toLocaleDateString("es-ES")}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
