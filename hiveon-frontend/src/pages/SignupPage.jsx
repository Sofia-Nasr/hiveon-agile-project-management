// src/pages/SignupPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import styles from "./SignupPage.module.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link } from "react-router-dom";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");

  const navigate = useNavigate();
  const { login, setForceWorkspaceSetup } = useAuth();

  async function handleSignup(e) {
    e.preventDefault();
    setMsg("");

    try {
      // ✅ NO ROLE SENT ANYMORE
      const res = await api.post("/auth/register", {
        username,
        email,
        password,
      });

      // Apply auth payload
      login(res.data);

      // 🔒 Always force workspace setup after signup
      setForceWorkspaceSetup(true);

      navigate("/workspace-setup", { replace: true });
    } catch (err) {
      setMsg(
        "❌ " +
          (err.response?.data ||
            err.response?.data?.message ||
            "Signup failed")
      );
    }
  }

function handleGoogleSignup() {
  // MUST be absolute URL — same reason as login
  window.location.href = "https://localhost:7028/api/auth/google";
}



  return (
    <div className={styles.container}>
      <form onSubmit={handleSignup} className={styles.form}>
        <h2 className={styles.title}>🐝 Create Your Hiveon Account</h2>


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

        {/* ✅ Google Sign Up (ADDED, nothing else touched) */}
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
