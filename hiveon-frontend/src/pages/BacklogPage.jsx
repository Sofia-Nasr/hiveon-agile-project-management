import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import api from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import ProjectPicker from "../components/ProjectPicker";
import styles from "./BacklogPage.module.css";
import CommentsSection from "../components/CommentsSection";
// ---- Helpers ----

function getTypeLabel(ticketType) {
  switch (ticketType) {
    case "Epic":
      return "Epic";
    case "UserStory":
      return "User Story";
    case "Bug":
      return "Bug";
    case "Support":
      return "Support Task";
    default:
      return ticketType || "Ticket";
  }
}

// Priority pill
function PriorityPill({ value, onChange, canEdit }) {
  const color =
    value === "High"
      ? styles.pillHigh
      : value === "Low"
      ? styles.pillLow
      : styles.pillMed;

  if (!canEdit) {
    return (
      <span className={`${styles.pill} ${color}`}>{value || "Medium"}</span>
    );
  }
  return (
    <select
      className={`${styles.pill} ${color} ${styles.pillSelect}`}
      value={value || "Medium"}
      onChange={(e) => onChange?.(e.target.value)}
    >
      <option>High</option>
      <option>Medium</option>
      <option>Low</option>
    </select>
  );
}

export default function BacklogPage() {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState(
    localStorage.getItem("currentProjectId") || ""
  );
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragIndex = useRef(null);

  const [selectedItem, setSelectedItem] = useState(null); // detail card

  const canReorder = user?.role === "ProductOwner"; // PO only
  const canChangePriority = ["ProductOwner", "ScrumMaster"].includes(
    user?.role
  ); // PO+SM

  const fetchBacklog = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await api.get(`/backlog?projectId=${projectId}`);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Backlog load failed", e?.response || e);
      alert("Failed to load backlog");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBacklog();
  }, [fetchBacklog]);

  useEffect(() => {
    const handler = () => fetchBacklog();
    window.addEventListener("refresh-backlog", handler);
    return () => window.removeEventListener("refresh-backlog", handler);
  }, [fetchBacklog]);

  // ----- Drag & drop (native) -----
  const onDragStart = (index) => (e) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const onDragOver = (index) => (e) => {
    if (!canReorder) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (index) => async (e) => {
    if (!canReorder) return;
    e.preventDefault();
    const from = dragIndex.current;
    const to = index;
    if (from == null || to == null || from === to) return;

    // optimistic reorder (full list, but only stories are persisted)
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    dragIndex.current = null;

    // persist order for user stories ONLY
    try {
      setSaving(true);
      const storyIds = next
        .filter((x) => x.ticketType === "UserStory")
        .map((s) => s.id);
      await api.patch("/backlog/reorder", {
        projectId,
        storyIds,
      });
    } catch (e2) {
      console.error("Reorder failed", e2?.response || e2);
      alert("Failed to save order; reloading.");
      fetchBacklog();
    } finally {
      setSaving(false);
    }
  };

  const changePriority = async (id, newPriority) => {
    // optimistic
    const prev = items;
    const next = items.map((it) =>
      it.id === id ? { ...it, priority: newPriority } : it
    );
    setItems(next);
    try {
      await api.patch(`/backlog/${id}/priority`, { priority: newPriority });
    } catch (e) {
      console.error("Priority update failed", e?.response || e);
      alert("Failed to update priority; reverting.");
      setItems(prev);
    }
  };

  const emptyState = !loading && items.length === 0;

  const title = useMemo(() => {
    const pName = localStorage.getItem("currentProjectName") || "";
    return pName ? `Product Backlog · ${pName}` : "Product Backlog";
  }, [projectId]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.h1}>{title}</h1>
          <p className={styles.sub}>
            Ordered list of tickets for the selected project.
          </p>
        </div>
        <div className={styles.headerRight}>
          <ProjectPicker value={projectId} onChange={setProjectId} />
          
          
        </div>
      </header>

      {!projectId && (
        <div className={styles.banner}>
          <strong>No project selected.</strong> Pick a project above or{" "}
          <a href="/create-project">create one</a>.
        </div>
      )}

      <section className={styles.panel} aria-busy={loading || saving}>
        <div className={styles.listHead}>
          <span className={styles.colRank}>#</span>
          <span className={styles.colTitle}>Title</span>
          <span className={styles.colSP}>SP</span>
          <span className={styles.colPriority}>Priority</span>
          <span className={styles.colStatus}>Status</span>
        </div>

        <div className={styles.listBody}>
          {loading ? (
            <div className={styles.skeleton} />
          ) : emptyState ? (
            <div className={styles.empty}>No items in the backlog yet.</div>
          ) : (
            items.map((it, idx) => {
              const isStory = it.ticketType === "UserStory";

              return (
                <div
                  key={it.id}
                  className={styles.row}
                  draggable={canReorder && isStory}
                  onDragStart={
                    canReorder && isStory ? onDragStart(idx) : undefined
                  }
                  onDragOver={
                    canReorder && isStory ? onDragOver(idx) : undefined
                  }
                  onDrop={canReorder && isStory ? onDrop(idx) : undefined}
                  aria-grabbed={false}
                  onClick={() => setSelectedItem(it)}
                >
                  <div className={styles.colRank}>
                    {canReorder && isStory ? (
                      <span
                        className={styles.handle}
                        title="Drag to reorder"
                      >
                        ⋮⋮
                      </span>
                    ) : null}
                    <span className={styles.rankNum}>{idx + 1}</span>
                  </div>

                  <div className={styles.colTitle} title={it.title}>
                    <span
                      className={`${styles.typeBadge} ${
                        it.ticketType === "Epic"
                          ? styles.typeEpic
                          : it.ticketType === "UserStory"
                          ? styles.typeStory
                          : it.ticketType === "Bug"
                          ? styles.typeBug
                          : styles.typeSupport
                      }`}
                    >
                      {getTypeLabel(it.ticketType)}
                    </span>
                    <span className={styles.titleText}>{it.title}</span>
                  </div>

                  
                    
                  <div className={styles.colSP}>{it.storyPoints ?? 0}</div>

                  <div className={styles.colPriority}>
  <PriorityPill
    value={it.priority}
    // allow PO / SM to edit ALL ticket types
    canEdit={canChangePriority}
    onChange={(p) => changePriority(it.id, p)}
  />
</div>

                  <div className={styles.colStatus}>
                    <span className={styles.status}>
                      {it.status || "To Do"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Floating detail card */}
      {selectedItem && (
        <div
          className={styles.detailOverlay}
          onClick={() => setSelectedItem(null)}
        >
          <div
            className={styles.detailCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.detailHeader}>
              <div>
                <div className={styles.detailTypeRow}>
                  <span
                    className={`${styles.typeBadge} ${
                      selectedItem.ticketType === "Epic"
                        ? styles.typeEpic
                        : selectedItem.ticketType === "UserStory"
                        ? styles.typeStory
                        : selectedItem.ticketType === "Bug"
                        ? styles.typeBug
                        : styles.typeSupport
                    }`}
                  >
                    {getTypeLabel(selectedItem.ticketType)}
                  </span>
                  <span className={styles.detailId}>
                    #{String(selectedItem.id).slice(0, 8)}
                  </span>
                </div>
                <h2 className={styles.detailTitle}>{selectedItem.title}</h2>
              </div>
              <button
                className={styles.detailClose}
                onClick={() => setSelectedItem(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.detailBody}>
              <p className={styles.detailDescription}>
                {selectedItem.description || (
                  <span className={styles.detailEmpty}>No description</span>
                )}
              </p>
              

              <div className={styles.detailGrid}>
                <div>
                  <div className={styles.detailLabel}>Priority</div>
                  <div>{selectedItem.priority || "Medium"}</div>
                </div>
                <div>
                  <div className={styles.detailLabel}>Status</div>
                  <div>{selectedItem.status || "To Do"}</div>
                </div>

                {selectedItem.ticketType === "UserStory" && (
                  <>
                    <div>
                      <div className={styles.detailLabel}>Story Points</div>
                      <div>{selectedItem.storyPoints ?? "—"}</div>
                    </div>
                    <div>
                      <div className={styles.detailLabel}>Epic</div>
                      <div>
                        {selectedItem.epicId
                          ? String(selectedItem.epicId).slice(0, 8)
                          : "—"}
                      </div>
                    </div>
                    <div className={styles.detailSpan2}>
                      <div className={styles.detailLabel}>
                        Acceptance Criteria
                      </div>
                      <div>{selectedItem.acceptanceCriteria || "—"}</div>
                    </div>
                  </>
                )}

                {selectedItem.ticketType === "Bug" && (
                  <>
                    <div>
                      <div className={styles.detailLabel}>Severity</div>
                      <div>{selectedItem.severity || "—"}</div>
                    </div>
                    <div>
                      <div className={styles.detailLabel}>Probability</div>
                      <div>{selectedItem.probability || "—"}</div>
                    </div>
                    <div>
                      <div className={styles.detailLabel}>Environment</div>
                      <div>{selectedItem.environment || "—"}</div>
                    </div>
                    <div>
                      <div className={styles.detailLabel}>
                        Build caused crash?
                      </div>
                      <div>
                        {selectedItem.buildCrash ? "Yes" : "No"}
                      </div>
                    </div>
                    <div>
                      <div className={styles.detailLabel}>
                        Production impacted?
                      </div>
                      <div>
                        {selectedItem.productionImpacted ? "Yes" : "No"}
                      </div>
                    </div>
                  </>
                )}

                {selectedItem.ticketType === "Epic" && (
  <>
    <div>
      <div className={styles.detailLabel}>Effort</div>
      <div>{selectedItem.effortEstimate ?? "—"}</div>
    </div>
    <div>
      <div className={styles.detailLabel}>Revenue Impact</div>
      <div>{selectedItem.revenueImpact ?? "—"}</div>
    </div>
  </>
)}
</div>
</div>
 {/* COMMENTS SECTION (fixed bottom) */}
      <div className={styles.detailComments}>
        <CommentsSection
          entityId={selectedItem.id}
          entityType={
            selectedItem.ticketType === "UserStory"
              ? "UserStory"
              : selectedItem.ticketType === "Epic"
              ? "Epic"
              : "TaskItem"
          }
          assigneeName={selectedItem.assigneeName || ""}
          assigneeEmail={selectedItem.assigneeEmail || ""}
        />

            </div>
          </div>
        </div>
        
      )}
      
    </div>
  );
}
