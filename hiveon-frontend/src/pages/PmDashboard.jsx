import React, { useEffect, useState } from "react";
import {
  FaTasks, FaBug, FaCheckCircle, FaChartLine
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import styles from "./PmDashboard.module.css";
import { useAuth } from "../context/AuthContext";
import api from "../api/apiClient";
import SprintBurndownChart from "../components/SprintBurndownChart";

export default function PmDashboard() {

  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    let alive = true;

    async function fetchDashboard() {
      try {

        const res = await api.get("/dashboard/pm");

        if (!alive) return;

        setData(res.data);
        setLoading(false);

      } catch (err) {
        console.error("Dashboard load failed", err);
      }
    }

    fetchDashboard();

    const interval = setInterval(fetchDashboard, 2000);

    return () => {
      alive = false;
      clearInterval(interval);
    };

  }, []);

  return (
    <div className={styles.page}>

      {/* HEADER */}

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Project Manager Dashboard</h1>
          <p className={styles.subtitle}>
            Your projects, sprints, meetings and risks at a glance.
          </p>
        </div>

        <div className={styles.user}>
          <div className={styles.avatar}>
            {(user?.username || "PM").slice(0,1).toUpperCase()}
          </div>

          <div className={styles.userMeta}>
            <div className={styles.username}>
              {user?.username ?? "Project Manager"}
            </div>

            <div className={styles.email}>
              {user?.email ?? ""}
            </div>
          </div>
        </div>
      </header>


      {/* KPI CARDS */}

      <section className={styles.metrics}>

        <StatCard
          icon={<FaTasks />}
          label="Total Tickets"
          value={data?.cards?.tickets ?? 0}
          sub="stories + tasks"
          onClick={() => navigate("/boards")}
        />

        <StatCard
          icon={<FaCheckCircle />}
          label="Completed Today"
          value={data?.cards?.completedToday ?? 0}
          sub="tasks finished"
          onClick={() => navigate("/boards")}
        />

        <StatCard
          icon={<FaChartLine />}
          label="Sprint Velocity"
          value={data?.cards?.velocity ?? 0}
          sub="story points"
          onClick={() => navigate("/backlog")}
        />

        <StatCard
          icon={<FaBug />}
          label="Production Bugs"
          value={data?.cards?.productionBugs ?? 0}
          sub="critical issues"
          onClick={() => navigate("/boards")}
        />

      </section>


      {/* GRID PANELS */}

      <section className={styles.grid}>


        {/* ACTIVE SPRINT */}

        <Panel title="Active Sprint" className={styles.col}>
          {loading ? (
            <div className={styles.skeleton} />
          ) : data?.activeSprint ? (
            <div>

              <div className={styles.itemTitle}>
                {data.activeSprint.name}
              </div>

              <div className={styles.muted}>
                {new Date(data.activeSprint.startDate).toLocaleDateString()} — {" "}
                {new Date(data.activeSprint.endDate).toLocaleDateString()}
              </div>

              <button
                className={styles.ctaBtn}
                onClick={() => navigate("/sprints")}
              >
                View Sprint
              </button>

            </div>
          ) : (
            <div className={styles.muted}>
              No active sprint
            </div>
          )}
        </Panel>



        {/* MEETINGS */}

        <Panel title="Upcoming Meetings" className={styles.col}>

          {loading ? (
            <div className={styles.skeleton} />
          ) : data?.meetings?.length ? (

            data.meetings.map(m => (

              <div key={m.id} className={styles.rowBetween}>

                <div>

                  <div className={styles.itemTitle}>
                    {m.title}
                  </div>

                  <div className={styles.muted}>
                    {new Date(m.startTime).toLocaleString()}
                  </div>

                </div>

              </div>

            ))

          ) : (
            <div className={styles.muted}>
              No upcoming meetings
            </div>
          )}

        </Panel>



        {/* RISKS */}

        <Panel title="Project Risks" className={styles.col}>

          {loading ? (
            <div className={styles.skeleton} />
          ) : data?.risks?.length ? (

            data.risks.map(r => (

              <div key={r.id} className={styles.rowBetween}>

                <div>

                  <div className={styles.itemTitle}>
                    {r.title}
                  </div>

                  <div className={styles.muted}>
                    {r.probability} / {r.impact}
                  </div>

                </div>

              </div>

            ))

          ) : (
            <div className={styles.muted}>
              No open risks
            </div>
          )}

        </Panel>



        {/* BURNDOWN CHART */}

        <Panel title="Sprint Burn-down" className={styles.col}>

          {loading ? (
            <div className={styles.skeleton} />
          ) : (
            <SprintBurndownChart data={data?.burndown} />
          )}

        </Panel>

      </section>

    </div>
  );
}



/* ---------- SMALL UI COMPONENTS ---------- */

function StatCard({ icon, label, value, sub, onClick }) {
  return (
    <div
      className={styles.stat}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >

      <div className={styles.statIcon}>
        {icon}
      </div>

      <div className={styles.statInfo}>

        <div className={styles.statLabel}>
          {label}
        </div>

        <div className={styles.statValue}>
          {value}
        </div>

        <div className={styles.statSub}>
          {sub}
        </div>

      </div>
    </div>
  );
}


function Panel({ title, children, className }) {
  return (
    <section className={`${styles.panel} ${className || ""}`}>

      <div className={styles.panelHeader}>
        <h3>{title}</h3>
      </div>

      <div className={styles.panelBody}>
        {children}
      </div>

    </section>
  );
}