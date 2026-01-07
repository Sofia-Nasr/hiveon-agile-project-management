import React from "react";
import styles from "./TaskCard.module.css";

export default function TaskCard({ item }) {
  return (
    <div className={styles.card}>
      {/* TYPE BADGE */}
      <div className={styles.typeRow}>
        <span className={`${styles.typeBadge} ${styles[`type${item.type}`]}`}>
          {item.type}
        </span>
        <span className={styles.id}>#{String(item.id).slice(0, 6)}</span>
      </div>

      {/* TITLE */}
      <div className={styles.title}>{item.title}</div>

      {/* DESCRIPTION PREVIEW */}
      {item.description && (
        <div className={styles.desc}>
          {item.description.length > 80
            ? item.description.slice(0, 80) + "..."
            : item.description}
        </div>
      )}

      {/* META ROW */}
      <div className={styles.meta}>
        <span className={`${styles.priority} ${styles[item.priority]}`}>
          {item.priority}
        </span>

        {item.storyPoints != null && (
          <span className={styles.sp}>{item.storyPoints} SP</span>
        )}

        {item.severity && (
          <span className={styles.sev}>S{item.severity.slice(-1)}</span>
        )}

        {item.assigneeName && (
          <span className={styles.assignee}>
            {item.assigneeName.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}
