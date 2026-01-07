// src/components/workspace/WorkspaceGuard.jsx
import React from "react";
import WorkspaceModal from "./WorkspaceModal";
import { useAuth } from "../context/AuthContext";

export default function WorkspaceGuard({ children }) {
  const { user, workspaceId } = useAuth();

  if (!user) return null;

  if (!workspaceId) {
    return <WorkspaceModal />;
  }

  return <>{children}</>;
}
