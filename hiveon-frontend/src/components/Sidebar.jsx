import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaChevronLeft,
  FaChevronRight,
  FaChartLine,
  FaTasks,
  FaLifeRing,
  FaCommentDots,
  FaSignOutAlt,
  FaPlusCircle,
  FaUsers,
  FaFolderOpen,
  FaColumns,
  FaUserPlus,
  FaLayerGroup,
  FaVideo,
  FaExclamationTriangle,
  FaClipboardList,
  FaRunning
} from "react-icons/fa";
import { FaBuilding } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import styles from "./Sidebar.module.css";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import InviteUsersModal from "../components/InviteUsersModal";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const width = collapsed ? "80px" : "240px";
    document.documentElement.style.setProperty("--sidebar-width", width);
  }, [collapsed]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

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
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.logo}>
             <svg
  className={styles.logoSymbol}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
>
  <polygon points="12 2 20 7 20 17 12 22 4 17 4 7" />
</svg>
              {!collapsed && (
                <span className={styles.logoText}>Hiveon</span>
              )}
            </div>

            <button className={styles.collapseBtn} onClick={toggle}>
              {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
          </div>

          <WorkspaceSwitcher collapsed={collapsed} />

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

        {/* NAV */}
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
              icon={<FaChartLine />}
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
            to="/team"
            label="Teams"
            icon={<FaUsers />}
            active={isActive("/team")}
            collapsed={collapsed}
          />

          <NavLink
            to="/epics"
            label="Epics"
            icon={<FaLayerGroup />}
            active={isActive("/epics")}
            collapsed={collapsed}
          />

          <NavLink
            to="/backlog"
            label="Backlog"
            icon={<FaClipboardList />}
            active={isActive("/backlog")}
            collapsed={collapsed}
          />

          <NavLink
            to="/sprints"
            label="Sprints"
            icon={<FaRunning />}
            active={isActive("/sprints")}
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

        </nav>

        {/* FOOTER */}
        <div className={styles.footer}>
          <button onClick={logout} className={styles.signout}>
            <FaSignOutAlt />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

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