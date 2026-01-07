import React from "react";
import styles from "./EpicCard.module.css";

function PriorityPill({ level = "Medium" }) {
  const key = (level || "Medium").toLowerCase();
  return (
    <span className={`${styles.pill} ${styles[`pill_${key}`]}`}>
      {level}
    </span>
  );
}

function StatusBadge({ status = "To Do" }) {
  const key = (status || "To Do").toLowerCase().replace(/\s+/g, "");
  return (
    <span className={`${styles.status} ${styles[`status_${key}`]}`}>
      <span className={styles.statusDot} />
      {status}
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

  const accentKey = (status || "To Do").toLowerCase().replace(/\s+/g, "");
  const code = id ? `EP-${String(id).slice(0, 8)}` : "EPIC";

  const formattedDue = dueDate
    ? new Date(dueDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const initials =
    (assigneeName || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0].toUpperCase())
      .join("") || "U";

  return (
    <article
      className={`${styles.card} ${styles[`accent_${accentKey}`]}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") && onClick?.(e)
      }
      aria-label={title || "Epic card"}
    >
      {/* top row: code + status (+ optional due date) */}
      <div className={styles.topRow}>
        <span className={styles.code} title={id}>
          {code}
        </span>
        <div className={styles.topRight}>
          {formattedDue && (
            <span className={styles.due}>Due {formattedDue}</span>
          )}
          <StatusBadge status={status} />
        </div>
      </div>

      {/* main text */}
      <h4 className={styles.title}>{title || "Untitled epic"}</h4>
      {description && <p className={styles.desc}>{description}</p>}

      {/* footer: priority + (optional) assignee */}
      <div className={styles.footer}>
        <PriorityPill level={priority} />

        {assigneeName && (
          <div className={styles.assignee}>
            {assigneeAvatarUrl ? (
              <img
                src={assigneeAvatarUrl}
                alt={assigneeName}
                className={styles.avatar}
                loading="lazy"
              />
            ) : (
              <span className={styles.avatarFallback} aria-hidden>
                {initials}
              </span>
            )}
            <span className={styles.assigneeName}>{assigneeName}</span>
          </div>
        )}
      </div>

      {onRefresh && (
        <button
          className={styles.refreshBtn}
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
          type="button"
          title="Refresh epic"
        >
          ↻
        </button>
      )}
    </article>
  );
}
