import React, { useEffect, useState } from "react";
import {
  FaTasks,
  FaBug,
  FaCheckCircle,
  FaChartLine
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import styles from "./PmDashboard.module.css";
import { useAuth } from "../context/AuthContext";
import api from "../api/apiClient";
import ProjectPicker from "../components/ProjectPicker";

export default function PmDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projectId, setProjectId] = useState(
    localStorage.getItem("currentProjectId") || ""
  );

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function fetchDashboard() {
      if (!projectId) return;
      try {
        const res = await api.get("/pm/dashboard", { params: { projectId } });
        if (!alive) return;
        setData(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Dashboard load failed", err);
      }
    }

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 2000);
    return () => { alive = false; clearInterval(interval); };
  }, [projectId]);

  return (
    <div className={styles.page}>

      {/* ===== HEADER ===== */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerEyebrow}>Product Owner</div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Projects, sprints, meetings and risks at a glance.</p>
        </div>

        <div className={styles.headerRight}>
          <ProjectPicker
            value={projectId}
            onChange={(id) => {
              localStorage.setItem("currentProjectId", id);
              setProjectId(id);
            }}
          />

          <div className={styles.user}>
            <div className={styles.userMeta}>
              <div className={styles.username}>{user?.username ?? "Project Manager"}</div>
              <div className={styles.email}>{user?.email ?? ""}</div>
            </div>
            <div className={styles.avatar}>
              {(user?.username || "PM").slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* ===== KPI CARDS ===== */}
      <section className={styles.metrics}>
        <StatCard
          icon={<FaTasks />}
          label="Total Tickets"
          value={data?.cards?.tickets ?? 0}
          sub="stories + tasks"
          color="amber"
          onClick={() => navigate("/boards")}
        />
        <StatCard
          icon={<FaCheckCircle />}
          label="Completed Today"
          value={data?.cards?.completedToday ?? 0}
          sub="tasks finished"
          color="green"
          onClick={() => navigate("/boards")}
        />
        <StatCard
          icon={<FaChartLine />}
          label="Sprint Velocity"
          value={data?.cards?.velocity ?? 0}
          sub="story points"
          color="blue"
          onClick={() => navigate("/backlog")}
        />
        <StatCard
          icon={<FaBug />}
          label="Production Bugs"
          value={data?.cards?.productionBugs ?? 0}
          sub="critical issues"
          color="red"
          onClick={() => navigate("/boards")}
        />
      </section>

      {/* ===== GRID ===== */}
      <section className={styles.grid}>

        {/* BURNDOWN — spans 2 cols */}
        <Panel title="Sprint Burndown" className={styles.burndownPanel} accent>
          {loading ? (
            <div className={styles.skeleton} />
          ) : (
            <BurndownChart data={data?.burndown} />
          )}
        </Panel>

        {/* ACTIVE SPRINT */}
        <Panel title="Active Sprint">
          {loading ? (
            <div className={styles.skeleton} />
          ) : data?.activeSprint ? (
            <div className={styles.sprintCard}>
              <div className={styles.sprintStatus}>
                <span className={styles.statusDot} />
                {data.activeSprint.status}
              </div>
              <div className={styles.sprintName}>{data.activeSprint.name}</div>
              <div className={styles.sprintDates}>
                <span>
                  {new Date(data.activeSprint.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
                <span className={styles.dateDash}>→</span>
                <span>
                  {new Date(data.activeSprint.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <button className={styles.ctaBtn} onClick={() => navigate("/sprints")}>
                Open Sprint Board →
              </button>
            </div>
          ) : (
            <div className={styles.emptyState}>No sprint available</div>
          )}
        </Panel>

        {/* MEETINGS */}
        <Panel title="Upcoming Meetings">
          {loading ? (
            <div className={styles.skeleton} />
          ) : data?.meetings?.length ? (
            <div className={styles.listItems}>
              {data.meetings.map((m) => (
                <div key={m.id} className={styles.listItem}>
                  <div className={styles.listItemDot} style={{ background: "#3b82f6" }} />
                  <div>
                    <div className={styles.listItemTitle}>{m.title}</div>
                    <div className={styles.listItemMeta}>
                      {new Date(m.startTime).toLocaleString("en-GB", {
                        weekday: "short", day: "numeric", month: "short",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>No upcoming meetings</div>
          )}
        </Panel>

        {/* RISKS */}
        <Panel title="Project Risks">
          {loading ? (
            <div className={styles.skeleton} />
          ) : data?.risks?.length ? (
            <div className={styles.listItems}>
              {data.risks.map((r) => (
                <div key={r.id} className={styles.listItem}>
                  <div className={styles.listItemDot} style={{ background: riskColor(r.impact) }} />
                  <div className={styles.listItemBody}>
                    <div className={styles.listItemTitle}>{r.title}</div>
                    <div className={styles.listItemMeta}>
                      Probability: <strong>{r.probability}</strong> · Impact: <strong>{r.impact}</strong>
                    </div>
                  </div>
                  <span
                    className={styles.riskBadge}
                    style={riskStyle(r.impact)}
                  >
                    {r.impact}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>No open risks</div>
          )}
        </Panel>

      </section>
    </div>
  );
}

// ================= SPRINT PROGRESS CHART =================
// API returns: [{ label: "Total", value: N }, { label: "Remaining", value: N }, { label: "Completed", value: N }]

function BurndownChart({ data }) {
  if (!data || !data.length) {
    return <div className={styles.chartEmpty}>No sprint data available yet</div>;
  }

  const get = (label) => data.find((d) => d.label === label)?.value ?? 0;
  const total     = get("Total");
  const completed = get("Completed");
  const remaining = get("Remaining");
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Donut geometry
  const R = 70, cx = 90, cy = 90, stroke = 18;
  const circ = 2 * Math.PI * R;
  const completedDash = total > 0 ? (completed / total) * circ : 0;
  const remainingDash = total > 0 ? (remaining / total) * circ : 0;
  const completedOffset = 0;
  const remainingOffset = -completedDash;

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartInner}>

        {/* DONUT */}
        <div className={styles.donutWrap}>
          <svg width="180" height="180" viewBox="0 0 180 180">
            <defs>
              <linearGradient id="compGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Track */}
            <circle
              cx={cx} cy={cy} r={R}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={stroke}
            />

            {/* Remaining arc */}
            {remaining > 0 && (
              <circle
                cx={cx} cy={cy} r={R}
                fill="none"
                stroke="#e0e7ff"
                strokeWidth={stroke}
                strokeDasharray={`${remainingDash} ${circ - remainingDash}`}
                strokeDashoffset={-completedDash}
                strokeLinecap="butt"
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            )}

            {/* Completed arc */}
            {completed > 0 && (
              <circle
                cx={cx} cy={cy} r={R}
                fill="none"
                stroke="url(#compGrad)"
                strokeWidth={stroke}
                strokeDasharray={`${completedDash} ${circ - completedDash}`}
                strokeDashoffset={0}
                strokeLinecap="butt"
                transform={`rotate(-90 ${cx} ${cy})`}
                filter="url(#glow)"
              />
            )}

            {/* Center text */}
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize="26" fontWeight="800" fill="#111827">
              {pct}%
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="#9ca3af" fontWeight="500">
              complete
            </text>
          </svg>
        </div>

        {/* STATS */}
        <div className={styles.chartStats}>
          <div className={styles.chartStatRow}>
            <div className={styles.chartStatDot} style={{ background: "#f1f5f9", border: "2px solid #d1d5db" }} />
            <div className={styles.chartStatLabel}>Total tasks</div>
            <div className={styles.chartStatVal}>{total}</div>
          </div>

          <div className={styles.chartDivider} />

          <div className={styles.chartStatRow}>
            <div className={styles.chartStatDot} style={{ background: "linear-gradient(135deg,#facc15,#f59e0b)" }} />
            <div className={styles.chartStatLabel}>Completed</div>
            <div className={styles.chartStatVal} style={{ color: "#b45309" }}>{completed}</div>
          </div>

          <div className={styles.chartDivider} />

          <div className={styles.chartStatRow}>
            <div className={styles.chartStatDot} style={{ background: "#e0e7ff" }} />
            <div className={styles.chartStatLabel}>Remaining</div>
            <div className={styles.chartStatVal} style={{ color: "#4338ca" }}>{remaining}</div>
          </div>

          <div className={styles.chartDivider} />

          {/* Progress bar */}
          <div className={styles.chartBarSection}>
            <div className={styles.chartBarLabel}>
              <span>Sprint progress</span>
              <span style={{ fontWeight: 700, color: "#111827" }}>{pct}%</span>
            </div>
            <div className={styles.chartBar}>
              <div
                className={styles.chartBarFill}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className={styles.chartBarSub}>
              {completed} of {total} tasks done
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= HELPERS =================

function riskColor(impact) {
  if (!impact) return "#9ca3af";
  const l = impact.toLowerCase();
  if (l === "high" || l === "critical") return "#ef4444";
  if (l === "medium") return "#f59e0b";
  return "#22c55e";
}

function riskStyle(impact) {
  if (!impact) return { background: "#f3f4f6", color: "#6b7280" };
  const l = impact.toLowerCase();
  if (l === "high" || l === "critical") return { background: "#fef2f2", color: "#b91c1c" };
  if (l === "medium") return { background: "#fffbeb", color: "#92400e" };
  return { background: "#f0fdf4", color: "#15803d" };
}

// ================= UI COMPONENTS =================

function StatCard({ icon, label, value, sub, color, onClick }) {
  return (
    <div className={`${styles.stat} ${styles[`stat_${color}`]}`} onClick={onClick}>
      <div className={`${styles.statIcon} ${styles[`statIcon_${color}`]}`}>{icon}</div>
      <div className={styles.statInfo}>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statSub}>{sub}</div>
      </div>
    </div>
  );
}

function Panel({ title, children, className, accent }) {
  return (
    <section className={`${styles.panel} ${className || ""} ${accent ? styles.panelAccent : ""}`}>
      <div className={styles.panelHeader}>
        <h3>{title}</h3>
      </div>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}