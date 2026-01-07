
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/apiClient";
import styles from "./ProjectPicker.module.css";

export default function ProjectPicker({
  value,
  onChange,
  showLabel = true,
  label = "Project",
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get("/projects"); // matches controller
        const list = Array.isArray(res.data) ? res.data : [];
        const normalized = list
          .map((p) => ({
            id: p.id || p.Id,
            name: p.name || p.Name,
          }))
          .filter((p) => p.id);
        if (!alive) return;
        setProjects(normalized);

        const current = value || localStorage.getItem("currentProjectId");
        if (!current && normalized.length) {
          const first = normalized[0];
          localStorage.setItem("currentProjectId", first.id);
          localStorage.setItem("currentProjectName", first.name || "");
          onChange?.(first.id);
        }
      } catch (err) {
        console.error("Failed to load projects", err?.response || err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [onChange, value]);

  const handleChange = (e) => {
    const id = e.target.value || "";
    onChange?.(id);
    if (id) {
      const proj = projects.find((p) => p.id === id);
      localStorage.setItem("currentProjectId", id);
      localStorage.setItem("currentProjectName", proj?.name || "");
    } else {
      localStorage.removeItem("currentProjectId");
      localStorage.removeItem("currentProjectName");
    }
  };

  return (
    <div className={styles.wrapper}>
      {showLabel && <label className={styles.label}>{label}</label>}
      <select
        className={styles.select}
        value={value || ""}
        onChange={handleChange}
        disabled={loading || projects.length === 0}
      >
        {projects.length === 0 ? (
          <option value="">No projects</option>
        ) : (
          <>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </>
        )}
      </select>
      {projects.length === 0 && !loading && (
        <div className={styles.helper}>
          <span>No projects found.</span>{" "}
          <Link to="/create-project">Create one</Link>
        </div>
      )}
    </div>
  );
}
