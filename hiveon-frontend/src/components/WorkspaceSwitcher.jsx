// src/components/WorkspaceSwitcher.jsx
import React, { useEffect, useState, useRef } from "react";
import styles from "./WorkspaceSwitcher.module.css";
import {
  getWorkspaces,
  createWorkspace,
  switchWorkspace,
} from "../api/workspaceApi";
import { useAuth } from "../context/AuthContext";

export default function WorkspaceSwitcher() {
  const { workspaceId, login } = useAuth();

  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const wrapperRef = useRef(null);
  const currentId = workspaceId;

  // Load workspaces
  useEffect(() => {
    (async () => {
      try {
        const ws = await getWorkspaces();
        setWorkspaces(ws || []);
      } catch (err) {
        console.error("Failed to load workspaces", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Close dropdown on outside click (SAFE)
  useEffect(() => {
    function handleOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // SWITCH WORKSPACE (JWT regen)
  async function handleSwitch(wsId) {
    try {
      const res = await switchWorkspace(wsId);

      // APPLY NEW JWT (contains workspaceId claim)
      login(res.token);

      setOpen(false);

      // hard reload scoped data
      window.location.href = "/projects";
    } catch (err) {
      console.error("Failed to switch workspace", err);
    }
  }

  // CREATE WORKSPACE → auto switch
  async function handleCreate() {
    if (!newName.trim()) return;

    try {
      setCreating(true);
      const created = await createWorkspace(newName.trim());

      setWorkspaces((prev) => [...prev, created]);
      setNewName("");

      if (created?.id) {
        await handleSwitch(created.id);
      }
    } catch (err) {
      console.error("Failed to create workspace", err);
    } finally {
      setCreating(false);
    }
  }

  const currentName =
    workspaces.find((w) => w.id === currentId)?.name || "No Workspace";

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        className={styles.current}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <span className={styles.name}>{currentName}</span>
        <span className={styles.chevron}>▾</span>
      </button>

      {open && (
        <div
          className={styles.panel}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.sectionTitle}>Workspaces</div>

          {loading ? (
            <div className={styles.loading}>Loading…</div>
          ) : (
            workspaces.map((ws) => (
              <button
                key={ws.id}
                className={`${styles.item} ${
                  ws.id === currentId ? styles.active : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSwitch(ws.id);
                }}
              >
                <div className={styles.itemName}>{ws.name}</div>
                {ws.role && <div className={styles.role}>{ws.role}</div>}
              </button>
            ))
          )}

          <div className={styles.createBlock}>
            <input
              placeholder="New workspace name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={styles.input}
            />
            <button
              className={styles.createBtn}
              onClick={(e) => {
                e.stopPropagation();
                handleCreate();
              }}
              disabled={creating}
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
