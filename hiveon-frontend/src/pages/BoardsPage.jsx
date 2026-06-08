import React, { useEffect, useState, useMemo, useCallback } from "react";
import api from "../api/apiClient";
import ProjectPicker from "../components/ProjectPicker";
import TeamPicker from "../components/TeamPicker";

import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";

import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import styles from "./BoardsPage.module.css";

const COLUMNS = [
  { key: "To Do",      label: "To Do",      color: "todo" },
  { key: "In Progress",label: "In Progress", color: "inprogress" },
  { key: "In Review",  label: "In Review",  color: "inreview" },
  { key: "Done",       label: "Done",       color: "done" },
  { key: "Blocked",    label: "Blocked",    color: "blocked" },
];

const TYPE_META = {
  UserStory: { label: "Story",   bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  Bug:       { label: "Bug",     bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  Support:   { label: "Support", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  Task:      { label: "Task",    bg: "#faf5ff", color: "#7c3aed", border: "#ddd6fe" },
};

const PRIORITY_META = {
  critical: { label: "Critical", color: "#dc2626" },
  high:     { label: "High",     color: "#ea580c" },
  medium:   { label: "Medium",   color: "#d97706" },
  low:      { label: "Low",      color: "#16a34a" },
};

export default function BoardsPage() {
  const [projectId, setProjectId] = useState(localStorage.getItem("currentProjectId") || "");
  const [teamId, setTeamId] = useState(null);
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const loadBoard = useCallback(async () => {
    if (!projectId || !teamId) { setItems([]); return; }
    try {
      setLoading(true);
      const [tasksRes, storiesRes] = await Promise.all([
        api.get("/tasks", { params: { projectId } }),
        api.get("/userstories", { params: { projectId } }),
      ]);

      const stories = (storiesRes.data || [])
        .filter(s => !teamId || !s.teamId || s.teamId === teamId)
        .map(s => ({
          id: s.id, title: s.title, description: s.description,
          status: s.status ?? "To Do", order: s.order ?? 0,
          priority: s.priority, assigneeId: s.assigneeId,
          assigneeName: s.assigneeName, targetForSprint: s.targetForSprint,
          type: "UserStory",
        }));

      const tasks = (tasksRes.data || [])
        .filter(t => t.teamId === teamId)
        .map(t => ({
          id: t.id, title: t.title, description: t.description,
          status: t.status ?? "To Do", order: t.order ?? 0,
          priority: t.priority, assigneeId: t.assigneeId,
          assigneeName: t.assigneeName, type: t.type,
        }));

      setItems([...stories, ...tasks]);
    } catch (err) {
      console.error("Board load failed", err?.response || err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, teamId]);

  const grouped = useMemo(() => {
    const map = new Map(COLUMNS.map(c => [c.key, []]));
    items.forEach(item => {
      const col = map.has(item.status) ? item.status : "To Do";
      map.get(col).push(item);
    });
    for (const c of COLUMNS) map.get(c.key).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return map;
  }, [items]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  function getColumnOf(id) {
    for (const col of COLUMNS) {
      if (grouped.get(col.key).find(x => x.id === id)) return col.key;
    }
    return null;
  }

  async function persistMove(id, status, order) {
    try {
      await api.patch("/board/move", { ticketId: id, status, order });
    } catch (err) {
      console.error("Move persist failed", err);
      loadBoard();
    }
  }

  const activeItem = items.find(i => i.id === activeId);

  const totalItems = items.length;
  const doneCount = (grouped.get("Done") || []).length;
  const blockedCount = (grouped.get("Blocked") || []).length;
  const inProgressCount = (grouped.get("In Progress") || []).length;

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleBlock}>
            <div className={styles.titleRow}>
              <span className={styles.titleIcon}>⊞</span>
              <h1 className={styles.h1}>Board</h1>
            </div>
            <p className={styles.sub}>Drag tickets across columns to update status.</p>
          </div>

          <div className={styles.controls}>
            <div className={styles.formGroup}>
              <label className={styles.controlLabel}>Project</label>
              <ProjectPicker value={projectId} onChange={setProjectId} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.controlLabel}>Team</label>
              <TeamPicker projectId={projectId} value={teamId} onChange={setTeamId} />
            </div>
            <button className={styles.refreshBtn} onClick={loadBoard} title="Refresh board">
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Stats strip */}
        {(projectId && teamId) && (
          <div className={styles.statsStrip}>
            <div className={styles.stat}>
              <span className={styles.statNum}>{totalItems}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
            <div className={styles.statDiv} />
            <div className={styles.stat}>
              <span className={`${styles.statNum} ${styles.statBlue}`}>{inProgressCount}</span>
              <span className={styles.statLabel}>In Progress</span>
            </div>
            <div className={styles.statDiv} />
            <div className={styles.stat}>
              <span className={`${styles.statNum} ${styles.statGreen}`}>{doneCount}</span>
              <span className={styles.statLabel}>Done</span>
            </div>
            <div className={styles.statDiv} />
            <div className={styles.stat}>
              <span className={`${styles.statNum} ${styles.statRed}`}>{blockedCount}</span>
              <span className={styles.statLabel}>Blocked</span>
            </div>

            {totalItems > 0 && (
              <div className={styles.progressWrap}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${Math.round((doneCount / totalItems) * 100)}%` }} />
                </div>
                <span className={styles.progressLabel}>{Math.round((doneCount / totalItems) * 100)}% done</span>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Empty prompt ── */}
      {(!projectId || !teamId) && (
        <div className={styles.emptyPrompt}>
          <span className={styles.emptyPromptIcon}>◎</span>
          <span className={styles.emptyPromptText}>
            {!projectId ? "Select a project to get started." : "Now pick a team to load the board."}
          </span>
        </div>
      )}

      {/* ── Board ── */}
      {projectId && teamId && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => setActiveId(e.active.id)}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={(event) => {
            const { active, over } = event;
            setActiveId(null);
            if (!over) return;
            const fromCol = getColumnOf(active.id);
            const overIsCol = COLUMNS.some(c => c.key === over.id);
            const toCol = overIsCol ? over.id : getColumnOf(over.id);
            if (!fromCol || !toCol) return;
            const toList = grouped.get(toCol);
            let toIndex = overIsCol ? toList.length : toList.findIndex(i => i.id === over.id);
            if (toIndex < 0) toIndex = toList.length;
            setItems(prev => prev.map(t =>
              t.id === active.id ? { ...t, status: toCol, order: toIndex } : t
            ));
            persistMove(active.id, toCol, toIndex);
          }}
        >
          {/* Scroll hint */}
          <div className={styles.scrollHint}>
            <span>← scroll to see all columns →</span>
          </div>

          <div className={styles.boardWrap}>
            <section className={styles.board} aria-busy={loading}>
              {COLUMNS.map(col => {
                const colItems = grouped.get(col.key) || [];
                return (
                  <BoardColumn key={col.key} id={col.key} title={col.label} color={col.color} items={colItems} loading={loading}>
                    <SortableContext items={colItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      {colItems.map(task => (
                        <SortableBoardCard key={task.id} task={task} />
                      ))}
                    </SortableContext>
                  </BoardColumn>
                );
              })}
            </section>
          </div>

          <DragOverlay>
            {activeItem ? (
              <div className={styles.dragOverlay}>
                <BoardCard task={activeItem} isOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function BoardColumn({ id, title, color, items, loading, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className={`${styles.column} ${styles[`col_${color}`]}`}>
      <div className={styles.columnHead}>
        <div className={styles.columnHeadLeft}>
          <span className={`${styles.colDot} ${styles[`dot_${color}`]}`} />
          <span className={styles.columnTitle}>{title}</span>
        </div>
        <span className={`${styles.columnCount} ${styles[`count_${color}`]}`}>{items.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`${styles.columnBody} ${isOver ? styles.columnBodyOver : ""}`}
      >
        {loading ? (
          <>
            <div className={styles.skeleton} />
            <div className={styles.skeleton} style={{ opacity: 0.55 }} />
          </>
        ) : items.length === 0 ? (
          <div className={styles.empty}>Drop here</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function SortableBoardCard({ task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        touchAction: "none",
      }}
    >
      <BoardCard task={task} />
    </div>
  );
}

function BoardCard({ task, isOverlay }) {
  const typeMeta = TYPE_META[task.type] || TYPE_META.Task;
  const pKey = (task.priority || "medium").toLowerCase();
  const priorityMeta = PRIORITY_META[pKey] || PRIORITY_META.medium;

  const initials = (task.assigneeName || "")
    .split(" ").filter(Boolean).slice(0, 2)
    .map(s => s[0].toUpperCase()).join("") || "?";

  return (
    <article className={`${styles.card} ${isOverlay ? styles.cardOverlay : ""}`}>
      {/* Type + priority row */}
      <div className={styles.cardTop}>
        <span
          className={styles.cardType}
          style={{ background: typeMeta.bg, color: typeMeta.color, borderColor: typeMeta.border }}
        >
          {typeMeta.label}
        </span>
        {task.priority && (
          <span className={styles.cardPriority} style={{ color: priorityMeta.color }}>
            ● {priorityMeta.label}
          </span>
        )}
      </div>

      {/* Title */}
      <div className={styles.cardTitle}>{task.title || "Untitled"}</div>

      {/* Sprint target (stories only) */}
      {task.type === "UserStory" && task.targetForSprint && (
        <div className={styles.cardSprint}>
          ⚡ {task.targetForSprint}
        </div>
      )}

      {/* Footer: assignee */}
      <div className={styles.cardFooter}>
        <div className={styles.assignee}>
          <span className={styles.assigneeAvatar}>{initials}</span>
          <span className={styles.assigneeName}>{task.assigneeName || "Unassigned"}</span>
        </div>
      </div>
    </article>
  );
}