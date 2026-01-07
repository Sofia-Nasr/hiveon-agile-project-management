import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBox,
  FaUsers,
  FaTasks,
  FaChartBar,
  FaRunning,
  FaSlidersH,
} from "react-icons/fa";
import styles from "./HomePage.module.css";

export default function HomePage() {
  const [rotation, setRotation] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(
      () => setRotation((prev) => (prev + 1) % 360),
      20
    );
    return () => clearInterval(interval);
  }, []);

  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  const goToLogin = () => navigate("/login");
  const goToSignup = () => navigate("/signup");

  const scrollToFeatures = () => {
    const el = document.getElementById("features-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className={styles.wrap}>
      {/* top-right auth buttons */}
      <div className={styles.authButtonsContainer}>
        <button className={styles.authButton} onClick={goToLogin}>
          Login
        </button>
        <button
          className={`${styles.authButton} ${styles.signUpButton}`}
          onClick={goToSignup}
        >
          Sign Up
        </button>
      </div>

      {/* glass header */}
      <header className={styles.header}>
        <div
          onClick={scrollToTop}
          role="button"
          tabIndex={0}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            cursor: "pointer",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") scrollToTop();
          }}
        >
          <div className={styles.hexagonSmall} />
          <h2 style={{ margin: 0 }}>Hiveon</h2>
        </div>
      </header>

      <div className={styles.mainContent}>
        {/* HERO */}
        <section className={styles.heroSection}>
          <div
            className={styles.rotatingHex}
            style={{ transform: `rotate(${rotation}deg)` }}
          />
          <h1 className={styles.title}>Welcome to Hiveon</h1>
          <p className={styles.subtitle}>
            An agile project management tool for epics, stories, bugs,
            and sprints — built as a final year project to streamline how
            teams work.
          </p>
          <div className={styles.divider} />
          <div className={styles.buttonContainer}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={goToLogin}
            >
              Get Started →
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={scrollToFeatures}
            >
              See Features
            </button>
          </div>
        </section>

        {/* FEATURES */}
        <section
          className={styles.featuresSection}
          id="features-section"
        >
          <h2 className={styles.sectionTitle}>Key Features</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div
                className={styles.featureIconContainer}
                style={{ backgroundColor: "#E3F2FD" }}
              >
                <FaBox style={{ color: "#1976D2" }} />
              </div>
              <h3 className={styles.featureTitle}>Epic Management</h3>
              <p className={styles.featureDescription}>
                Organize work into high-level epics that group related
                features and user stories.
              </p>
              <Link to="/epics" className={styles.featureLink}>
                Explore Epics →
              </Link>
            </div>

            <div className={styles.featureCard}>
              <div
                className={styles.featureIconContainer}
                style={{ backgroundColor: "#E8F5E9" }}
              >
                <FaUsers style={{ color: "#388E3C" }} />
              </div>
              <h3 className={styles.featureTitle}>Team Collaboration</h3>
              <p className={styles.featureDescription}>
                Structure your teams, assign work, and keep everyone
                aligned on priorities.
              </p>
              <Link to="/team" className={styles.featureLink}>
                Manage Teams →
              </Link>
            </div>

            <div className={styles.featureCard}>
              <div
                className={styles.featureIconContainer}
                style={{ backgroundColor: "#FFF8E1" }}
              >
                <FaTasks style={{ color: "#FFA000" }} />
              </div>
              <h3 className={styles.featureTitle}>Ticket Tracking</h3>
              <p className={styles.featureDescription}>
                Track user stories, bugs, and support tasks on clear
                boards and backlogs.
              </p>
              <Link to="/backlog" className={styles.featureLink}>
                View Backlog →
              </Link>
            </div>

            <div className={styles.featureCard}>
              <div
                className={styles.featureIconContainer}
                style={{ backgroundColor: "#F3E5F5" }}
              >
                <FaChartBar style={{ color: "#7B1FA2" }} />
              </div>
              <h3 className={styles.featureTitle}>Reporting & Insights</h3>
              <p className={styles.featureDescription}>
                See sprint progress, status breakdowns, and key
                indicators at a glance.
              </p>
              <Link to="/reports" className={styles.featureLink}>
                View Reports →
              </Link>
            </div>

            <div className={styles.featureCard}>
              <div
                className={styles.featureIconContainer}
                style={{ backgroundColor: "#E0F7FA" }}
              >
                <FaRunning style={{ color: "#0097A7" }} />
              </div>
              <h3 className={styles.featureTitle}>Sprint Planning</h3>
              <p className={styles.featureDescription}>
                Plan sprints, move tickets across columns, and keep track
                of delivery.
              </p>
              <Link to="/board" className={styles.featureLink}>
                Open Board →
              </Link>
            </div>

            <div className={styles.featureCard}>
              <div
                className={styles.featureIconContainer}
                style={{ backgroundColor: "#FFEBEE" }}
              >
                <FaSlidersH style={{ color: "#D32F2F" }} />
              </div>
              <h3 className={styles.featureTitle}>Custom Workflows</h3>
              <p className={styles.featureDescription}>
                Configure statuses and flows that match how your team
                actually works.
              </p>
              <Link to="/workflows" className={styles.featureLink}>
                Configure →
              </Link>
            </div>
          </div>
        </section>

        {/* CLEAN APP FOOTER (no fake free trial) */}
        <footer className={styles.footerSection}>
          <div className={styles.footerContent}>
            <div className={styles.footerBrandBlock}>
              <div className={styles.footerLogo}>
                <div className={styles.hexagonSmall} />
                <span className={styles.footerBrandName}>Hiveon</span>
              </div>
              <p className={styles.footerText}>
                Agile boards, epics, and sprints — designed and built as
                a final year project.
              </p>
            </div>

            <div className={styles.footerColumns}>
              <div className={styles.footerColumn}>
                <h4 className={styles.footerColumnTitle}>Product</h4>
                <Link to="/login" className={styles.footerLink}>
                  Login
                </Link>
                <Link to="/signup" className={styles.footerLink}>
                  Sign Up
                </Link>
                <Link to="/epics" className={styles.footerLink}>
                  Epics
                </Link>
                <Link to="/board" className={styles.footerLink}>
                  Board
                </Link>
              </div>
              <div className={styles.footerColumn}>
                <h4 className={styles.footerColumnTitle}>Project</h4>
                <span className={styles.footerMuted}>
                  Final Year Project · 2025
                </span>
                <span className={styles.footerMuted}>
                  Built with React & .NET
                </span>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <span className={styles.footerMuted}>
              © {new Date().getFullYear()} Hiveon. All rights reserved.
            </span>
           
          </div>
        </footer>
      </div>
    </div>
  );
}
