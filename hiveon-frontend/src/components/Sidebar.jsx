import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaChevronLeft,
  FaChevronRight,
  FaProjectDiagram,
  FaTasks,
  FaLifeRing,
  FaCommentDots,
  FaSignOutAlt,
  FaPlusCircle,
  FaListOl,
  FaUsers,
  FaFolderOpen,
  FaColumns,
  FaUserPlus,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import styles from "./Sidebar.module.css";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import InviteUsersModal from "../components/InviteUsersModal";
import { FaExclamationTriangle } from "react-icons/fa";
import { FaVideo } from "react-icons/fa";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const location = useLocation();

  // keep a global CSS var in sync with sidebar width
  useEffect(() => {
    const width = collapsed ? "80px" : "240px";
    document.documentElement.style.setProperty("--sidebar-width", width);
  }, [collapsed]);

  const toggle = () => setCollapsed((c) => !c);

  const role = user?.role || "";
  const isPO = role === "ProductOwner";

  const isActive = (path) =>
    location.pathname === path ||
    location.pathname.startsWith(path + "/");

  const openCreateTicket = () =>
    window.dispatchEvent(new CustomEvent("open-create-ticket"));

  return (
    <>
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}
      >
        {/* ================= HEADER ================= */}
        <div className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.logo}>
              <span className={styles.logoSymbol}>🐝</span>
              {!collapsed && (
                <span className={styles.logoText}>Hiveon</span>
              )}
            </div>
            <button className={styles.collapseBtn} onClick={toggle}>
              {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
          </div>

          <WorkspaceSwitcher collapsed={collapsed} />

          {/* INVITE USERS – WORKSPACE LEVEL */}
          {isPO && (
            <button
              className={styles.inviteBtn}
              onClick={() => setShowInvite(true)}
              title="Invite users to workspace"
            >
              <FaUserPlus className={styles.navIcon} />
              {!collapsed && (
                <span className={styles.navLabel}>Invite users</span>
              )}
            </button>
          )}
        </div>

        {/* ================= SCROLLABLE NAV ================= */}
        <nav className={styles.nav}>
          <button
            className={styles.createTicketBtn}
            onClick={openCreateTicket}
            title="Create Ticket"
          >
            <FaPlusCircle className={styles.navIcon} />
            {!collapsed && (
              <span className={styles.navLabel}>Create Ticket</span>
            )}
          </button>

          {isPO && (
            <NavLink
              to="/pm"
              label="Dashboard"
              icon={<FaProjectDiagram />}
              active={isActive("/pm")}
              collapsed={collapsed}
            />
          )}

          <NavLink
            to="/projects"
            label="Projects"
            icon={<FaFolderOpen />}
            active={isActive("/projects")}
            collapsed={collapsed}
          />

          <NavLink
            to="/epics"
            label="Epics"
            icon={<FaProjectDiagram />}
            active={isActive("/epics")}
            collapsed={collapsed}
          />

          <NavLink
            to="/backlog"
            label="Backlog"
            icon={<FaListOl />}
            active={isActive("/backlog")}
            collapsed={collapsed}
          />

          <NavLink
            to="/sprints"
            label="Sprints"
            icon={<FaTasks />}
            active={isActive("/sprints")}
            collapsed={collapsed}
          />

          <NavLink
            to="/team"
            label="Teams"
            icon={<FaUsers />}
            active={isActive("/team")}
            collapsed={collapsed}
          />

          <NavLink
            to="/boards"
            label="Boards"
            icon={<FaColumns />}
            active={isActive("/boards")}
            collapsed={collapsed}
          />
          <NavLink
  to="/meetings"
  label="Meetings"
  icon={<FaVideo />}
  active={isActive("/meetings")}
  collapsed={collapsed}
/>
<NavLink
  to="/risks"
  label="Risk Analysis"
  icon={<FaExclamationTriangle />}
  active={isActive("/risks")}
  collapsed={collapsed}
/>

          <NavLink
            to="/support"
            label="Support"
            icon={<FaLifeRing />}
            active={isActive("/support")}
            collapsed={collapsed}
          />

          <NavLink
            to="/feedback"
            label="Feedback"
            icon={<FaCommentDots />}
            active={isActive("/feedback")}
            collapsed={collapsed}
          />
        </nav>

        {/* ================= FOOTER ================= */}
        <div className={styles.footer}>
          <button onClick={logout} className={styles.signout}>
            <FaSignOutAlt />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* INVITE MODAL */}
      {showInvite && (
        <InviteUsersModal onClose={() => setShowInvite(false)} />
      )}
    </>
  );
}

function NavLink({ to, label, icon, active, collapsed }) {
  return (
    <Link
      to={to}
      className={`${styles.navItem} ${active ? styles.active : ""}`}
      title={collapsed ? label : undefined}
    >
      <div className={styles.navIcon}>{icon}</div>
      {!collapsed && <span className={styles.navLabel}>{label}</span>}
    </Link>
  );
}
