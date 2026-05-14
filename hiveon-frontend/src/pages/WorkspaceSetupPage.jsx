import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getWorkspaces,
  createWorkspace,
  switchWorkspace,
} from "../api/workspaceApi";
import styles from "./WorkspaceSetupPage.module.css";

export default function WorkspaceSetupPage() {
  const navigate = useNavigate();
  const { selectWorkspace } = useAuth(); // 🔧 CHANGED

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await getWorkspaces();
        setWorkspaces(list || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load workspaces");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleCreate() {
  if (!newName.trim()) return;

  try {
    setCreating(true);
    setError("");

    // Create workspace
    const ws = await createWorkspace(newName.trim());

    // Add to UI list
    setWorkspaces((prev) => [...prev, ws]);

    // IMPORTANT:
    // Immediately switch into the new workspace
    const data = await switchWorkspace(ws.id);

    // Store NEW JWT with workspaceId claim
    selectWorkspace(data.token);

    setNewName("");

    // Go to app
    navigate("/projects", { replace: true });

  } catch (err) {
    console.error(err);
    setError("Failed to create workspace");
  } finally {
    setCreating(false);
  }
}
  async function handleSelect(workspaceId) {
    try {
      const data = await switchWorkspace(workspaceId);

      selectWorkspace(data.token); // 🔧 KEY FIX
      navigate("/projects", { replace: true });
    } catch (err) {
      console.error(err);
      setError("Failed to switch workspace");
    }
  }

  async function joinWorkspace() {
    if (!joinCode.trim()) return;

    try {
      setJoining(true);
      setError("");

      const res = await fetch("/api/workspace/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ code: joinCode.trim() }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      selectWorkspace(data.token); // 🔧 KEY FIX
      navigate("/projects", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to join workspace");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Set up your workspace</h1>
        <p className={styles.subtitle}>
          Create, join, or select a workspace to continue.
        </p>

        {loading ? (
          <div className={styles.loading}>Loading workspaces…</div>
        ) : workspaces.length > 0 ? (
          <div className={styles.list}>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                className={styles.workspaceItem}
                onClick={() => handleSelect(ws.id)}
              >
                {ws.name}
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            You are not part of any workspace yet.
          </div>
        )}
<div className={styles.section}>
  <div className={styles.createBox}>
    <input
      placeholder="New workspace name"
      value={newName}
      onChange={(e) => setNewName(e.target.value)}
      className={styles.input}
    />

    <button
      onClick={handleCreate}
      disabled={creating}
      className={styles.createBtn}
    >
      {creating ? "Creating…" : "Create workspace"}
    </button>
  </div>
</div>

<div className={styles.section}>
  <div className={styles.createBox}>
    <input
      placeholder="Enter join code"
      value={joinCode}
      onChange={(e) => setJoinCode(e.target.value)}
      className={styles.input}
    />

    <button
      onClick={joinWorkspace}
      disabled={joining}
      className={styles.createBtn}
    >
      {joining ? "Joining…" : "Join workspace"}
    </button>
  </div>
</div>
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}
