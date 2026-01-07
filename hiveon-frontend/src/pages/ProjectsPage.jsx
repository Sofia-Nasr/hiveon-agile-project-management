
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/apiClient";
import styles from "./ProjectsPage.module.css";

export default function ProjectsPage() {
 const { user } = useAuth();
const isPO = user?.role === "ProductOwner";


  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // create-project modal state

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [client, setClient] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/projects");
      const list = Array.isArray(res.data) ? res.data : [];
      setProjects(list);
    } catch (err) {
      console.error("Failed to load projects", err?.response || err);
      setError("Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setDescription("");
    setClient("");
    setStartDate("");
    setEndDate("");
    setMessage("");
    setSaving(false);
  }

  function openCreate() {
  if (!isPO) return;         
  resetForm();
  setShowCreate(true);
}


  function closeCreate() {
    setShowCreate(false);
  }

  function extractProjectId(data) {
    if (!data) return null;
    return data.id ?? data.projectId ?? data?.data?.id ?? null;
  }

  function formatDate(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  }

function isEndDateBeforeStart(start, end) {
  if (!start || !end) return false;
  return new Date(end) < new Date(start);
}


  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) {
      setMessage("❌ Please enter a project name.");
      return;
    }
if (startDate && endDate && isEndDateBeforeStart(startDate, endDate)) {
  setMessage("❌ End date cannot be before start date.");
  return;
}

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        name: name.trim(),
        description: description?.trim() || "",
        client: client?.trim() || null,
        startDate: startDate || null,
        endDate: endDate || null,
        members: [],
      };

      const res = await api.post("/projects", payload);
      const newId = extractProjectId(res.data);

      if (!newId) {
        setMessage("⚠️ Created, but no project ID returned by server.");
      }

      // add to cards immediately
      const newProject = {
        id: newId,
        name: payload.name,
        description: payload.description,
        client: payload.client,
        startDate: payload.startDate,
        endDate: payload.endDate,
      };

      setProjects((prev) => [newProject, ...prev]);
      closeCreate();
    } catch (err) {
      console.error("Create project failed:", err?.response || err);
      const apiMsg =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string"
          ? err.response.data
          : "") ||
        err?.message ||
        "Unknown error";
      setMessage("❌ Failed: " + apiMsg);
    } finally {
      setSaving(false);
    }
  }

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className={styles.page}>
   <header className={styles.header}>
  <div>
    <h1 className={styles.title}>Projects</h1>
    <p className={styles.subtitle}>
      Manage your projects, clients, and roadmaps.
    </p>
  </div>

  {isPO && (
    <button className={styles.primaryBtn} onClick={openCreate}>
      + Create Project
    </button>
  )}
</header>


      {error && <p className={styles.error}>{error}</p>}
      {loading && <p className={styles.info}>Loading projects...</p>}

      {!loading && projects.length === 0 && (
        <p className={styles.info}>
          No projects yet. Click &quot;Create Project&quot; to get started.
        </p>
      )}

      {!loading && projects.length > 0 && (
        <section className={styles.grid}>
          {projects.map((p) => {
            const isExpanded = expandedId === p.id;
            const desc =
              p.description && p.description.trim().length > 0
                ? p.description
                : "No description yet.";
            return (
              <article
                key={p.id}
                className={`${styles.card} ${
                  isExpanded ? styles.cardExpanded : ""
                }`}
                onClick={() => toggleExpand(p.id)}
              >
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{p.name}</h2>
                  {p.client && (
                    <span className={styles.cardClient}>{p.client}</span>
                  )}
                </div>

                <div className={styles.cardMeta}>
                  <span className={styles.metaItem}>
                    Start: {formatDate(p.startDate)}
                  </span>
                  <span className={styles.metaItem}>
                    End: {formatDate(p.endDate)}
                  </span>
                </div>

                <p
                  className={`${styles.cardDescription} ${
                    isExpanded
                      ? styles.cardDescriptionExpanded
                      : styles.cardDescriptionCollapsed
                  }`}
                >
                  {desc}
                </p>

                <div className={styles.cardFooter}>
                  <span className={styles.cardHint}>
                    {isExpanded ? "Click to show less" : "Click to read more"}
                  </span>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Create project modal */}
      {showCreate && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>🐝 Project Details</h2>
                <p className={styles.modalSubtitle}>
                  Configure your project settings and timeline.
                </p>
              </div>
              <button className={styles.closeBtn} onClick={closeCreate}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className={styles.form}>
              <label className={styles.label}>Project Name</label>
              <input
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name"
                required
              />
              <small className={styles.helper}>
                Choose a descriptive name for your project.
              </small>

              <label className={styles.label}>Description</label>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project"
              />
              <small className={styles.helper}>
                Provide a brief overview of the project.
              </small>

              <label className={styles.label}>Client</label>
              <input
                className={styles.input}
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Client Name "
              />

              <div className={styles.row}>
                <div className={styles.column}>
                  <label className={styles.label}>Start Date</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className={styles.column}>
                  <label className={styles.label}>End Date</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {message && <p className={styles.message}>{message}</p>}

              <div className={styles.actions}>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={saving}
                >
                  {saving ? "Creating…" : "Create Project"}
                </button>
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={closeCreate}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
