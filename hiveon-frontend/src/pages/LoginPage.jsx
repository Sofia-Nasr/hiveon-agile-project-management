import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import styles from "./LoginPage.module.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();
async function handleLogin(e) {
  e.preventDefault();
  setMessage("");

  try {
    const res = await api.post("/auth/login", { email, password });

    const { token, requiresWorkspace, activeWorkspaceId } = res.data;

    login(token);

    if (requiresWorkspace) {
      navigate("/workspace-setup", { replace: true });
    } else if (activeWorkspaceId) {
      navigate("/projects", { replace: true });
    } else {
      navigate("/workspace-setup", { replace: true });
    }

  } catch (err) {
    setMessage("❌ " + (err.response?.data?.message || "Login failed"));
  }
}
  function handleGoogleLogin() {
    window.location.href = "https://localhost:7028/api/auth/google";
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleLogin} className={styles.form}>
        <h2 className={styles.title}>🐝 Hiveon Login</h2>

        <p className={styles.footerText}>
          Don’t have an account?{" "}
          <Link to="/signup" className={styles.link}>
            Sign up!
          </Link>
        </p>

        <input
          className={styles.input}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className={styles.passwordWrapper}>
          <input
            className={styles.input}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          onClick={handleGoogleLogin}
        >
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google"
            className={styles.googleIcon}
          />
          Sign in with Google
        </button>

        <button className={styles.button}>Login</button>
        {message && <p className={styles.message}>{message}</p>}
      </form>
    </div>
  );
}
