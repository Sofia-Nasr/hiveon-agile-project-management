import React, { useState } from "react";
import api from "../api/apiClient";
import TeamPicker from "../components/TeamPicker";
import styles from "./NewSprintModal.module.css";

export default function NewSprintModal({
  projectId,
  open,
  onClose,
  onCreated,
}) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [goal, setGoal] = useState("");
  const [teamId, setTeamId] = useState(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setStart("");
    setEnd("");
    setGoal("");
    setTeamId(null);
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!projectId || !name.trim()) return;

    if (!teamId) {
      alert("Please select a team for this sprint.");
      return;
    }

    try {
      setSaving(true);

      await api.post("/sprints", {
        projectId,
        teamId, // ✅ REQUIRED
        name: name.trim(),
        startDate: new Date(start).toISOString(),
        endDate: new Date(end).toISOString(),
        goal: goal?.trim() || null,
      });

      reset();
      onCreated?.();
      onClose();
    } catch (err) {
      console.error("Sprint create failed", err);
      alert(err?.response?.data ?? "Create sprint failed");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className={styles.header}>
          <h3 className={styles.title}>New Sprint</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </header>

        <form className={styles.form} onSubmit={submit}>
          {/* NAME */}
          <label className={styles.label}>Name</label>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sprint 5"
            required
          />

          {/* TEAM PICKER (NEW) */}
          <label className={styles.label}>Team</label>
          <TeamPicker
            projectId={projectId}
            value={teamId}
            onChange={setTeamId}
          />

          {/* DATES */}
          <div className={styles.row}>
            <div className={styles.col}>
              <label className={styles.label}>Start</label>
              <input
                className={styles.input}
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>

            <div className={styles.col}>
              <label className={styles.label}>End</label>
              <input
                className={styles.input}
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </div>
          </div>

          {/* GOAL */}
          <label className={styles.label}>Goal (optional)</label>
          <textarea
            className={styles.textarea}
            rows={3}
            placeholder="Sprint goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />

          {/* ACTIONS */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.ghost}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primary}
              disabled={saving}
            >
              {saving ? "Creating..." : "Create Sprint"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
