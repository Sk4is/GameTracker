import { useEffect, useMemo, useRef, useState } from "react";
import "./SearchBar.css";

const STORAGE_KEY = "r6_recent_searches_v1";

function loadRecent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveRecent(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 25)));
}

export default function SearchBar({ value, onChange, onSubmit, loading, platform }) {
  const [recent, setRecent] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    const filtered = q
      ? recent.filter((x) => x.name.toLowerCase().includes(q) && x.platform === platform)
      : recent.filter((x) => x.platform === platform);

    const seen = new Set();
    const uniq = [];
    for (const item of filtered) {
      const k = `${item.platform}:${item.name.toLowerCase()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(item);
    }
    return uniq.slice(0, 8);
  }, [value, recent, platform]);

  function commitSearch(name) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const next = [{ platform, name: trimmed }, ...recent].filter((x, i, arr) => {
      const k = `${x.platform}:${x.name.toLowerCase()}`;
      return i === arr.findIndex((y) => `${y.platform}:${y.name.toLowerCase()}` === k);
    });

    setRecent(next);
    saveRecent(next);

    setOpen(false);
    onChange(trimmed);
    onSubmit(trimmed);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      commitSearch(value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="searchbar">
      <div className="searchbar__row">
        <input
          className="searchbar__input"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={`Buscar usuario (${platform})...`}
          disabled={loading}
          autoComplete="off"
        />

        <button
          className="searchbar__button"
          onClick={() => commitSearch(value)}
          disabled={loading || !value.trim()}
          type="button"
        >
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <div className="searchbar__dropdown">
          {suggestions.map((s) => (
            <button
              key={`${s.platform}:${s.name}`}
              onClick={() => commitSearch(s.name)}
              className="searchbar__suggestion"
              type="button"
            >
              {s.name} <span className="searchbar__suggestionMeta">({s.platform})</span>
            </button>
          ))}
        </div>
      )}

      {open && suggestions.length === 0 && value.trim().length > 0 && (
        <div className="searchbar__hint">Sin sugerencias (se irán creando con tu historial).</div>
      )}
    </div>
  );
}
