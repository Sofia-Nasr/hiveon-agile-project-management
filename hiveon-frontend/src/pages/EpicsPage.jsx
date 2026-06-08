import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import api from "../api/apiClient";
import EpicCard from "../components/EpicCard";
import ProjectPicker from "../components/ProjectPicker";
import { formatAxiosError } from "../utils/httpError";

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

import styles from "./EpicsPage.module.css";

const COLUMNS = [
  { key: "To Do",       label: "To Do",       color: "todo" },
  { key: "In Progress", label: "In Progress",  color: "inprogress" },
  { key: "Testing",     label: "Testing",      color: "testing" },
  { key: "In Review",   label: "In Review",    color: "inreview" },
  { key: "Done",        label: "Done",         color: "done" },
  { key: "Blocked",     label: "Blocked",      color: "blocked" },
];

export default function EpicsPage() {
  const [projectId, setProjectId] = useState(
    localStorage.getItem("currentProjectId") || ""
  );
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState("");
  const [teams, setTeams] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const fetchEpics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const q = projectId ? `?projectId=${projectId}` : "";
      const res = await api.get(`/epic${q}`);
      setEpics(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load epics", err?.response || err);
      setError(formatAxiosError?.(err) || "Failed to load epics. Please try again.");
      setEpics([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchEpics(); }, [fetchEpics]);

  useEffect(() => {
    if (!projectId) { setTeams([]); return; }
    let alive = true;
    (async () => {
      try {
        const res = await api.get("/teams", { params: { projectId } });
        if (!alive) return;
        setTeams(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("[EpicsPage] Failed to load teams:", err?.response || err);
        setTeams([]);
      }
    })();
    return () => { alive = false; };
  }, [projectId]);

  const epicsWithAssignee = useMemo(() => {
    if (!teams.length) return epics;
    const memberMap = new Map();
    for (const t of teams) {
      for (const m of (Array.isArray(t.members) ? t.members : [])) {
        if (m?.id) memberMap.set(m.id, m);
      }
    }
    return epics.map((e) => {
      const assigneeId = e.assigneeId || e.AssigneeId || e.assigneeID;
      const member = assigneeId ? memberMap.get(assigneeId) : null;
      return {
        ...e,
        assigneeName: member?.name || member?.fullName || member?.email || null,
        assigneeAvatarUrl: member?.avatarUrl || null,
      };
    });
  }, [epics, teams]);

  const summary = useMemo(() => {
    const total = epicsWithAssignee.length;
    const done = epicsWithAssignee.filter(e => (e.status || "").toLowerCase() === "done").length;
    const inProgress = epicsWithAssignee.filter(e => (e.status || "").toLowerCase() === "in progress").length;
    const blocked = epicsWithAssignee.filter(e => (e.status || "").toLowerCase() === "blocked").length;
    return { total, done, inProgress, blocked };
  }, [epicsWithAssignee]);

  const grouped = useMemo(() => {
    const m = new Map(COLUMNS.map((c) => [c.key, []]));
    for (const ep of epicsWithAssignee) {
      const k = ep.status && m.has(ep.status) ? ep.status : "To Do";
      m.get(k).push(ep);
    }
    for (const c of COLUMNS) m.get(c.key).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return m;
  }, [epicsWithAssignee]);

  function moveWithinColumn(columnKey, fromIndex, toIndex) {
    setEpics((prev) => {
      const items = (grouped.get(columnKey) || []).slice();
      const newList = arrayMove(items, fromIndex, toIndex);
      const ids = newList.map((x) => x.id);
      return prev.map((e) =>
        e.status === columnKey ? { ...e, order: ids.indexOf(e.id) } : e
      );
    });
  }

  function moveAcrossColumns(id, fromColumn, toColumn, toIndex) {
    setEpics((prev) =>
      prev.map((e) => {
        if (e.id === id) return { ...e, status: toColumn, order: toIndex };
        if (e.status === toColumn && (e.order ?? 0) >= toIndex) return { ...e, order: (e.order ?? 0) + 1 };
        return e;
      })
    );
  }

  async function persistReorder(columnKey) {
    const ids = (grouped.get(columnKey) || []).sort((a,b)=>(a.order??0)-(b.order??0)).map(e=>e.id);
    try {
      await api.patch("/epic/reorder", { projectId, column: columnKey, epicIds: ids });
    } catch (err) {
      console.error("Reorder persist failed", err?.response || err);
      fetchEpics();
    }
  }

  async function persistMove(id, toColumn, toIndex) {
    try {
      await api.patch(`/epic/${id}/status`, { status: toColumn, order: toIndex });
    } catch (err) {
      console.error("Move persist failed", err?.response || err);
      fetchEpics();
    }
  }

  function getColumnOf(id) {
    for (const c of COLUMNS) {
      if ((grouped.get(c.key) || []).find((e) => e.id === id)) return c.key;
    }
    return "To Do";
  }

  const progressPct = summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;

  return (
    <div className={styles.page}>
      {/* ── HEADER ── */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleBlock}>
            <div className={styles.titleRow}>
              <span className={styles.titleIcon}>◈</span>
              <h1 className={styles.h1}>Epics</h1>
            </div>
            <p className={styles.sub}>High-level initiatives — drag to reprioritise, drop to change status.</p>
          </div>

          <div className={styles.headerRight}>
            <ProjectPicker
              value={projectId}
              onChange={(id) => {
                setProjectId(id);
                localStorage.setItem("currentProjectId", id || "");
              }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{summary.total}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={`${styles.statNum} ${styles.statBlue}`}>{summary.inProgress}</span>
            <span className={styles.statLabel}>In Progress</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={`${styles.statNum} ${styles.statGreen}`}>{summary.done}</span>
            <span className={styles.statLabel}>Done</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={`${styles.statNum} ${styles.statRed}`}>{summary.blocked}</span>
            <span className={styles.statLabel}>Blocked</span>
          </div>

          {/* Progress bar */}
          <div className={styles.progressWrap}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
            <span className={styles.progressLabel}>{progressPct}% done</span>
          </div>
        </div>
      </header>

      {/* ── BANNERS ── */}
      {!projectId && (
        <div className={styles.banner}>
          <span className={styles.bannerIcon}>◎</span>
          <span><strong>No project selected.</strong> Pick a project above or{" "}
            <a href="/create-project">create one</a>.
          </span>
        </div>
      )}
      {error && (
        <div className={styles.errorBanner}>
          <span className={styles.bannerIcon}>⚠</span>
          {error}
        </div>
      )}

      {/* ── BOARD ── */}
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
          const overIsColumn = COLUMNS.some((c) => c.key === over.id);
          const toCol = overIsColumn ? String(over.id) : getColumnOf(over.id);
          if (!fromCol || !toCol) return;
          const fromList = grouped.get(fromCol) || [];
          const toList = grouped.get(toCol) || [];
          const fromIndex = fromList.findIndex((x) => x.id === active.id);
          let toIndex = overIsColumn ? toList.length : toList.findIndex((x) => x.id === over.id);
          if (toIndex < 0) toIndex = toList.length;
          if (fromCol === toCol) {
            if (fromIndex === toIndex) return;
            moveWithinColumn(toCol, fromIndex, toIndex);
            persistReorder(toCol);
          } else {
            moveAcrossColumns(active.id, fromCol, toCol, toIndex);
            persistMove(active.id, toCol, toIndex);
          }
        }}
      >
        <section className={styles.board} aria-busy={loading}>
          {COLUMNS.map((col) => {
            const items = grouped.get(col.key) || [];
            return (
              <Column key={col.key} id={col.key} title={col.label} color={col.color} items={items}>
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {loading ? (
                    <>
                      <div className={styles.skeleton} />
                      <div className={styles.skeleton} style={{ opacity: 0.6 }} />
                    </>
                  ) : items.length === 0 ? (
                    <div className={styles.empty}>Drop epics here</div>
                  ) : (
                    items.map((ep, index) => (
                      <SortableEpic key={ep.id} epic={ep} index={index} column={col.key} onRefresh={fetchEpics} />
                    ))
                  )}
                </SortableContext>
              </Column>
            );
          })}
        </section>

        <DragOverlay>
          {activeId ? (
            <div className={styles.dragOverlay}>
              <EpicCard epic={epicsWithAssignee.find((e) => e.id === activeId)} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({ id, title, color, items, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className={`${styles.column} ${styles[`col_${color}`]}`} data-col={id}>
      <div className={styles.columnHead}>
        <div className={styles.columnHeadLeft}>
          <span className={`${styles.colDot} ${styles[`dot_${color}`]}`} />
          <span className={styles.columnTitle}>{title}</span>
        </div>
        <span className={`${styles.count} ${styles[`count_${color}`]}`}>{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`${styles.columnBody} ${isOver ? styles.columnBodyOver : ""}`}
        aria-label={id}
      >
        {children}
      </div>
    </div>
  );
}

function SortableEpic({ epic, index, column, onRefresh }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: epic.id, data: { column, index } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: "none",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <EpicCard epic={epic} onRefresh={onRefresh} />
    </div>
  );
}