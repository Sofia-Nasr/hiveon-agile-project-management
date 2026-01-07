import React, { useEffect, useState } from "react";
import {
  FaTasks, FaBug, FaCheckCircle, FaChartLine
} from "react-icons/fa";
import styles from "./PmDashboard.module.css";
import { useAuth } from "../context/AuthContext";

export default function PmDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const demo = {
        cards: { myTasks: 14, completedToday: 5, codeReviewsPending: 3, bugsAssigned: 2 },
        activeTasks: [
          { id: "T-101", title: "Design project schema", story: "US-120", status: "In Progress", percent: 60, time: "6h remaining", points: 5 },
          { id: "T-88",  title: "Integrate payments API", story: "US-118", status: "In Review",  percent: 90, time: "2h remaining", points: 3 },
          { id: "T-76",  title: "Fix auth race condition", story: "BG-076", status: "To Do",       percent: 0,  time: "—",            points: 2 }
        ],
        pullRequests: [
          { id: "PR-321", title: "feature/user-dashboard", state: "Awaiting review", meta: "+245 -89  •  3 files changed", cta: "Review" },
          { id: "PR-318", title: "fix/authentication-error", state: "In Review", meta: "+67 -23  •  2 files changed", cta: "Review" },
          { id: "PR-330", title: "feature/api-integration", state: "Approved • Ready to merge", meta: "+412 -156  •  8 files changed", cta: "Merge" }
        ],
        reviews: [
          { id: "CR-1", title: "Update API endpoints", by: "Mike Johnson", age: "3 hours ago", cta: "Review" },
          { id: "CR-2", title: "Refactor user service", by: "Emily Davis", age: "1 day ago", cta: "Review" }
        ],
        issues: [
          { id: "IS-420", title: "Login fails on Safari browser", age: "Reported 2 hours ago", severity: "High" },
          { id: "IS-411", title: "Dashboard slow to load", age: "Reported 1 day ago", severity: "Medium" }
        ]
      };
      if (alive) {
        await new Promise(r => setTimeout(r, 180));
        setData(demo);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Project Manager Dashboard</h1>
          <p className={styles.subtitle}>Your projects, epics, reviews, and issues at a glance.</p>
        </div>
        <div className={styles.user}>
          <div className={styles.avatar}>{(user?.username || "PM").slice(0,1).toUpperCase()}</div>
          <div className={styles.userMeta}>
            <div className={styles.username}>{user?.username ?? "Project Manager"}</div>
            <div className={styles.email}>{user?.email ?? ""}</div>
          </div>
        </div>
      </header>

      {/* Top metrics row */}
      <section className={styles.metrics}>
        <StatCard icon={<FaTasks />}        label="My Tasks"        value={data?.cards.myTasks ?? 0}        sub="in progress, pending" />
        <StatCard icon={<FaCheckCircle />}  label="Completed Today" value={data?.cards.completedToday ?? 0} sub="story points" />
        <StatCard icon={<FaChartLine />}    label="Code Reviews"    value={data?.cards.codeReviewsPending ?? 0} sub="pending your review" />
        <StatCard icon={<FaBug />}          label="Bugs Assigned"   value={data?.cards.bugsAssigned ?? 0}   sub="high priority" />
      </section>

      {/* Two-column grid */}
      <section className={styles.grid}>
        <Panel title="Active Tasks" className={styles.col}>
          {loading
            ? <div className={styles.skeleton} />
            : data?.activeTasks.map(t => (
                <TaskItem key={t.id} {...t} />
              ))
          }
        </Panel>

        <Panel title="Pull Requests" className={styles.col}>
          {loading
            ? <div className={styles.skeleton} />
            : data?.pullRequests.map(pr => (
                <PRItem key={pr.id} {...pr} />
              ))
          }
        </Panel>

        <Panel title="Code Reviews Needed" className={styles.col}>
          {loading
            ? <div className={styles.skeleton} />
            : data?.reviews.map(r => (
                <ReviewItem key={r.id} {...r} />
              ))
          }
        </Panel>

        <Panel title="Recent Issues" className={styles.col}>
          {loading
            ? <div className={styles.skeleton} />
            : data?.issues.map(i => (
                <IssueItem key={i.id} {...i} />
              ))
          }
        </Panel>
      </section>
    </div>
  );
}

/* ---------- Small UI pieces ---------- */
function StatCard({ icon, label, value, sub }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statInfo}>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statSub}>{sub}</div>
      </div>
    </div>
  );
}

function Panel({ title, children, className }) {
  return (
    <section className={`${styles.panel} ${className || ""}`}>
      <div className={styles.panelHeader}><h3>{title}</h3></div>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

function TaskItem({ title, story, status, percent, time, points }) {
  return (
    <div className={styles.taskItem}>
      <div className={styles.taskMain}>
        <div className={styles.taskTitle}>{title}</div>
        <div className={styles.taskMeta}>Story: {story}</div>
      </div>
      <div className={styles.taskRight}>
        <span className={`${styles.badge} ${styles[`badge_${status.replace(/\s/g,'').toLowerCase()}`]}`}>{status}</span>
        <div className={styles.progress}>
          <div className={styles.progressBar} style={{ width: `${percent}%` }} />
        </div>
        <div className={styles.progressMeta}>{percent}%</div>
      </div>
      <div className={styles.taskFoot}>
        <span className={styles.muted}>{time}</span>
        <span className={styles.dot} />
        <span className={styles.muted}>{points} points</span>
      </div>
    </div>
  );
}

function PRItem({ title, state, meta, cta }) {
  const isMerge = /merge/i.test(cta);
  return (
    <div className={styles.prItem}>
      <div>
        <div className={styles.prTitle}>{title}</div>
        <div className={styles.prMeta}>{state}</div>
        <div className={styles.muted}>{meta}</div>
      </div>
      <button className={`${styles.ctaBtn} ${isMerge ? styles.ctaSuccess : ""}`}>{cta}</button>
    </div>
  );
}

function ReviewItem({ title, by, age, cta }) {
  return (
    <div className={styles.rowBetween}>
      <div>
        <div className={styles.itemTitle}>{title}</div>
        <div className={styles.muted}>By {by} • {age}</div>
      </div>
      <button className={styles.ctaBtn}> {cta} </button>
    </div>
  );
}

function IssueItem({ title, age, severity }) {
  return (
    <div className={styles.rowBetween}>
      <div>
        <div className={styles.itemTitle}>{title}</div>
        <div className={styles.muted}>{age}</div>
      </div>
      <span className={`${styles.sev} ${styles[`sev_${severity.toLowerCase()}`]}`}>{severity}</span>
    </div>
  );
}
