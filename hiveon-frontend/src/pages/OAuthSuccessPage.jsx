// src/pages/OAuthSuccessPage.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function safeDecodeJwt(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      Array.prototype.map
        .call(atob(base64), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function OAuthSuccessPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const token = params.get("token");
    const requiresWorkspace = params.get("requiresWorkspace");
    const activeWorkspaceId = params.get("activeWorkspaceId");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    // ✅ new: pass workspace flags too
    login({
      token,
      requiresWorkspace: requiresWorkspace === "true",
      activeWorkspaceId: activeWorkspaceId || null,
    });

    const decoded = safeDecodeJwt(token);
    const role = decoded?.role || "Developer";

    // Keep existing behavior: pending users must complete profile first
    if (role === "Pending") {
      navigate("/complete-profile", { replace: true });
      return;
    }

    // Otherwise route based on workspace selection
    if (requiresWorkspace === "true" || !activeWorkspaceId) {
      navigate("/workspace-setup", { replace: true });
      return;
    }

    if (role === "ProductOwner" || role === "ScrumMaster") {
      navigate("/pm", { replace: true });
    } else {
      navigate("/projects", { replace: true });
    }
  }, [login, navigate]);

  return <div>Signing you in with Google…</div>;
}
