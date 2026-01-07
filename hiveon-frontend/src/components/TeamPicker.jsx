import React, { useEffect, useState } from "react";
import api from "../api/apiClient";
import styles from "./TeamPicker.module.css";

export default function TeamPicker({
  projectId,
  value,
  onChange,
  placeholder = "Unassigned",
}) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  // load teams whenever project changes
  useEffect(() => {
    if (!projectId) {
      setTeams([]);
      return;
    }

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/teams", { params: { projectId } });
        const data = Array.isArray(res.data) ? res.data : [];
        if (!alive) return;
        setTeams(data);
      } catch (err) {
        console.error("Failed to load teams for picker", err);
        if (!alive) return;
        setTeams([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [projectId]);

  const disabled = !projectId || loading || teams.length === 0;

  function handleChange(e) {
    const v = e.target.value || "";
    onChange?.(v || null);
  }

  let firstOptionLabel = placeholder;
  if (!projectId) {
    firstOptionLabel = "Select project first";
  } else if (loading) {
    firstOptionLabel = "Loading teams...";
  } else if (teams.length === 0) {
    firstOptionLabel = "No teams for this project";
  }

  return (
    <select
      className={styles.select}
      value={value || ""}
      onChange={handleChange}
      disabled={disabled}
    >
      <option value="">{firstOptionLabel}</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
