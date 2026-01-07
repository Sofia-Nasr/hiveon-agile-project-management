import React, { useEffect, useMemo, useState } from "react";
import api from "../api/apiClient";
import styles from "./SprintPlanningModal.module.css";

export default function SprintPlanningModal({
  open,
  onClose,
  projectId,
  sprint,
  onAssigned,
}) {
  const [items, setItems] = useState([]);
 const [selected, setSelected] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // filters
  const [type, setType] = useState("All");
  const [priority, setPriority] = useState("All");

  useEffect(() => {
    if (!open || !projectId) return;

    let alive = true;
    setLoading(true);

    api
      .get(`/backlog?projectId=${projectId}`)
      .then((res) => {
        if (!alive) return;

        // only backlog items (SprintId == null)
        const backlog = (res.data || []).filter(
          (x) => x.sprintId == null
        );
        setItems(backlog);
      })
      .catch((err) => {
        console.error("Failed to load backlog", err);
        alert("Failed to load backlog");
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [open, projectId]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (type !== "All" && i.ticketType !== type) return false;
      if (priority !== "All" && i.priority !== priority) return false;
      return true;
    });
  }, [items, type, priority]);

function toggle(item) {
  setSelected((prev) => {
    const next = new Map(prev);
    next.has(item.id) ? next.delete(item.id) : next.set(item.id, item);
    return next;
  });
}
async function confirm() {
  if (!selected.size) return;

  if (sprint.status === "Completed") {
    alert("Cannot modify a completed sprint.");
    return;
  }

  // ✅ ONLY allow UserStory, Bug, Support
  const validIds = [...selected.values()]
    .filter(i =>
      i.ticketType === "UserStory" ||
      i.ticketType === "Bug" ||
      i.ticketType === "Support"
    )
    .map(i => i.id);

  if (!validIds.length) {
    alert("Only stories, bugs, and support tasks can be added to a sprint.");
    return;
  }

  try {
    setAssigning(true);
    await api.patch(`/sprints/${sprint.id}/assign`, validIds);
    onAssigned?.();
    onClose();
  } catch (err) {
    console.error("Assign failed", err?.response || err);
    alert(err?.response?.data || "Failed to assign items to sprint");
  } finally {
    setAssigning(false);
  }
}


  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2>Add items to sprint</h2>
            <p className={styles.sub}>
              {sprint.name} · {sprint.status}
            </p>
          </div>
          <button onClick={onClose}>✕</button>
        </header>

        {/* Filters */}
        <div className={styles.filters}>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option>All</option>
            <option>UserStory</option>
            <option>Bug</option>
            <option>Support</option>
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option>All</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>

        {/* List */}
        <div className={styles.list}>
          {loading ? (
            <div className={styles.loading}>Loading…</div>
          ) : filteredItems.length === 0 ? (
            <div className={styles.empty}>
              No backlog items match filters.
            </div>
          ) : (
            filteredItems.map((i) => (
              <label key={i.id} className={styles.row}>
                <input
                  type="checkbox"
                  checked={selected.has(i.id)}
                 onChange={() => toggle(i)}
                  disabled={sprint.status === "Completed"}
                />
                <span className={styles.type}>{i.ticketType}</span>
                <span className={styles.title}>{i.title}</span>
                <span className={styles.priority}>{i.priority}</span>
              </label>
            ))
          )}
        </div>

        <footer className={styles.footer}>
          <button className={styles.ghost} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.primary}
            disabled={!selected.size || assigning}
            onClick={confirm}
          >
            {assigning ? "Adding…" : "Add to Sprint"}
          </button>
        </footer>
      </div>
    </div>
  );
}
