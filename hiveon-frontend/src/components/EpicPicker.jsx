// src/components/EpicPicker.jsx
import React, { useEffect, useState } from "react";
import api from "../api/apiClient";
import styles from "./EpicPicker.module.css";

export default function EpicPicker({ projectId, value, onChange, disabled }) {
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setEpics([]);
      return;
    }

    let alive = true;
    setLoading(true);

    (async () => {
      try {
        // EXACTLY the same pattern as EpicsPage
        const q = projectId ? `?projectId=${projectId}` : "";
        const res = await api.get(`/epic${q}`);
        const list = Array.isArray(res.data) ? res.data : [];
        if (!alive) return;
        setEpics(list);
      } catch (err) {
        console.error("[EpicPicker] Failed to load epics", err?.response || err);
        if (alive) setEpics([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [projectId]);

  return (
    <select
      className={styles.select}
      disabled={!projectId || disabled}
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value || "")}
    >
      <option value="">
        {projectId
          ? loading
            ? "Loading epics..."
            : epics.length
            ? "No epic link"
            : "No epics in this project"
          : "Select project first"}
      </option>

      {epics.map((epic) => (
        <option key={epic.id} value={epic.id}>
          {epic.title || epic.name || `Epic ${epic.id}`}
        </option>
      ))}
    </select>
  );
}
