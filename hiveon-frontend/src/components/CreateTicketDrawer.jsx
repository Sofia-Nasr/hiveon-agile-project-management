import React, { useEffect, useState } from "react";
import api from "../api/apiClient";
import ProjectPicker from "./ProjectPicker";
import TeamPicker from "./TeamPicker";
import EpicPicker from "./EpicPicker";
import styles from "./CreateTicketDrawer.module.css";

const initialFormState = {
  title: "",
  description: "",
  epicId: "",
  priority: "Low",
  storyPoints: 0,
  acceptanceCriteria: "",
  severity: "",
  probability: "",
  environment: "",
  buildCrash: false,
  productionImpacted: false,
  client: "",
  effortEstimate: "",
  revenueImpact: "",
  sprintId: "",
  assigneeId: "",
  plannedStart: "",
  plannedEnd: "",
  trendingEndDate: "",
  targetForSprint: "",
  bugId: "", // UI-only: manual bug id, packed into Title
};

export default function CreateTicketDrawer() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("Epic");
  const [teamMembers, setTeamMembers] = useState([]);
  const [activeTab, setActiveTab] = useState("Summary"); // "Summary" | "Planning"
  const [formError, setFormError] = useState("");

  const [projectId, setProjectId] = useState(
    localStorage.getItem("currentProjectId") || ""
  );
  const [teamId, setTeamId] = useState(null);

  const [form, setForm] = useState(initialFormState);

  // Open drawer from sidebar event
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-create-ticket", handler);
    return () => window.removeEventListener("open-create-ticket", handler);
  }, []);

  // Load team members + default assignee = team lead
  useEffect(() => {
    if (!teamId || !projectId) {
      setTeamMembers([]);
      setForm((prev) => ({ ...prev, assigneeId: "" }));
      return;
    }

    let alive = true;

    (async () => {
      try {
        const res = await api.get("/teams", { params: { projectId } });
        if (!alive) return;

        const teams = Array.isArray(res.data) ? res.data : [];
        const team = teams.find((t) => t.id === teamId);

        if (!team) {
          console.warn(
            "[CreateTicketDrawer] Selected team not found in /teams response"
          );
          setTeamMembers([]);
          return;
        }

        const members = Array.isArray(team.members) ? team.members : [];
        setTeamMembers(members);

        if (team.teamLeadId) {
          setForm((prev) => ({
            ...prev,
            assigneeId: prev.assigneeId || team.teamLeadId,
          }));
        }
      } catch (err) {
        console.error("Failed to load team for assignee:", err?.response || err);
        setTeamMembers([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [teamId, projectId]);

  function close() {
    setOpen(false);
    setForm(initialFormState);
    setType("Epic");
    setActiveTab("Summary");
    setTeamId(null);
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
function isEndBeforeStart(start, end) {
  if (!start || !end) return false;
  return new Date(end) < new Date(start);
}


  async function submit() {
    if (!projectId) {
      alert("Please select a project.");
      return;
    }
    if (!form.title?.trim()) {
      alert("Title / Name is required.");
      return;
    }
    if (type === "UserStory" && !form.storyPoints) {
      alert("Story Points are required for User Stories.");
      return;
    }
setFormError("");

// Planned dates (UserStory, Bug, Support, Epic planning tab)
if (
  form.plannedStart &&
  form.plannedEnd &&
  isEndBeforeStart(form.plannedStart, form.plannedEnd)
) {
  setFormError("End date cannot be before start date.");
  return;
}
    // Title handling: for Bug, combine Bug ID + Name
    let title = form.title.trim();
    if (type === "Bug" && form.bugId?.trim()) {
      title = `${form.bugId.trim()} - ${title}`;
    }

    const base = {
      projectId,
      type,
      title,
      description: form.description || "",
      epicId: form.epicId || null,
      priority: form.priority || null,
      storyPoints: form.storyPoints || 0,
      plannedStart: form.plannedStart ? new Date(form.plannedStart) : null,
      plannedEnd: form.plannedEnd ? new Date(form.plannedEnd) : null,
      sprintId: form.sprintId || null,
      assigneeId: form.assigneeId || null,
      teamId: teamId || null,
    };

    let payload = base;

    if (type === "Epic") {
      payload = {
        ...base,
        client: form.client || null,
        effortEstimate: form.effortEstimate || null,
        revenueImpact: form.revenueImpact || null,
        startDate: form.plannedStart ? new Date(form.plannedStart) : null,
        endDate: form.plannedEnd ? new Date(form.plannedEnd) : null,
      };
    } else if (type === "UserStory") {
      payload = {
        ...base,
        acceptanceCriteria: form.acceptanceCriteria || null,
        targetForSprint: form.targetForSprint || null, // backend ignores this extra field
      };
    } else if (type === "Bug") {
      payload = {
        ...base,
        severity: form.severity || null,
        probability: form.probability || null,
        environment: form.environment || null,
        buildCrash: !!form.buildCrash,
        productionImpacted: !!form.productionImpacted,
        trendingEndDate: form.trendingEndDate
          ? new Date(form.trendingEndDate)
          : null,
      };
    } else if (type === "Support") {
      payload = base;
    }

    try {
    if (type === "UserStory") {
  await api.post("/userstories", {
    projectId,
    epicId: form.epicId || null,
    sprintId: form.sprintId || null,
    title,
    description: form.description || null,
    priority: form.priority || "Medium",
    storyPoints: form.storyPoints || 0,
    targetForSprint: form.targetForSprint || null,
    acceptanceCriteria: form.acceptanceCriteria || null,
    assigneeId: form.assigneeId || null,
  });
} else {
  await api.post("/tickets", payload);
}


      window.dispatchEvent(new CustomEvent("refresh-backlog"));

      close();
      alert("Ticket created successfully.");
    } catch (err) {
      console.error("Create ticket failed:", err);

      const status = err?.response?.status;
      const data = err?.response?.data;

      alert(
        "Failed to create ticket\n\n" +
          "Status: " +
          (status ?? "unknown") +
          "\n\n" +
          "Response: " +
          (typeof data === "string"
            ? data
            : JSON.stringify(data, null, 2))
      );
    }
  }

  /* ---------- Fields per tab & type ---------- */

  function renderSummaryFields() {
    switch (type) {
      case "Epic":
        return (
          <>
            <label className={styles.label}>Name *</label>
            <input
              className={styles.input}
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
            />

            <label className={styles.label}>Description *</label>
            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />

          </>
        );

      case "UserStory":
        return (
          <>
            <label className={styles.label}>Title *</label>
            <input
              className={styles.input}
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
            />

            <label className={styles.label}>Description *</label>
            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />

            <label className={styles.label}>Epic</label>
            <EpicPicker
              projectId={projectId}
              value={form.epicId}
              onChange={(id) => updateField("epicId", id)}
            />

            <div className={styles.row}>
              <div className={styles.col}>
                <label className={styles.label}>Priority</label>
                <select
                  className={styles.select}
                  value={form.priority}
                  onChange={(e) => updateField("priority", e.target.value)}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
              <div className={styles.col}>
                <label className={styles.label}>Story Points *</label>
                <select
                  className={styles.select}
                  value={form.storyPoints || ""}
                  onChange={(e) =>
                    updateField("storyPoints", Number(e.target.value) || 0)
                  }
                >
                  <option value="">-- Select --</option>
                  <option value="1">
                    1 SP – Min complexity (No additional effort)
                  </option>
                  <option value="2">2 SP – Need Detailed Analysis</option>
                  <option value="4">4 SP – Need Meeting</option>
                  <option value="8">8 SP – Need Detailed Documentation</option>
                </select>
              </div>
            </div>

            <label className={styles.label}>Acceptance Criteria</label>
            <textarea
              className={styles.textarea}
              value={form.acceptanceCriteria}
              onChange={(e) =>
                updateField("acceptanceCriteria", e.target.value)
              }
            />
          </>
        );

      case "Bug":
        return (
          <>
            <label className={styles.label}>Bug ID *</label>
            <input
              className={styles.input}
              type="text"
              value={form.bugId}
              onChange={(e) => updateField("bugId", e.target.value)}
              placeholder="e.g. BUG-101"
            />

            <label className={styles.label}>Name *</label>
            <input
              className={styles.input}
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Short name for this bug"
            />

            <label className={styles.label}>Description *</label>
            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />

            <label className={styles.label}>Epic</label>
            <EpicPicker
              projectId={projectId}
              value={form.epicId}
              onChange={(id) => updateField("epicId", id)}
            />

            <div className={styles.row}>
              <div className={styles.col}>
                <label className={styles.label}>Priority</label>
                <select
                  className={styles.select}
                  value={form.priority}
                  onChange={(e) => updateField("priority", e.target.value)}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
              <div className={styles.row}>
  <div className={styles.col}>
    <label className={styles.label}>
      Severity – Impact of the bug to customer
    </label>
    <select
      className={styles.select}
      value={form.severity}
      onChange={(e) => updateField("severity", e.target.value)}
    >
      <option value="">-- Select Severity --</option>
      <option value="S1">
        S1 – Major: Full outage, severe business impact, core functionality broken, routing impacted
      </option>
      <option value="S2">
        S2 – High: Partial outage, revenue loss, core functionality degraded but routing intact
      </option>
      <option value="S3">
        S3 – Medium: Non-core functionality loss, some impact
      </option>
      <option value="S4">
        S4 – Low: Minor issue, not business/revenue impacting
      </option>
    </select>
  </div>

  <div className={styles.col}>
    <label className={styles.label}>
      Probability – Likelihood of bug being experienced
    </label>
    <select
      className={styles.select}
      value={form.probability}
      onChange={(e) => updateField("probability", e.target.value)}
    >
      <option value="">-- Select Probability --</option>
      <option value="P1">
        P1 – Most customers &gt;10%
      </option>
      <option value="P2">
        P2 – Many customers 1–10%
      </option>
      <option value="P3">
        P3 – Some customers 0.01–1%
      </option>
      <option value="P4">
        P4 – Few customers &lt;0.01%
      </option>
    </select>
  </div>
</div>

              <div className={styles.col}>
                <label className={styles.label}>Reported Environment *</label>
                <select
                  className={styles.select}
                  value={form.environment}
                  onChange={(e) => updateField("environment", e.target.value)}
                >
                  <option value="">--</option>
                  <option value="Production">Production</option>
                  <option value="QA">QA</option>
                </select>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.col}>
                <label className={styles.label}>
                  Bug in build caused crash?
                </label>
                <select
                  className={styles.select}
                  value={form.buildCrash ? "Yes" : "No"}
                  onChange={(e) =>
                    updateField("buildCrash", e.target.value === "Yes")
                  }
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div className={styles.col}>
                <label className={styles.label}>Production impacted?</label>
                <select
                  className={styles.select}
                  value={form.productionImpacted ? "Yes" : "No"}
                  onChange={(e) =>
                    updateField("productionImpacted", e.target.value === "Yes")
                  }
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>
          </>
        );

            case "Support":
      default:
        return (
          <>
            <label className={styles.label}>Name *</label>
            <input
              className={styles.input}
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Short name for this support task"
            />

            <label className={styles.label}>Description *</label>
            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />

            <label className={styles.label}>Priority</label>
            <select
              className={styles.select}
              value={form.priority}
              onChange={(e) => updateField("priority", e.target.value)}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </>
        );

    }
  }

  function renderPlanningFields() {
    switch (type) {
      case "Epic":
        return (
          <>
            <div className={styles.row}>
              <div className={styles.col}>
                <label className={styles.label}>Start Date</label>
                <input
                  className={styles.input}
                  type="date"
                  value={form.plannedStart || ""}
                  onChange={(e) =>
                    updateField("plannedStart", e.target.value)
                  }
                />
              </div>
              <div className={styles.col}>
                <label className={styles.label}>End Date</label>
                <input
                  className={styles.input}
                  type="date"
                  value={form.plannedEnd || ""}
                  onChange={(e) => updateField("plannedEnd", e.target.value)}
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.col}>
                <label className={styles.label}>Effort estimation</label>
                <select
                  className={styles.select}
                  value={form.effortEstimate || ""}
                  onChange={(e) =>
                    updateField("effortEstimate", e.target.value)
                  }
                >
                  <option value="">-- Select --</option>
                  <option value="1">XS – Tiny</option>
                  <option value="2">S – Small</option>
                  <option value="3">M – Medium</option>
                  <option value="4">L – Large</option>
                  <option value="5">XL – Huge</option>
                </select>
              </div>
              <div className={styles.col}>
                <label className={styles.label}>Revenue impact</label>
                <select
                  className={styles.select}
                  value={form.revenueImpact || ""}
                  onChange={(e) =>
                    updateField("revenueImpact", e.target.value)
                  }
                >
                  <option value="">-- Select --</option>
                  <option value="0">None / Internal</option>
                  <option value="1">Low</option>
                  <option value="2">Medium</option>
                  <option value="3">High</option>
                  <option value="4">Critical</option>
                </select>
              </div>
            </div>
          </>
        );

      case "UserStory":
        return (
          <>
            <div className={styles.row}>
              <div className={styles.col}>
                <label className={styles.label}>Target for Sprint</label>
                <select
                  className={styles.select}
                  value={form.targetForSprint || ""}
                  onChange={(e) =>
                    updateField("targetForSprint", e.target.value)
                  }
                >
                  <option value="">-- Optional --</option>
                  <option value="DevOnly">Dev only</option>
                  <option value="QAOnly">QA only</option>
                  <option value="DevAndQA">Dev + QA</option>
                </select>
              </div>

              <div className={styles.col}>
                <label className={styles.label}>Assignee</label>
                <select
                  className={styles.select}
                  value={form.assigneeId || ""}
                  onChange={(e) => updateField("assigneeId", e.target.value)}
                  disabled={!teamId}
                >
                  <option value="">
                    {teamId ? "Unassigned" : "Select team first"}
                  </option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.email || m.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.col}>
                <label className={styles.label}>Planned Start</label>
                <input
                  className={styles.input}
                  type="date"
                  value={form.plannedStart || ""}
                  onChange={(e) =>
                    updateField("plannedStart", e.target.value)
                  }
                />
              </div>
              <div className={styles.col}>
                <label className={styles.label}>Planned End</label>
                <input
                  className={styles.input}
                  type="date"
                  value={form.plannedEnd || ""}
                  onChange={(e) =>
                    updateField("plannedEnd", e.target.value)
                  }
                />
              </div>
            </div>
          </>
        );

      case "Bug":
        return (
          <>
            <div className={styles.row}>
              <div className={styles.col}>
                <label className={styles.label}>Assignee</label>
                <select
                  className={styles.select}
                  value={form.assigneeId || ""}
                  onChange={(e) => updateField("assigneeId", e.target.value)}
                  disabled={!teamId}
                >
                  <option value="">
                    {teamId ? "Unassigned" : "Select team first"}
                  </option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.email || m.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className={styles.label}>Trending End Date</label>
            <input
              className={styles.input}
              type="date"
              value={form.trendingEndDate || ""}
              onChange={(e) =>
                updateField("trendingEndDate", e.target.value)
              }
            />
          </>
        );

      case "Support":
      default:
        return (
          <>
            <div className={styles.row}>
              <div className={styles.col}>
                <label className={styles.label}>Assignee</label>
                <select
                  className={styles.select}
                  value={form.assigneeId || ""}
                  onChange={(e) => updateField("assigneeId", e.target.value)}
                  disabled={!teamId}
                >
                  <option value="">
                    {teamId ? "Unassigned" : "Select team first"}
                  </option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.email || m.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.col}>
                <label className={styles.label}>Planned Start</label>
                <input
                  className={styles.input}
                  type="date"
                  value={form.plannedStart || ""}
                  onChange={(e) =>
                    updateField("plannedStart", e.target.value)
                  }
                />
              </div>
              <div className={styles.col}>
                <label className={styles.label}>Planned End</label>
                <input
                  className={styles.input}
                  type="date"
                  value={form.plannedEnd || ""}
                  onChange={(e) =>
                    updateField("plannedEnd", e.target.value)
                  }
                />
              </div>
            </div>
          </>
        );
    }
  }

  if (!open) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.title}>Create Ticket</h2>
            <p className={styles.subtitle}>{type}</p>
          </div>
          <button className={styles.closeBtn} onClick={close}>
            ✕
          </button>
        </div>

        <div className={styles.topRow}>
  <div className={styles.projectWrap}>
    <label className={styles.label}>Project</label>
    <ProjectPicker
      value={projectId}
      onChange={(id) => {
        setProjectId(id);
        localStorage.setItem("currentProjectId", id || "");
        setTeamId(null); // reset team when project changes
        setForm((prev) => ({
          ...prev,
          epicId: "",
          targetForSprint: "",
        }));
      }}
      showLabel={false}
    />
  </div>

  <div className={styles.typeWrap}>
    <label className={styles.label}>Type</label>
    <select
      className={styles.select}
      value={type}
      onChange={(e) => {
        setType(e.target.value);
        setActiveTab("Summary");
      }}
    >
      <option value="Epic">Epic</option>
      <option value="UserStory">User Story</option>
      <option value="Bug">Bug</option>
      <option value="Support">Support Task</option>
    </select>
  </div>

  <div className={styles.typeWrap}>
    <label className={styles.label}>Team</label>
    <TeamPicker
      projectId={projectId}
      value={teamId}
      onChange={setTeamId}
      placeholder="Unassigned"
    />
  </div>
</div>


        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${
              activeTab === "Summary" ? styles.tabActive : ""
            }`}
            onClick={() => setActiveTab("Summary")}
          >
            Summary
          </button>
          <button
            className={`${styles.tab} ${
              activeTab === "Planning" ? styles.tabActive : ""
            }`}
            onClick={() => setActiveTab("Planning")}
          >
            Planning
          </button>
        </div>

        <div className={styles.body}>
          {activeTab === "Summary"
            ? renderSummaryFields()
            : renderPlanningFields()}
        </div>

        {formError && (
  <div className={styles.formError}>
    {formError}
  </div>
)}


        <div className={styles.footer}>
          <button className={styles.primaryBtn} onClick={submit}>
            Create Ticket
          </button>
          <button className={styles.ghostBtn} onClick={close}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
