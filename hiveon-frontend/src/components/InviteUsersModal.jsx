import React, { useState } from "react";
import styles from "./InviteUsersModal.module.css";
import { sendWorkspaceInvite } from "../api/workspaceApi";

export default function InviteUsersModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Developer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [open, setOpen] = useState(false);
  async function submit() {
    if (!email.trim()) return;

    try {
      setLoading(true);
      setError("");

      await sendWorkspaceInvite({
        email: email.trim(),
        role,
      });

      setSuccess(true);
    } catch (err) {
      // 🔒 ALWAYS render a string, never an object
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send invitation.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>Invite User</h2>

        {success ? (
          <>
            <p className={styles.success}>
              Invitation sent successfully.
            </p>
            <button
              className={styles.primary}
              onClick={onClose}
            >
              Done
            </button>
          </>
        ) : (
          <>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@email.com"
              className={styles.input}
            />

<label>Role</label>

<div className={styles.dropdown}>
  <button
    type="button"
    className={styles.dropdownTrigger}
    onClick={() => setOpen((o) => !o)}
  >
    <span>{role === "ScrumMaster" ? "Scrum Master" : "Developer"}</span>
    <span className={styles.arrow}>▾</span>
  </button>

  {open && (
    <div className={styles.dropdownMenu}>
      <button
        type="button"
        className={styles.dropdownItem}
        onClick={() => {
          setRole("Developer");
          setOpen(false);
        }}
      >
        Developer
      </button>

      <button
        type="button"
        className={styles.dropdownItem}
        onClick={() => {
          setRole("ScrumMaster");
          setOpen(false);
        }}
      >
        Scrum Master
      </button>
    </div>
  )}
</div>



            {error && (
              <p className={styles.error}>{error}</p>
            )}

            <div className={styles.actions}>
              <button
                className={styles.secondary}
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className={styles.primary}
                onClick={submit}
                disabled={loading}
              >
                {loading ? "Sending…" : "Send Invite"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
