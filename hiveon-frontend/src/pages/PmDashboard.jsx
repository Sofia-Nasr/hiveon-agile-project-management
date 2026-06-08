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
        const res = await api.get("/dashboard/pm", { params: { projectId } });
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

// ================= BURNDOWN CHART =================

function normalizeBurndownData(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter(Boolean)
      .map((point, index) => ({
        label: point.label ?? point.day ?? `Day ${index + 1}`,
        ideal: point.ideal ?? point.planned ?? 0,
        actual: point.actual ?? point.remaining ?? 0,
      }));
  }

  if (typeof raw === "object") {
    if (Array.isArray(raw.data)) {
      return raw.data.map((point, index) => ({
        label: point.label ?? point.day ?? `Day ${index + 1}`,
        ideal: point.ideal ?? point.planned ?? 0,
        actual: point.actual ?? point.remaining ?? 0,
      }));
    }

    if (Array.isArray(raw.labels) && Array.isArray(raw.ideal) && Array.isArray(raw.actual)) {
      const count = Math.max(raw.labels.length, raw.ideal.length, raw.actual.length);
      return Array.from({ length: count }, (_, index) => ({
        label: raw.labels[index] ?? `Day ${index + 1}`,
        ideal: raw.ideal[index] ?? 0,
        actual: raw.actual[index] ?? 0,
      }));
    }

    const keys = Object.keys(raw);
    if (keys.length && keys.every((k) => typeof raw[k] === "number")) {
      return keys.map((key) => ({ label: key, ideal: 0, actual: raw[key] }));
    }
  }

  return [];
}

function BurndownChart({ data }) {
  const points = normalizeBurndownData(data);

  if (!points.length) {
    return (
      <div className={styles.chartEmpty}>
        No burndown data available yet
      </div>
    );
  }

  const W = 680, H = 260;
  const pad = { top: 20, right: 24, bottom: 44, left: 48 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const maxVal = Math.max(...points.map((d) => Math.max(d.ideal ?? 0, d.actual ?? 0)), 1);
  const xStep = points.length > 1 ? chartW / (points.length - 1) : chartW;

  const toX = (i) => pad.left + i * xStep;
  const toY = (v) => pad.top + chartH - (v / maxVal) * chartH;

  const idealPath = points
    .map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.ideal ?? 0)}`)
    .join(" ");

  const actualPath = points
    .map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.actual ?? 0)}`)
    .join(" ");

  const actualFillPath =
    actualPath +
    ` L${toX(points.length - 1)},${pad.top + chartH} L${toX(0)},${pad.top + chartH} Z`;

  const idealFillPath =
    idealPath +
    ` L${toX(points.length - 1)},${pad.top + chartH} L${toX(0)},${pad.top + chartH} Z`;

  const yTicks = 5;
  const yTickStep = maxVal / yTicks;

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartLegend}>
        <div className={styles.legendItem}>
          <span className={styles.legendLine} style={{ background: "#facc15" }} />
          Ideal burndown
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendLine} style={{ background: "#3b82f6" }} />
          Actual remaining
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        className={styles.chartSvg}
      >
        <defs>
          <linearGradient id="idealGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#facc15" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = pad.top + (i / yTicks) * chartH;
          const val = Math.round(maxVal - (i / yTicks) * maxVal);
          return (
            <g key={i}>
              <line
                x1={pad.left} y1={y} x2={pad.left + chartW} y2={y}
                stroke="#e5e7eb" strokeWidth="1" strokeDasharray={i === yTicks ? "0" : "4 4"}
              />
              <text
                x={pad.left - 8} y={y + 4}
                textAnchor="end" fontSize="11" fill="#9ca3af" fontFamily="system-ui, sans-serif"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {points.map((d, i) => {
          if (points.length > 12 && i % 2 !== 0) return null;
          return (
            <text
              key={i}
              x={toX(i)} y={pad.top + chartH + 18}
              textAnchor="middle" fontSize="11" fill="#9ca3af" fontFamily="system-ui, sans-serif"
            >
              {d.label ?? `D${i + 1}`}
            </text>
          );
        })}

        {/* Ideal fill */}
        <path d={idealFillPath} fill="url(#idealGrad)" />

        {/* Actual fill */}
        <path d={actualFillPath} fill="url(#actualGrad)" />

        {/* Ideal line */}
        <path
          d={idealPath}
          fill="none"
          stroke="#facc15"
          strokeWidth="2"
          strokeDasharray="6 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Actual line */}
        <path
          d={actualPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Actual dots */}
        {points.map((d, i) => (
          <circle
            key={i}
            cx={toX(i)} cy={toY(d.actual ?? 0)}
            r="4"
            fill="#fff"
            stroke="#3b82f6"
            strokeWidth="2.5"
          />
        ))}
      </svg>
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