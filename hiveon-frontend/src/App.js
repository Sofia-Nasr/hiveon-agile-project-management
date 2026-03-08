// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import MainLayout from "./layouts/MainLayout";
import InviteAcceptPage from "./pages/InviteAcceptPage";
import BacklogPage from "./pages/BacklogPage";
import SprintsPage from "./pages/SprintsPage";
import TeamsPage from "./pages/TeamsPage";
import BoardsPage from "./pages/BoardsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import WorkspaceCreatePage from "./pages/WorkspaceCreatePage";
import WorkspaceSetupPage from "./pages/WorkspaceSetupPage";
import CompleteProfilePage from "./pages/CompleteProfilePage";
import EpicsPage from "./pages/EpicsPage";
import PmDashboard from "./pages/PmDashboard";
import ProjectsPage from "./pages/ProjectsPage";
import OAuthSuccessPage from "./pages/OAuthSuccessPage";
import HomePage from "./pages/HomePage";
import RiskAnalysisPage from "./pages/RiskAnalysisPage";
import MeetingsPage from "./pages/MeetingsPage";


function PrivateRoute({ children }) {
  const { token, initializing } = useAuth();
  if (initializing) return null;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function WorkspaceRequired({ children }) {
  const { workspaceId } = useAuth();

  if (!workspaceId) {
    return <Navigate to="/workspace-setup" replace />;
  }

  return children;
}
function PublicOnly({ children }) {
  const {
    token,
    workspaceId,
    forceWorkspaceSetup,
    initializing,
  } = useAuth();

  if (initializing) return null;
  if (!token) return children;

  //  signup must ALWAYS go to workspace setup
  if (forceWorkspaceSetup) {
    return <Navigate to="/workspace-setup" replace />;
  }

  return workspaceId
    ? <Navigate to="/projects" replace />
    : <Navigate to="/workspace-setup" replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* AUTH */}
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />
        <Route path="/oauth-success" element={<OAuthSuccessPage />} />
        <Route path="/complete-profile" element={<PrivateRoute><CompleteProfilePage /></PrivateRoute>} />

<Route path="/invite" element={<InviteAcceptPage />} />

        {/* WORKSPACE SETUP */}
        <Route
          path="/workspace-setup"
          element={
            <PrivateRoute>
              <WorkspaceSetupPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/workspace-create"
          element={
            <PrivateRoute>
              <WorkspaceCreatePage />
            </PrivateRoute>
          }
        />

        {/* PROTECTED PAGES */}
        <Route
          path="/projects"
          element={
            <PrivateRoute>
              <WorkspaceRequired>
                <MainLayout><ProjectsPage /></MainLayout>
              </WorkspaceRequired>
            </PrivateRoute>
          }
        />

        <Route
  path="/epics"
  element={
    <PrivateRoute>
      <WorkspaceRequired>
        <MainLayout><EpicsPage /></MainLayout>
      </WorkspaceRequired>
    </PrivateRoute>
  }
/>

<Route
  path="/backlog"
  element={
    <PrivateRoute>
      <WorkspaceRequired>
        <MainLayout><BacklogPage /></MainLayout>
      </WorkspaceRequired>
    </PrivateRoute>
  }
/>

<Route
  path="/sprints"
  element={
    <PrivateRoute>
      <WorkspaceRequired>
        <MainLayout><SprintsPage /></MainLayout>
      </WorkspaceRequired>
    </PrivateRoute>
  }
/>

<Route
  path="/team"
  element={
    <PrivateRoute>
      <WorkspaceRequired>
        <MainLayout><TeamsPage /></MainLayout>
      </WorkspaceRequired>
    </PrivateRoute>
  }
/>

<Route
  path="/boards"
  element={
    <PrivateRoute>
      <WorkspaceRequired>
        <MainLayout><BoardsPage /></MainLayout>
      </WorkspaceRequired>
    </PrivateRoute>
  }
/>


        <Route
          path="/pm"
          element={
            <PrivateRoute>
              <WorkspaceRequired>
                <MainLayout><PmDashboard /></MainLayout>
              </WorkspaceRequired>
            </PrivateRoute>
          }
        />

        <Route
  path="/risks"
  element={
    <PrivateRoute>
      <WorkspaceRequired>
        <MainLayout>
          <RiskAnalysisPage />
        </MainLayout>
      </WorkspaceRequired>
    </PrivateRoute>
  }
/>
<Route
  path="/meetings"
  element={
    <PrivateRoute>
      <WorkspaceRequired>
        <MainLayout>
          <MeetingsPage />
        </MainLayout>
      </WorkspaceRequired>
    </PrivateRoute>
  }
/>

        {/* DEFAULT */}
        <Route path="/" element={<PublicOnly><HomePage /></PublicOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
