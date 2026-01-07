// src/components/workspace/WorkspaceModal.jsx
import React, { useState } from "react";
import styles from "./WorkspaceModal.module.css";
import { createWorkspace, switchWorkspace } from "../api/workspaceApi";
import { useAuth } from "../context/AuthContext";

export default function WorkspaceModal() {
  const { user, login } = useAuth();
  const [name, setName] = useState(`${user?.username || "My"}'s Workspace`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) return;

    try {
      setSaving(true);
      setError("");

      const ws = await createWorkspace(name.trim());
      const res = await switchWorkspace(ws.id);

      login({
        token: res.token,
        activeWorkspaceId: res.workspace.id,
      });
    } catch (err) {
      setError("Failed to create workspace.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Create Your Workspace</h2>
        <p className={styles.subtitle}>
          A workspace helps organize your teams, projects, and sprints.
        </p>

        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workspace name"
        />

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.primaryBtn}
          onClick={handleCreate}
          disabled={saving}
        >
          {saving ? "Creating…" : "Create Workspace"}
        </button>
      </div>
    </div>
  );
}
