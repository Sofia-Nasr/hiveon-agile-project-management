import React from "react";
import styles from "./EpicCard.module.css";

const PRIORITY_META = {
  critical: { label: "Critical", bg: "#fef2f2", color: "#dc2626", border: "#fecaca", icon: "▲▲" },
  high:     { label: "High",     bg: "#fff7ed", color: "#ea580c", border: "#fed7aa", icon: "▲" },
  medium:   { label: "Medium",   bg: "#fffbeb", color: "#d97706", border: "#fde68a", icon: "●" },
  low:      { label: "Low",      bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", icon: "▼" },
};

const STATUS_META = {
  todo:       { label: "To Do",       bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
  inprogress: { label: "In Progress", bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  testing:    { label: "Testing",     bg: "#fffbeb", color: "#b45309", dot: "#f59e0b" },
  inreview:   { label: "In Review",   bg: "#f5f3ff", color: "#6d28d9", dot: "#8b5cf6" },
  done:       { label: "Done",        bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  blocked:    { label: "Blocked",     bg: "#fef2f2", color: "#b91c1c", dot: "#ef4444" },
};

function statusKey(s) {
  return (s || "").toLowerCase().replace(/\s+/g, "");
}

function priorityKey(p) {
  return (p || "medium").toLowerCase();
}

function PriorityPill({ level = "Medium" }) {
  const key = priorityKey(level);
  const meta = PRIORITY_META[key] || PRIORITY_META.medium;
  return (
    <span
      className={styles.pill}
      style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
    >
      <span className={styles.pillIcon}>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

function StatusBadge({ status = "To Do" }) {
  const key = statusKey(status);
  const meta = STATUS_META[key] || STATUS_META.todo;
  return (
    <span
      className={styles.status}
      style={{ background: meta.bg, color: meta.color }}
    >
      <span className={styles.statusDot} style={{ background: meta.dot }} />
      {meta.label}
    </span>
  );
}

export default function EpicCard({ epic, onClick, onRefresh }) {
  if (!epic) return null;

  const {
    id,
    title,
    description,
    status = "To Do",
    priority = "Medium",
    dueDate,
    assigneeName,
    assigneeAvatarUrl,
  } = epic;

  const sKey = statusKey(status);
  const code = id ? `EP-${String(id).slice(0, 8).toUpperCase()}` : "EPIC";

  const formattedDue = dueDate
    ? new Date(dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  const isOverdue = dueDate && new Date(dueDate) < new Date() && sKey !== "done";

  const initials =
    (assigneeName || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0].toUpperCase())
      .join("") || "?";

  // Accent color per status for the left border
  const accentColors = {
    todo: "#94a3b8", inprogress: "#3b82f6", testing: "#f59e0b",
    inreview: "#8b5cf6", done: "#22c55e", blocked: "#ef4444",
  };
  const accent = accentColors[sKey] || "#94a3b8";

  return (
    <article
      className={styles.card}
      style={{ "--accent": accent }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick?.(e)}
      aria-label={title || "Epic card"}
    >
      {/* Left accent bar */}
      <div className={styles.accentBar} />

      <div className={styles.inner}>
        {/* Top row: code chip + status badge */}
        <div className={styles.topRow}>
          <span className={styles.code}>{code}</span>
          <StatusBadge status={status} />
        </div>

        {/* Title */}
        <h4 className={styles.title}>{title || "Untitled epic"}</h4>

        {/* Description */}
        {description && <p className={styles.desc}>{description}</p>}

        {/* Footer */}
        <div className={styles.footer}>
          <PriorityPill level={priority} />

          <div className={styles.footerRight}>
            {formattedDue && (
              <span className={`${styles.due} ${isOverdue ? styles.dueOverdue : ""}`}>
                {isOverdue ? "⚠ " : ""}Due {formattedDue}
              </span>
            )}

            {assigneeName && (
              <div className={styles.assignee}>
                {assigneeAvatarUrl ? (
                  <img src={assigneeAvatarUrl} alt={assigneeName} className={styles.avatar} loading="lazy" />
                ) : (
                  <span className={styles.avatarFallback} aria-hidden>{initials}</span>
                )}
                <span className={styles.assigneeName}>{assigneeName}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {onRefresh && (
        <button
          className={styles.refreshBtn}
          onClick={(e) => { e.stopPropagation(); onRefresh(); }}
          type="button"
          title="Refresh"
        >
          ↻
        </button>
      )}
    </article>
  );
}