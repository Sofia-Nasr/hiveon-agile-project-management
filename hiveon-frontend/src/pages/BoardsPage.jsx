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

// Column definitions (Jira-style)
const COLUMNS = [
  { key: "To Do", label: "To Do" },
  { key: "In Progress", label: "In Progress" },
  { key: "In Review", label: "In Review" },
  { key: "Done", label: "Done" },
  { key: "Blocked", label: "Blocked" },
];

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
  if (!projectId || !teamId) {
    setItems([]);
    return;
  }

  try {
    setLoading(true);

    const [tasksRes, storiesRes] = await Promise.all([
      api.get("/tasks", { params: { projectId } }),
      api.get("/userstories", { params: { projectId } }),
    ]);

    // Normalize User Stories
    const stories = (storiesRes.data || [])
      .filter(s => s.teamId === teamId) // IMPORTANT
      .map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        status: s.status ?? "To Do",
        order: s.order ?? 0,
        priority: s.priority,
        assigneeId: s.assigneeId,
        type: "UserStory",
      }));

    // Normalize Tasks (Bug / Support)
    const tasks = (tasksRes.data || [])
      .filter(t => t.teamId === teamId)
      .map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status ?? "To Do",
        order: t.order ?? 0,
        priority: t.priority,
        assigneeId: t.assigneeId,
        type: t.type, // Bug | Support
      }));

    setItems([...stories, ...tasks]);
  } catch (err) {
    console.error("Board load failed", err?.response || err);
    setItems([]);
  } finally {
    setLoading(false);
  }
}, [projectId, teamId]);
// Group items by column (status)
const grouped = useMemo(() => {
  const map = new Map(COLUMNS.map(c => [c.key, []]));

  items.forEach(item => {
    const col = map.has(item.status) ? item.status : "To Do";
    map.get(col).push(item);
  });

  // Keep stable ordering inside columns
  for (const c of COLUMNS) {
    map.get(c.key).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  return map;
}, [items]);
useEffect(() => {
  loadBoard();
}, [loadBoard]);

  // Drag handlers
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

  return (
    <div className={styles.page}>
      {/* Top Controls */}
      <div className={styles.topBar}>
        <div className={styles.formGroup}>
          <label>Project</label>
          <ProjectPicker value={projectId} onChange={setProjectId} />
        </div>

        <div className={styles.formGroup}>
          <label>Team</label>
          <TeamPicker projectId={projectId} value={teamId} onChange={setTeamId} />
        </div>

        <button className={styles.refreshBtn} onClick={loadBoard}>Refresh</button>
      </div>

      {/* Board */}
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

          const fromList = grouped.get(fromCol);
          const toList = grouped.get(toCol);
          const fromIndex = fromList.findIndex(i => i.id === active.id);
          
          let toIndex;
          if (overIsCol) {
            toIndex = toList.length; 
          } else {
            toIndex = toList.findIndex(i => i.id === over.id);
            if (toIndex < 0) toIndex = toList.length;
          }

          // Update UI immediately
          setItems(prev =>
            prev.map(t => {
              if (t.id === active.id)
                return { ...t, status: toCol, order: toIndex };
              return t;
            })
          );

          persistMove(active.id, toCol, toIndex);
        }}
      >
       <section className={styles.board}>
  {COLUMNS.map(col => {
    const colItems = grouped.get(col.key) || [];

    return (
      <BoardColumn
        key={col.key}
        id={col.key}
        title={col.label}
        items={colItems}
      >
        <SortableContext
          items={colItems.map(i => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {colItems.map(task => (
            <SortableBoardCard key={task.id} task={task} />
          ))}
        </SortableContext>
      </BoardColumn>
    );
  })}
</section>

        <DragOverlay>
          {activeId ? (
            <div className={styles.dragOverlay}>
              Dragging…
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
function BoardColumn({ id, title, items, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className={styles.column}>
      <div className={styles.columnHead}>
        <span>{title}</span>
        <span className={styles.columnCount}>{items.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`${styles.columnBody} ${isOver ? styles.columnBodyOver : ""}`}
      >
        {items.length === 0 ? (
          <div className={styles.empty}>No tasks</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
function SortableBoardCard({ task }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={styles.card}
    >
      <div className={styles.cardTitle}>{task.title}</div>

      <div className={styles.cardMetaRow}>
        <span className={styles.cardType}>{task.type}</span>
        <span className={styles.cardAssignee}>
          👤 {task.assigneeName || "Unassigned"}
        </span>
      </div>

      {task.type === "UserStory" && task.targetForSprint && (
        <div className={styles.cardTarget}>🎯 {task.targetForSprint}</div>
      )}
    </div>
  );
}

