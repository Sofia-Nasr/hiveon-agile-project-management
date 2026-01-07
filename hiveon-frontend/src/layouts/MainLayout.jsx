// src/layouts/MainLayout.jsx
import Sidebar from "../components/Sidebar";
import WorkspaceGuard from "../components/WorkspaceGuard";
import CreateTicketDrawer from "../components/CreateTicketDrawer";
import styles from "./MainLayout.module.css";

export default function MainLayout({ children }) {
  return (
    <WorkspaceGuard>
      <div className={styles.layout}>
        <Sidebar />
        <main className={styles.content}>{children}</main>
        <CreateTicketDrawer />
      </div>
    </WorkspaceGuard>
  );
}
