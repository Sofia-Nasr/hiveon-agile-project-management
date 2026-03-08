import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import ProjectPicker from "../components/ProjectPicker";
import styles from "./RiskAnalysisPage.module.css";
import { getProjectRisks, createRisk, updateRiskStatus } from "../api/riskApi";
import api from "../api/apiClient";


export default function RiskAnalysisPage() {
  const { user } = useAuth();

  const [projectId, setProjectId] = useState(
    localStorage.getItem("currentProjectId") || ""
  );
const [users, setUsers] = useState([]);

  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
  title: "",
  category: "Technical",
  probability: "Medium",
  impact: "Medium",
  consequence: "",
  mitigationPlan: "",
  ownerUserId: "",
});
useEffect(() => {
  async function loadMembers() {
    try {
      const res = await api.get("/workspace/members");
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to load workspace members");
    }
  }

  loadMembers();
}, []);


async function handleStatusChange(id, newStatus) {
  try {
    await updateRiskStatus(id, newStatus);
    fetchRisks(projectId);
  } catch (err) {
    console.error("Failed to update status");
  }
}

  useEffect(() => {
    if (!projectId) return;
    fetchRisks(projectId);
  }, [projectId]);

  async function fetchRisks(pid) {
    try {
      setLoading(true);
      const data = await getProjectRisks(pid);
      setRisks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load risks", err?.response || err);
    } finally {
      setLoading(false);
    }
  }


  function score(v) {
    const s = v?.toLowerCase();
    if (s === "high") return 3;
    if (s === "medium") return 2;
    return 1;
  }

  const exposure = score(form.probability) * score(form.impact);

async function openModal() {
  setShowModal(true);

  try {
    const res = await api.get("/workspace/members");
    setUsers(res.data || []);
  } catch (err) {
    console.error("Failed to load workspace members", err?.response || err);
  }
}


  function closeModal() {
    setShowModal(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;

    try {
      setSaving(true);

    await createRisk({
  projectId,
  title: form.title,
  category: form.category,
  probability: form.probability,
  impact: form.impact,
  consequence: form.consequence,
  mitigationPlan: form.mitigationPlan,
  ownerUserId: form.ownerUserId || null,
});

setForm({
  title: "",
  category: "Technical",
  probability: "Medium",
  impact: "Medium",
  consequence: "",
  mitigationPlan: "",
  ownerUserId: "",
});


      closeModal();
      fetchRisks(projectId);
    } catch (err) {
      console.error("Failed to create risk", err?.response || err);
    } finally {
      setSaving(false);
    }
  }

  function levelClass(level) {
    const v = level?.toLowerCase();
    if (v === "high") return styles.high;
    if (v === "medium") return styles.medium;
    if (v === "low") return styles.low;
    return "";
  }

  function statusClass(status) {
    const s = status?.toLowerCase();
    if (s === "open") return styles.open;
    if (s === "monitoring") return styles.monitoring;
    if (s === "mitigated") return styles.mitigated;
    if (s === "occurred") return styles.occurred;
    if (s === "closed") return styles.closed;
    return "";
  }
function getOwnerName(ownerUserId) {
  if (!ownerUserId) return "Unassigned";

  const member = users.find(
    (u) => String(u.id) === String(ownerUserId)
  );

  return member?.name || member?.email || "Unassigned";
}


  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.headerRow}>
        <div>
          <h1>⚠ Risk Analysis</h1>
          <p>Project risk register and mitigation tracking</p>
        </div>

        <button className={styles.addBtn} onClick={openModal}>
          + Add Risk
        </button>
      </header>

      <ProjectPicker value={projectId} onChange={setProjectId} />

      {loading && <p className={styles.info}>Loading risks...</p>}

      {!loading && risks.length === 0 && (
        <p className={styles.info}>No risks defined for this project.</p>
      )}

      {!loading && risks.length > 0 && (
        <section className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
  <tr>
    <th>Title</th>
    <th>Category</th>
    <th>Probability</th>
    <th>Impact</th>
    <th>Exposure</th>
    <th>Owner</th> {/* NEW */}
    <th>Consequence</th>
    <th>Mitigation</th>
    <th>Status</th>
  </tr>
</thead>

            <tbody>
              {risks.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>

                  <td>
                    <span className={styles.category}>{r.category}</span>
                  </td>

                  <td className={levelClass(r.probability)}>
                    {r.probability}
                  </td>

                  <td className={levelClass(r.impact)}>
                    {r.impact}
                  </td>

                  <td className={styles.exposure}>{r.exposure}</td>
  <td>
  {getOwnerName(r.ownerUserId)}
</td>



                  <td>{r.consequence}</td>

                  <td>{r.mitigationPlan}</td>

                  <td>
                    <select
  className={`${styles.status} ${statusClass(r.status)}`}
  value={r.status}
  onChange={(e) => handleStatusChange(r.id, e.target.value)}
  disabled={!(user?.role === "ProductOwner" || user?.role === "ScrumMaster")}
>
  <option>Open</option>
  <option>Monitoring</option>
  <option>Mitigated</option>
  <option>Occurred</option>
  <option>Closed</option>
</select>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Modal */}
      {showModal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Add New Risk</h2>
              <button onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <label>Project</label>
              <input
                value={localStorage.getItem("currentProjectName") || ""}
                disabled
              />

              <label>Title</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Risk title"
              />

              <div className={styles.row}>
                <div>
                  <label>Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                  >
                    <option>Technical</option>
                    <option>Business</option>
                    <option>Dependency</option>
                    <option>Resource</option>
                    <option>Infrastructure</option>
                  </select>
                </div>

                <div>
                  <label>Status</label>
                  <input value="Open" disabled />
                </div>
              </div>

              <div className={styles.row}>
                <div>
                  <label>Probability</label>
                  <select
                    name="probability"
                    value={form.probability}
                    onChange={handleChange}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>

                <div>
                  <label>Impact</label>
                  <select
                    name="impact"
                    value={form.impact}
                    onChange={handleChange}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>

                <div>
                  <label>Exposure</label>
                  <input value={exposure} disabled />
                </div>
              </div>


<label>Owner</label>
<select
  name="ownerUserId"
  value={form.ownerUserId}
  onChange={handleChange}
>
  <option value="">Select owner</option>
  {users.map((u) => (
    <option key={u.id} value={u.id}>
      {u.name || u.email}
    </option>
  ))}
</select>


              <label>Consequence</label>
              <input
                name="consequence"
                value={form.consequence}
                onChange={handleChange}
                placeholder="What happens if this risk occurs?"
              />

              <label>Mitigation</label>
              <input
                name="mitigationPlan"
                value={form.mitigationPlan}
                onChange={handleChange}
                placeholder="How to mitigate this risk?"
              />

              <div className={styles.actions}>
                <button type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}>
                  {saving ? "Adding..." : "Add Risk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
