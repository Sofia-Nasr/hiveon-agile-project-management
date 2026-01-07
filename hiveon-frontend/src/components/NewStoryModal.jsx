import React, { useEffect, useState } from "react";
import api from "../api/apiClient";
import styles from "./NewStoryModal.module.css";

export default function NewStoryModal({
  projectId,
  open,
  onClose,
  onCreated,
  extraPayload,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [storyPoints, setStoryPoints] = useState(0);
  const [epicId, setEpicId] = useState("");
  const [epics, setEpics] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    (async () => {
      try {
        const res = await api.get(`/epic?projectId=${projectId}`);
        setEpics(Array.isArray(res.data) ? res.data : []);
      } catch {
        setEpics([]);
      }
    })();
  }, [open, projectId]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setStoryPoints(0);
    setEpicId("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSaving(true);
      await api.post("/userstories", {
        projectId,
        epicId: epicId || null,
        title: title.trim(),
        description: description?.trim() || null,
        priority,
        storyPoints: Number(storyPoints) || 0,
        ...(extraPayload || {}),
      });
      reset();
      onCreated?.();
    } catch (err) {
      console.error("Story create failed", err?.response || err);
      alert(err?.response?.data ?? "Create failed");
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
          <h3 className={styles.title}>New User Story</h3>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </header>

        <form className={styles.form} onSubmit={submit}>
          <label className={styles.label}>Title</label>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter story title"
            required
          />

          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            rows={3}
            placeholder="Briefly describe the story"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className={styles.row}>
            <div className={styles.col}>
              <label className={styles.label}>Priority</label>
              <select
                className={styles.input}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div className={styles.col}>
              <label className={styles.label}>Story Points</label>
              <input
                type="number"
                className={styles.input}
                min="0"
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
              />
            </div>
          </div>

          <label className={styles.label}>Epic (optional)</label>
          <select
            className={styles.input}
            value={epicId}
            onChange={(e) => setEpicId(e.target.value)}
          >
            <option value="">— None —</option>
            {epics.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>

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
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
