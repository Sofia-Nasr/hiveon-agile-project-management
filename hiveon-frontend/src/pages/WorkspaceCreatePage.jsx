// src/pages/WorkspaceCreatePage.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createWorkspace } from "../api/workspaceApi";
import styles from "./WorkspaceCreatePage.module.css";

export default function WorkspaceCreatePage() {
  const { setWorkspace } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      // ⭐ FIXED: use createWorkspace directly
      const ws = await createWorkspace(name);

      // Save to auth context
      setWorkspace(ws.id);

      // Redirect user
      window.location.href = "/projects";
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={submit}>
        <h2>Create Workspace</h2>

        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workspace Name"
        />

        <button className={styles.button} disabled={saving}>
          {saving ? "Creating…" : "Create Workspace"}
        </button>
      </form>
    </div>
  );
}
