import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar/SearchBar";

export default function Home() {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("uplay");
  const navigate = useNavigate();

  function handleSearch(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    navigate(`/player/${platform}/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>R6 Tracker</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Busca por Ubisoft (uplay), Xbox (xbl) o PlayStation (psn).
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <select
          className="platform-select"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          style={{ padding: 10, fontSize: 16 }}
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
    </div>
  );
}
