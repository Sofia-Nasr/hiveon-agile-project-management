import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import ProjectPicker from "../components/ProjectPicker";
import NewStoryModal from '../components/NewStoryModal';
import styles from "./UserStoriesPage.module.css";

function PriorityPill({ value = "Medium" }) {
  const key = (value || "Medium").toLowerCase();
  return (
    <span className={`${styles.pill} ${styles[`pill_${key}`]}`}>
      {value}
    </span>
  );
}

export default function UserStoriesPage() {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState(
    localStorage.getItem("currentProjectId") || ""
  );

  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [newOpen, setNewOpen] = useState(false);

  const canCreate = ["ProductOwner", "ScrumMaster"].includes(user?.role);

  const load = useCallback(async () => {
  if (!projectId) return;
  setLoading(true);
  try {
    // Call the resource only (no extra /api here)
    const res = await api.get('/userstories', { params: { projectId } });
    setStories(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    const status = err?.response?.status;
    const data   = err?.response?.data;
    console.error('Load stories failed', { status, data, err });
    alert(`Failed to load user stories. [${status ?? 'no status'}] ${JSON.stringify(data ?? '')}`);
  } finally {
    setLoading(false);
  }
}, [projectId]);


  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return stories.filter((s) => {
      const matchQ =
        !needle ||
        s.title?.toLowerCase().includes(needle) ||
        s.description?.toLowerCase().includes(needle);
      const matchStatus = statusFilter === "All" || s.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [stories, q, statusFilter]);

  const projectName =
    localStorage.getItem("currentProjectName") || "Selected Project";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.h1}>User Stories</h1>
          <p className={styles.sub}>
            Create, view, and manage user stories for <strong>{projectName}</strong>.
          </p>
        </div>

        <div className={styles.headerRight}>
          <ProjectPicker value={projectId} onChange={setProjectId} />
          <input
            className={styles.search}
            placeholder="Search stories…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className={styles.filter}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            <option>To Do</option>
            <option>In Progress</option>
            <option>In Review</option>
            <option>Done</option>
            <option>Blocked</option>
          </select>
          {canCreate && (
            <button
              className={styles.primary}
              onClick={() => setNewOpen(true)}
              disabled={!projectId}
            >
              ＋ New Story
            </button>
          )}
        </div>
      </header>

      {!projectId && (
        <div className={styles.banner}>
          <strong>No project selected.</strong> Pick a project above or{" "}
          <a href="/create-project">create one</a>.
        </div>
      )}

      <section className={styles.panel} aria-busy={loading}>
        <div className={styles.tableHead}>
          <span>Title</span>
          <span>Epic</span>
          <span>Priority</span>
          <span>SP</span>
          <span>Status</span>
          <span className={styles.right}>Actions</span>
        </div>

        <div className={styles.tableBody}>
          {loading ? (
            <div className={styles.skeleton} />
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>No stories found.</div>
          ) : (
            filtered.map((s) => (
              <div key={s.id} className={styles.row}>
                <div className={styles.colTitle} title={s.title}>
                  {s.title}
                  {s.description && (
                    <div className={styles.desc} title={s.description}>
                      {s.description}
                    </div>
                  )}
                </div>

                <div className={styles.colEpic}>
                  {s.epicId ? s.epicId.slice(0, 8) : "—"}
                </div>

                <div className={styles.colPriority}>
                  <PriorityPill value={s.priority || "Medium"} />
                </div>

                <div className={styles.colSP}>{s.storyPoints ?? 0}</div>

                <div className={styles.colStatus}>
                  <span className={styles.status}>{s.status || "To Do"}</span>
                </div>

                <div className={styles.colActions}>
                  {/* Reserved for future: View / Edit / Delete */}
                  <button
                    className={styles.btn}
                    onClick={() => alert("Edit coming soon")}
                    disabled
                    title="Coming soon"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <NewStoryModal
        projectId={projectId}
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => {
          setNewOpen(false);
          load();
        }}
      />
    </div>
  );
}
