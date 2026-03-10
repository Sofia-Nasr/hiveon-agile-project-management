import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import ProjectPicker from "../components/ProjectPicker";
import NewSprintModal from "./NewSprintModal";
import styles from "./SprintsPage.module.css";
import SprintPlanningModal from "./SprintPlanningModal";
import backlogStyles from "./BacklogPage.module.css";
import CommentsSection from "../components/CommentsSection";

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
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

const STATUSES = [
  "To Do",
  "In Progress",
  "Testing",
  "In Review",
  "Done",
  "Blocked",
];

const TYPES = ["All", "UserStory", "Bug", "Support"];

export default function SprintsPage() {
  const { user } = useAuth();

  const [selectedTask, setSelectedTask] = useState(null);

  const isScrumMaster =
    typeof user?.role === "string" &&
    user.role.trim().toLowerCase() === "scrummaster";

  const [projectId, setProjectId] = useState(
    localStorage.getItem("currentProjectId") || ""
  );
  const [projectName] = useState(
    localStorage.getItem("currentProjectName") || ""
  );

  const [sprints, setSprints] = useState([]);
  const [sprintIndex, setSprintIndex] = useState(0);
  const [tasks, setTasks] = useState([]);

  const [typeFilter, setTypeFilter] = useState("All");
  const [showNewSprint, setShowNewSprint] = useState(false);
  const [showPlanning, setShowPlanning] = useState(false);

  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

 async function persistMove(id, status) {
  try {
    const item = tasks.find(t => t.id === id);
    if (!item) return;

    if (item.type === "UserStory") {
      await api.patch(`/sprints/stories/${id}/status`, { status });
    } else {
      await api.patch(`/tickets/${id}/status`, { status });
    }
  } catch (err) {
    console.error("Persist move failed", err);
  }
}



  // ================= FETCH =================
const fetchSprints = useCallback(async () => {
  if (!projectId) return;
  try {
    const res = await api.get(`/sprints?projectId=${projectId}`);
    const list = res.data || [];
    setSprints(list);
    setSprintIndex((i) => (i >= list.length ? 0 : i));
  } catch (err) {
    console.error("Failed to load sprints", err);
    setSprints([]);
    setSprintIndex(0);
  }
}, [projectId]);


  const fetchTasks = useCallback(async () => {
  if (!projectId) return;

  try {
    const [tasksRes, storiesRes] = await Promise.all([
      api.get(`/tasks?projectId=${projectId}`),
      api.get(`/userstories?projectId=${projectId}`)
    ]);
const normalizedStories = storiesRes.data.map(s => ({
  id: s.id,
  title: s.title,
  description: s.description,
  type: "UserStory",
  ticketType: "UserStory",
  status: s.status,
  sprintId: s.sprintId,
  sprintName: s.sprintName,
  order: s.order ?? 0,
  assigneeId: s.assigneeId,
  assigneeName: s.assigneeName,
  epicId: s.epicId,
  epicName: s.epicName,
  targetForSprint: s.targetForSprint,
  acceptanceCriteria: s.acceptanceCriteria,
  assigneeEmail: s.assigneeEmail, 
  storyPoints: s.storyPoints,
}));

const normalizedTasks = (tasksRes.data || []).map(t => ({
  ...t,
   assigneeEmail: t.assigneeEmail,
  ticketType: t.type,
  type: t.type ?? "Bug",
}));

     setTasks([...normalizedStories, ...normalizedTasks]);
  } catch (err) {
    console.error("Failed to load tasks", err);
    setTasks([]);
  }
}, [projectId]);


  useEffect(() => {
    fetchSprints();
    fetchTasks();
  }, [fetchSprints, fetchTasks]);

  const currentSprint = sprints[sprintIndex];

  // ================= FILTER =================

  const sprintTasks = useMemo(() => {
    if (!currentSprint) return [];
    return tasks.filter(
      (t) =>
        t.sprintId === currentSprint.id &&
        (typeFilter === "All" || t.type === typeFilter)
    );
  }, [tasks, currentSprint, typeFilter]);

  // ================= GROUP =================

  const grouped = useMemo(() => {
    const map = new Map(STATUSES.map((s) => [s, []]));
    sprintTasks.forEach((t) => {
      const key = map.has(t.status) ? t.status : "To Do";
      map.get(key).push(t);
    });
    for (const s of STATUSES) {
      map.get(s).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return map;
  }, [sprintTasks]);

  // ================= HELPERS =================

  function getColumnOf(id) {
    for (const s of STATUSES) {
      if (grouped.get(s)?.some((t) => t.id === id)) return s;
    }
    return "To Do";
  }

  function moveWithinColumn(col, from, to) {
    setTasks((prev) => {
      const items = grouped.get(col) || [];
      const reordered = arrayMove(items, from, to);
      const ids = reordered.map((x) => x.id);

      return prev.map((t) =>
        t.status === col ? { ...t, order: ids.indexOf(t.id) } : t
      );
    });
  }

  function moveAcrossColumns(id, toCol, toIndex) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) return { ...t, status: toCol, order: toIndex };
        if (t.status === toCol && (t.order ?? 0) >= toIndex)
          return { ...t, order: (t.order ?? 0) + 1 };
        return t;
      })
    );
  }

 

  // ================= RENDER =================

  return (
    <div className={styles.page}>
      {currentSprint && (
        <section className={styles.planning}>
          <div className={styles.planningHeader}>
            <div className={styles.sprintNav}>
              <button
                className={styles.navBtn}
                disabled={sprintIndex === 0}
                onClick={() => setSprintIndex((i) => i - 1)}
              >
                ‹
              </button>

              <h2>{currentSprint.name}</h2>

              <button
                className={styles.navBtn}
                disabled={sprintIndex === sprints.length - 1}
                onClick={() => setSprintIndex((i) => i + 1)}
              >
                ›
              </button>
            </div>

            <div className={styles.dates}>
              {fmtDate(currentSprint.startDate)} –{" "}
              {fmtDate(currentSprint.endDate)}
            </div>
          </div>

          <div className={styles.tiles}>
            <Tile label="Total Tasks" value={sprintTasks.length} />
            <Tile
              label="Completed"
              value={sprintTasks.filter((t) => t.status === "Done").length}
              success
            />
            <Tile
              label="In Progress"
              value={sprintTasks.filter((t) => t.status === "In Progress").length}
            />
            <Tile
              label="Remaining Days"
              value={
                currentSprint.endDate
                  ? Math.max(
                      0,
                      Math.ceil(
                        (new Date(currentSprint.endDate) - new Date()) /
                          86400000
                      )
                    )
                  : "—"
              }
            />
          </div>

          <div className={styles.progressWrap}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressBar}
                style={{
                  width: `${
                    sprintTasks.length === 0
                      ? 0
                      : Math.round(
                          (sprintTasks.filter((t) => t.status === "Done")
                            .length /
                            sprintTasks.length) *
                            100
                        )
                  }%`,
                }}
              />
            </div>
          </div>
        </section>
      )}

      <header className={styles.header}>
        <div>
          <h1 className={styles.h1}>Sprint Planning · {projectName}</h1>
          <p className={styles.sub}>Sprint board & execution</p>
        </div>
<div className={styles.headerRight}>
  <div className={styles.toolbar}>
    <ProjectPicker value={projectId} onChange={setProjectId} />

    {isScrumMaster && (
      <button
        className={styles.primaryBtn}
        onClick={() => setShowNewSprint(true)}
      >
        Plan Sprint
      </button>
    )}

    {currentSprint && isScrumMaster && (
      <button
        className={styles.primaryBtn}
        onClick={() => setShowPlanning(true)}
      >
        + Add from Backlog
      </button>
    )}
  </div>
</div>     </header>

      {showPlanning && currentSprint && (
        <SprintPlanningModal
          open
          projectId={projectId}
          sprint={currentSprint}
          onClose={() => setShowPlanning(false)}
          onAssigned={() => {
            fetchTasks();
            fetchSprints();
          }}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(e.active.id)}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={({ active, over }) => {
          setActiveId(null);
          if (!over) return;

          const fromCol = getColumnOf(active.id);
          const toCol = STATUSES.includes(over.id)
            ? over.id
            : getColumnOf(over.id);

          const fromList = grouped.get(fromCol) || [];
          const toList = grouped.get(toCol) || [];

          const fromIndex = fromList.findIndex((t) => t.id === active.id);
          let toIndex = toList.findIndex((t) => t.id === over.id);
          if (toIndex < 0) toIndex = toList.length;

          if (fromCol === toCol) {
            if (fromIndex !== toIndex) {
              moveWithinColumn(toCol, fromIndex, toIndex);
            }
          } else {
            moveAcrossColumns(active.id, toCol, toIndex);
            persistMove(active.id, toCol);
          }
        }}
      >
        <section className={styles.board}>
          {STATUSES.map((status) => {
            const items = grouped.get(status) || [];
            return (
              <SprintColumn key={status} id={status} title={status} items={items}>
                <SortableContext
                  items={items.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((t) => (
                    <SortableSprintCard
                      key={t.id}
                      task={t}
                      onSelect={setSelectedTask}
                    />
                  ))}
                </SortableContext>
              </SprintColumn>
            );
          })}
        </section>

        <DragOverlay>
          {activeId ? (
            <div className={styles.dragOverlay}>
              {tasks.find((t) => t.id === activeId)?.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showNewSprint && (
        <NewSprintModal
          projectId={projectId}
          open
          onClose={() => setShowNewSprint(false)}
          onCreated={fetchSprints}
        />
      )}
      {/* ===== Ticket Detail Overlay (Bottom Drawer) ===== */}
      {selectedTask && (
        <div
          className={backlogStyles.detailOverlay}
          onClick={() => setSelectedTask(null)}
        >
          <div
            className={`${backlogStyles.detailCard} ${backlogStyles.bottomSheetCard}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* little handle like your screenshot */}
            <div className={backlogStyles.sheetHandleWrap}>
              <div className={backlogStyles.sheetHandle} />
            </div>

            <div className={backlogStyles.detailHeader}>
              <div>
                <div className={backlogStyles.detailTypeRow}>
                  <span
                    className={`${backlogStyles.typeBadge} ${
                      selectedTask.ticketType === "Epic"
                        ? backlogStyles.typeEpic
                        : selectedTask.ticketType === "UserStory"
                        ? backlogStyles.typeStory
                        : selectedTask.ticketType === "Bug"
                        ? backlogStyles.typeBug
                        : backlogStyles.typeSupport
                    }`}
                  >
                    {selectedTask.ticketType}
                  </span>
                  <span className={backlogStyles.detailId}>
                    #{String(selectedTask.id).slice(0, 8)}
                  </span>
                </div>
                <h2 className={backlogStyles.detailTitle}>{selectedTask.title}</h2>
              </div>

              <button
                className={backlogStyles.detailClose}
                onClick={() => setSelectedTask(null)}
              >
                ✕
              </button>
            </div>

            {/* scrollable content area */}
            <div className={backlogStyles.bottomSheetBody}>
              <div className={backlogStyles.detailBody}>
                <div className={backlogStyles.detailSection}>
                  <h4 className={backlogStyles.detailSectionTitle}>Summary</h4>

                  <p className={backlogStyles.detailDescription}>
                    {selectedTask.description || (
                      <span className={backlogStyles.detailEmpty}>No description</span>
                    )}
                  </p>

                  <div className={backlogStyles.detailGrid}>
                    <DetailItem label="Type" value={selectedTask.ticketType} />
                    <DetailItem label="Priority" value={selectedTask.priority || "Medium"} />
                    <DetailItem label="Status" value={selectedTask.status || "To Do"} />
                    <DetailItem
                      label="Assignee"
                      value={selectedTask.assigneeName || "Unassigned"}
                    />
                  </div>
                </div>

                {selectedTask.ticketType === "UserStory" && (
                  <div className={backlogStyles.detailSection}>
                    <h4 className={backlogStyles.detailSectionTitle}>User Story Details</h4>

                    <div className={backlogStyles.detailGrid}>
                      <DetailItem label="Story Points" value={selectedTask.storyPoints ?? "—"} />
                      <DetailItem label="Epic" value={selectedTask.epicName || "—"} />
                      <DetailItem
                        label="Target for Sprint"
                        value={selectedTask.targetForSprint || "—"}
                      />
                    </div>

                    <div className={backlogStyles.detailSpan2}>
                      <div className={backlogStyles.detailLabel}>Acceptance Criteria</div>
                      <div>{selectedTask.acceptanceCriteria || "—"}</div>
                    </div>
                  </div>
                )}

                {selectedTask.ticketType === "Bug" && (
                  <div className={backlogStyles.detailSection}>
                    <h4 className={backlogStyles.detailSectionTitle}>Bug Details</h4>

                    <div className={backlogStyles.detailGrid}>
                      <DetailItem label="Severity" value={selectedTask.severity || "—"} />
                      <DetailItem label="Probability" value={selectedTask.probability || "—"} />
                      <DetailItem label="Environment" value={selectedTask.environment || "—"} />
                      <DetailItem
                        label="Build Caused Crash"
                        value={selectedTask.buildCrash ? "Yes" : "No"}
                      />
                      <DetailItem
                        label="Production Impacted"
                        value={selectedTask.productionImpacted ? "Yes" : "No"}
                      />
                      <DetailItem
                        label="Trending End Date"
                        value={
                          selectedTask.trendingEndDate
                            ? new Date(selectedTask.trendingEndDate).toLocaleDateString()
                            : "—"
                        }
                      />
                    </div>
                  </div>
                )}

                {selectedTask.ticketType === "Epic" && (
                  <div className={backlogStyles.detailSection}>
                    <h4 className={backlogStyles.detailSectionTitle}>Epic Planning</h4>

                    <div className={backlogStyles.detailGrid}>
                      <DetailItem
                        label="Effort Estimate"
                        value={selectedTask.effortEstimate ?? "—"}
                      />
                      <DetailItem
                        label="Revenue Impact"
                        value={selectedTask.revenueImpact ?? "—"}
                      />
                      <DetailItem
                        label="Start Date"
                        value={
                          selectedTask.startDate
                            ? new Date(selectedTask.startDate).toLocaleDateString()
                            : "—"
                        }
                      />
                      <DetailItem
                        label="End Date"
                        value={
                          selectedTask.endDate
                            ? new Date(selectedTask.endDate).toLocaleDateString()
                            : "—"
                        }
                      />
                    </div>
                  </div>
                )}

                {selectedTask.ticketType === "Support" && (
                  <div className={backlogStyles.detailSection}>
                    <h4 className={backlogStyles.detailSectionTitle}>Planning</h4>

                    <div className={backlogStyles.detailGrid}>
                      <DetailItem
                        label="Planned Start"
                        value={
                          selectedTask.plannedStart
                            ? new Date(selectedTask.plannedStart).toLocaleDateString()
                            : "—"
                        }
                      />
                      <DetailItem
                        label="Planned End"
                        value={
                          selectedTask.plannedEnd
                            ? new Date(selectedTask.plannedEnd).toLocaleDateString()
                            : "—"
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* pinned comments drawer at the bottom of the sheet */}
            <div className={backlogStyles.bottomSheetComments}>
  <CommentsSection
  entityId={selectedTask.id}
  entityType={
    selectedTask.ticketType === "UserStory"
      ? "UserStory"
      : selectedTask.ticketType === "Epic"
      ? "Epic"
      : "TaskItem"
  }
  assigneeName={selectedTask.assigneeName || ""}
  assigneeEmail={selectedTask.assigneeEmail || ""}
/>
            </div>
          </div>
        </div>
      )}
</div>
  );
}
// ================= COMPONENTS =================

function SprintColumn({ id, title, items, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className={styles.column}>
      <div className={styles.columnHead}>
        <span>{title}</span>
        <span className={styles.columnCount}>{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`${styles.columnBody} ${
          isOver ? styles.columnBodyOver : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
function SortableSprintCard({ task, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        className={styles.card}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(task);
        }}
      >
        {/* Title */}
        <div className={styles.cardTitle}>{task.title}</div>

        {/* Meta row */}
        <div className={styles.cardMetaRow}>
          <span className={styles.cardType}>{task.type}</span>

          {/* Assignee */}
          <span className={styles.cardAssignee}>
            👤 {task.assigneeName || "Unassigned"}
          </span>
        </div>

        {/* User Story extra info */}
        {task.type === "UserStory" && task.targetForSprint && (
          <div className={styles.cardTarget}>
            🎯 {task.targetForSprint}
          </div>
        )}
      </div>
    </div>
  );
}


function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

function Tile({ label, value, success }) {
  return (
    <div className={styles.tile}>
      <div className={styles.tileLabel}>{label}</div>
      <div
        className={styles.tileValue}
        style={success ? { color: "var(--success)" } : {}}
      >
        {value}
      </div>
    </div>
  );
}
function DetailItem({ label, value }) {
  return (
    <div>
      <div className={backlogStyles.detailLabel}>{label}</div>
      <div>{value}</div>
    </div>
  );
}
