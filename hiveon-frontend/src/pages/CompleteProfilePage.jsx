// src/pages/CompleteProfilePage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import styles from "./CompleteProfilePage.module.css";

export default function CompleteProfilePage() {
  const [username, setUsername] = useState("");
  const [roleId, setRoleId] = useState(0);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!username.trim() || !roleId) {
      setMessage("❌ Please enter a username and select a role.");
      return;
    }

    try {
      const res = await api.post("/auth/complete-profile", {
        username,
        roleId,
      });

      if (!res.data?.token) {
        setMessage("❌ Profile updated but no token returned.");
        return;
      }

      // ✅ new: pass full payload (workspace flags might be present)
      login(res.data);

      // Keep your existing local marker
      localStorage.setItem("hiveonProfileCompleted", "1");

      const role = res.data?.user?.role || "Developer";

      // ✅ ClickUp-style routing after profile completion
      if (res.data?.requiresWorkspace || !res.data?.activeWorkspaceId) {
        navigate("/workspace-setup", { replace: true });
        return;
      }

      if (role === "ProductOwner" || role === "ScrumMaster") {
        navigate("/pm", { replace: true });
      } else {
        navigate("/projects", { replace: true });
      }
    } catch (err) {
      if (err.response) {
        const apiMsg =
          err.response.data?.message ||
          (typeof err.response.data === "string"
            ? err.response.data
            : "Profile update failed");
        setMessage("❌ " + apiMsg);
      } else if (err.request) {
        setMessage("❌ No response from server.");
      } else {
        setMessage("❌ Error: " + err.message);
      }
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2 className={styles.title}>Complete Your Hiveon Profile</h2>

        <input
          className={styles.input}
          placeholder="Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <select
          className={styles.input}
          value={roleId}
          onChange={(e) => setRoleId(Number(e.target.value))}
        >
          <option value={0}>Select Role</option>
          <option value={1}>Product Owner</option>
          <option value={2}>Scrum Master</option>
          <option value={3}>Developer</option>
        </select>

        <button className={styles.button} type="submit">
          Save & Continue
        </button>

        {message && <p className={styles.message}>{message}</p>}
      </form>
    </div>
  );
}
