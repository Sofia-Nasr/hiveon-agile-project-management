// src/pages/SignupPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import styles from "./SignupPage.module.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link } from "react-router-dom";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  "https://hiveon-agile-project-management.onrender.com/api";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSignup(e) {
    e.preventDefault();
    setMsg("");

    try {
      const res = await api.post("/auth/register", {
        username,
        email,
        password,
      });

      const { token, requiresWorkspace, activeWorkspaceId } = res.data;

      login(token);

      // Same logic as login page
      if (requiresWorkspace) {
        navigate("/workspace-setup", { replace: true });
      } else if (activeWorkspaceId) {
        navigate("/projects", { replace: true });
      } else {
        navigate("/workspace-setup", { replace: true });
      }

    } catch (err) {
      setMsg(
        "❌ " +
          (err.response?.data?.message ||
            err.response?.data ||
            "Signup failed")
      );
    }
  }

  function handleGoogleSignup() {
    window.location.href = `${API_BASE_URL}/auth/google`;
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSignup} className={styles.form}>
        <div className={styles.titleRow}>
          <span className={styles.hexIcon}></span>
          <h2 className={styles.title}>Create Your Account</h2>
        </div>

        <p className={styles.footerText}>
          Already have an account?{" "}
          <Link to="/login" className={styles.link}>
            Login now!
          </Link>
        </p>

        <input
          className={styles.input}
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          className={styles.input}
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className={styles.passwordWrapper}>
          <input
            className={styles.input}
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span
            className={styles.toggleIcon}
            onClick={() => setShowPassword((s) => !s)}
          >
            {showPassword ? <FaEye /> : <FaEyeSlash />}
          </span>
        </div>

        <button
          type="button"
          className={styles.googleButton}
          onClick={handleGoogleSignup}
        >
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google"
            className={styles.googleIcon}
          />
          Sign up with Google
        </button>

        <button className={styles.button} type="submit">
          Sign Up
        </button>

        {msg && <p className={styles.message}>{msg}</p>}
      </form>
    </div>
  );
}
