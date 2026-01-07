import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import { switchWorkspace } from "../api/workspaceApi";

import styles from "./InviteAcceptPage.module.css";

export default function InviteAcceptPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [status, setStatus] = useState("processing");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("token");

    if (!inviteToken) {
      setStatus("error");
      setError("Invalid or missing invite token.");
      return;
    }

    (async () => {
      try {
        // 1️⃣ Accept invite
        const res = await api.post("/workspaces/invites/accept", {
          token: inviteToken,
        });

        const workspaceId = res.data?.workspaceId;
        if (!workspaceId) {
          throw new Error("Workspace not returned from invite.");
        }

        // 2️⃣ Switch workspace → new JWT
        const switchRes = await switchWorkspace(workspaceId);

        login({
          token: switchRes.token,
          activeWorkspaceId: switchRes.workspace.id,
        });

        // 3️⃣ Enter app
        navigate("/projects", { replace: true });
      } catch (err) {
        console.error(err);
        setStatus("error");
        setError(
          err.response?.data?.message ||
          "Failed to accept invitation."
        );
      }
    })();
  }, [login, navigate]);

  if (status === "processing") {
    return (
      <div className={styles.container}>
        <h2>Joining workspace…</h2>
        <p>Please wait while we accept your invitation.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2>Invite Error</h2>
      <p className={styles.error}>{error}</p>
      <button onClick={() => navigate("/login")}>
        Go to Login
      </button>
    </div>
  );
}
