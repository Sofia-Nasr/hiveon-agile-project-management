// src/pages/TeamsPage.jsx
import React, { useEffect, useState } from "react";
import api from "../api/apiClient";
import ProjectPicker from "../components/ProjectPicker";
import styles from "./TeamsPage.module.css";

function TeamCard({
  team,
  isEditing,
  editName,
  onEditNameChange,
  leadEdit,
  onLeadChange,
  onEnterEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onRemoveMember,
  onAddMember,
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.get("/users/search", { params: { q } });
        setResults(res.data || []);
      } catch (err) {
        console.error("User search failed", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [search]);

  const leadMember =
    (team.members || []).find((m) => m.id === team.teamLeadId) || null;

  const initials = (name) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "?";

  return (
    <div className={`${styles.teamCard} ${isEditing ? styles.teamCardEditing : ""}`}>
      {/* Card top accent strip */}
      <div className={styles.teamCardAccent} />

      <div className={styles.teamHeader}>
        {isEditing ? (
          <>
            <div className={styles.teamHeaderLeft}>
              <input
                className={styles.teamNameInput}
                value={editName ?? ""}
                onChange={(e) => onEditNameChange(e.target.value)}
                placeholder="Team name…"
              />
              <div className={styles.teamLeadEditRow}>
                <span className={styles.teamLeadLabel}>Team lead</span>
                <select
                  className={styles.teamLeadSelect}
                  value={leadEdit || ""}
                  onChange={(e) => onLeadChange(e.target.value)}
                >
                  <option value="">No lead</option>
                  {(team.members || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.teamHeaderButtons}>
              <button className={styles.saveBtn} type="button" onClick={onSave}>
                Save
              </button>
              <button className={styles.cancelBtn} type="button" onClick={onCancelEdit}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.teamHeaderLeft}>
              <div className={styles.teamNameRow}>
                <div className={styles.teamAvatar}>{initials(team.name)}</div>
                <div>
                  <div className={styles.teamNameDisplay}>{team.name}</div>
                  <div className={styles.teamId}>{team.id}</div>
                </div>
              </div>
              <div className={styles.teamLeadDisplayRow}>
                <span className={styles.teamLeadPill}>
                  {leadMember ? (
                    <>
                      <span className={styles.leadDot} />
                      {leadMember.name}
                      <span className={styles.memberEmail}>{leadMember.email}</span>
                    </>
                  ) : (
                    <span className={styles.noLead}>No lead assigned</span>
                  )}
                </span>
              </div>
            </div>
            <div className={styles.teamHeaderButtons}>
              <button className={styles.editBtn} type="button" onClick={onEnterEdit}>
                Edit
              </button>
              <button className={styles.deleteBtn} type="button" onClick={onDelete}>
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      <div className={styles.divider} />

      <div className={styles.membersSection}>
        <div className={styles.membersHeader}>
          <span>Members</span>
          <span className={styles.memberCount}>{(team.members || []).length}</span>
        </div>
        {team.members && team.members.length > 0 ? (
          <ul className={styles.membersList}>
            {team.members.map((m) => (
              <li key={m.id} className={styles.memberItem}>
                <div className={styles.memberAvatarSmall}>{initials(m.name)}</div>
                <span className={styles.memberInfo}>
                  {m.name}
                  <span className={styles.memberEmail}>{m.email}</span>
                </span>
                <button
                  className={styles.removeMemberBtn}
                  type="button"
                  onClick={() => onRemoveMember(m.id)}
                  title="Remove member"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptySmall}>No members yet.</p>
        )}
      </div>

      <div className={styles.addMemberSection}>
        <label className={styles.label}>Add member</label>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            className={styles.searchInput}
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <div className={styles.searchDropdown}>
            {searching && <div className={styles.searchHint}>Searching…</div>}
            {!searching && results.length === 0 && (
              <div className={styles.searchHint}>No matches found.</div>
            )}
            {!searching &&
              results.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className={styles.searchResultItem}
                  onClick={() => {
                    onAddMember(u);
                    setSearch("");
                    setResults([]);
                  }}
                >
                  <div className={styles.memberAvatarSmall}>{initials(u.name)}</div>
                  <span>
                    {u.name}
                    <span className={styles.memberEmail}>{u.email}</span>
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const [projectId, setProjectId] = useState("");
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newTeamName, setNewTeamName] = useState("");

  const [leadSearch, setLeadSearch] = useState("");
  const [leadResults, setLeadResults] = useState([]);
  const [leadSearching, setLeadSearching] = useState(false);
  const [newTeamLead, setNewTeamLead] = useState(null);

  const [newTeamMembers, setNewTeamMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState([]);
  const [memberSearching, setMemberSearching] = useState(false);

  const [editNames, setEditNames] = useState({});
  const [leadEdits, setLeadEdits] = useState({});
  const [editingTeamId, setEditingTeamId] = useState(null);

  const totalMembers = teams.reduce((sum, team) => sum + (team.members?.length || 0), 0);
  const teamsWithLeadCount = teams.filter((team) => team.teamLeadId).length;

  useEffect(() => {
    if (!projectId) {
      setTeams([]);
      setEditNames({});
      setLeadEdits({});
      return;
    }
    fetchTeams(projectId);
  }, [projectId]);

  async function fetchTeams(pid) {
    try {
      setLoading(true);
      const res = await api.get("/teams", { params: { projectId: pid } });
      const data = res.data || [];
      setTeams(data);

      const nameMap = {};
      const leadMap = {};
      data.forEach((t) => {
        nameMap[t.id] = t.name;
        leadMap[t.id] = t.teamLeadId || "";
      });
      setEditNames(nameMap);
      setLeadEdits(leadMap);
      setEditingTeamId(null);
    } catch (err) {
      console.error("Failed to load teams", err);
      alert("Failed to load teams");
    } finally {
      setLoading(false);
    }
  }

  async function createTeam() {
    if (!projectId) {
      alert("Select a project first.");
      return;
    }
    if (!newTeamName.trim()) {
      alert("Team name is required.");
      return;
    }

    try {
      const leadId = newTeamLead ? newTeamLead.id : null;

      const createRes = await api.post("/teams", {
        projectId,
        name: newTeamName.trim(),
        teamLeadId: leadId,
      });
      const createdTeam = createRes.data;

      const memberIdSet = new Set(newTeamMembers.map((m) => m.id));
      if (leadId && !memberIdSet.has(leadId)) {
        memberIdSet.add(leadId);
      }

      const allMemberIds = Array.from(memberIdSet);
      if (allMemberIds.length > 0) {
        await api.post(`/teams/${createdTeam.id}/members`, {
          userIds: allMemberIds,
          roleInTeam: "Member",
        });
      }

      setNewTeamName("");
      setNewTeamLead(null);
      setLeadSearch("");
      setLeadResults([]);
      setNewTeamMembers([]);
      setMemberSearch("");
      setMemberResults([]);

      await fetchTeams(projectId);
    } catch (err) {
      console.error("Create team failed", err?.response?.data || err);
      alert("Failed to create team");
    }
  }

  useEffect(() => {
    const q = leadSearch.trim();
    if (!q) {
      setLeadResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setLeadSearching(true);
        const res = await api.get("/users/search", { params: { q } });
        setLeadResults(res.data || []);
      } catch (err) {
        console.error("Lead search failed", err);
      } finally {
        setLeadSearching(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [leadSearch]);

  function selectLead(user) {
    setNewTeamLead(user);
    setLeadSearch("");
    setLeadResults([]);
  }

  function clearLead() {
    setNewTeamLead(null);
  }

  useEffect(() => {
    const q = memberSearch.trim();
    if (!q) {
      setMemberResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setMemberSearching(true);
        const res = await api.get("/users/search", { params: { q } });
        setMemberResults(res.data || []);
      } catch (err) {
        console.error("User search failed", err);
      } finally {
        setMemberSearching(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [memberSearch]);

  function addMemberToNewTeam(user) {
    if (newTeamMembers.some((m) => m.id === user.id)) {
      setMemberSearch("");
      setMemberResults([]);
      return;
    }
    setNewTeamMembers((prev) => [...prev, user]);
    setMemberSearch("");
    setMemberResults([]);
  }

  function removeMemberFromNewTeam(userId) {
    setNewTeamMembers((prev) => prev.filter((m) => m.id !== userId));
  }

  async function saveTeam(teamId) {
    const name = (editNames[teamId] || "").trim();
    if (!name) {
      alert("Name is required.");
      return;
    }
    const teamLeadId = leadEdits[teamId] || null;

    try {
      await api.put(`/teams/${teamId}`, {
        name,
        teamLeadId,
      });
      await fetchTeams(projectId);
      setEditingTeamId(null);
    } catch (err) {
      console.error("Save team failed", err?.response?.data || err);
      alert("Failed to save team");
    }
  }

  async function deleteTeam(teamId) {
    if (!window.confirm("Delete this team? This cannot be undone.")) return;

    try {
      await api.delete(`/teams/${teamId}`);
      await fetchTeams(projectId);
    } catch (err) {
      console.error("Delete team failed", err);
      alert("Failed to delete team");
    }
  }

  async function removeMember(teamId, userId) {
    try {
      await api.delete(`/teams/${teamId}/members/${userId}`);
      await fetchTeams(projectId);
    } catch (err) {
      console.error("Remove member failed", err);
      alert("Failed to remove member");
    }
  }

  async function addMember(teamId, user) {
    try {
      await api.post(`/teams/${teamId}/members`, {
        userIds: [user.id],
        roleInTeam: "Member",
      });
      await fetchTeams(projectId);
    } catch (err) {
      console.error("Add member failed", err?.response?.data || err);
      alert("Failed to add member");
    }
  }

  const initials = (name) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "?";

  return (
    <div className={styles.page}>
      {/* ── Page header ── */}
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Teams</h1>
          <p className={styles.subtitle}>
            Create and manage teams per project. Boards and tickets use these teams.
          </p>
        </div>
      </header>

      {/* ── Two-column layout: sidebar form + main list ── */}
      <div className={styles.layout}>

        {/* ─── LEFT: project picker + create team form ─── */}
        <aside className={styles.sidebar}>

          {/* Project picker */}
          <div className={styles.sidebarBlock}>
            <label className={styles.sidebarLabel}>Project</label>
            <ProjectPicker
              value={projectId}
              onChange={setProjectId}
              showNewLink={false}
            />
          </div>

          {/* Create team form */}
          <div className={styles.createCard}>
            <div className={styles.createCardHeader}>
              <span className={styles.createCardIcon}>＋</span>
              <div>
                <div className={styles.createCardTitle}>New Team</div>
                <div className={styles.createCardHint}>Fill in details below</div>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Team name</label>
              <input
                className={styles.input}
                placeholder="e.g. Backend Squad"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Team lead</label>
              <div className={styles.searchWrap}>
                <span className={styles.searchIcon}>⌕</span>
                <input
                  className={styles.searchInput}
                  placeholder="Search name or email…"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                />
              </div>
              {leadSearch && (
                <div className={styles.searchDropdown}>
                  {leadSearching && <div className={styles.searchHint}>Searching…</div>}
                  {!leadSearching && leadResults.length === 0 && (
                    <div className={styles.searchHint}>No matches found.</div>
                  )}
                  {!leadSearching &&
                    leadResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className={styles.searchResultItem}
                        onClick={() => selectLead(u)}
                      >
                        <div className={styles.memberAvatarSmall}>{initials(u.name)}</div>
                        <span>
                          {u.name}
                          <span className={styles.memberEmail}>{u.email}</span>
                        </span>
                      </button>
                    ))}
                </div>
              )}
              {newTeamLead && (
                <div className={styles.selectedLeadRow}>
                  <div className={styles.memberAvatarSmall}>{initials(newTeamLead.name)}</div>
                  <span className={styles.selectedLeadName}>
                    {newTeamLead.name}
                    <span className={styles.memberEmail}>{newTeamLead.email}</span>
                  </span>
                  <button type="button" className={styles.clearLeadBtn} onClick={clearLead}>
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Members</label>
              <div className={styles.searchWrap}>
                <span className={styles.searchIcon}>⌕</span>
                <input
                  className={styles.searchInput}
                  placeholder="Search name or email…"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
              </div>
              {memberSearch && (
                <div className={styles.searchDropdown}>
                  {memberSearching && <div className={styles.searchHint}>Searching…</div>}
                  {!memberSearching && memberResults.length === 0 && (
                    <div className={styles.searchHint}>No matches found.</div>
                  )}
                  {!memberSearching &&
                    memberResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className={styles.searchResultItem}
                        onClick={() => addMemberToNewTeam(u)}
                      >
                        <div className={styles.memberAvatarSmall}>{initials(u.name)}</div>
                        <span>
                          {u.name}
                          <span className={styles.memberEmail}>{u.email}</span>
                        </span>
                      </button>
                    ))}
                </div>
              )}
              {newTeamMembers.length > 0 && (
                <ul className={styles.membersList}>
                  {newTeamMembers.map((m) => (
                    <li key={m.id} className={styles.memberItem}>
                      <div className={styles.memberAvatarSmall}>{initials(m.name)}</div>
                      <span className={styles.memberInfo}>
                        {m.name}
                        <span className={styles.memberEmail}>{m.email}</span>
                      </span>
                      <button
                        className={styles.removeMemberBtn}
                        type="button"
                        onClick={() => removeMemberFromNewTeam(m.id)}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              className={styles.primaryBtn}
              onClick={createTeam}
              disabled={!projectId || !newTeamName.trim()}
            >
              Create team
            </button>
          </div>
        </aside>

        {/* ─── RIGHT: teams list ─── */}
        <main className={styles.main}>
          {!projectId && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>◎</div>
              <p className={styles.emptyTitle}>No project selected</p>
              <p className={styles.emptyBody}>
                Pick a project on the left to see and manage its teams.
              </p>
            </div>
          )}

          {projectId && loading && (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              <span>Loading teams…</span>
            </div>
          )}

          {projectId && !loading && teams.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>◈</div>
              <p className={styles.emptyTitle}>No teams yet</p>
              <p className={styles.emptyBody}>
                Create your first team using the form on the left.
              </p>
            </div>
          )}

          {projectId && !loading && teams.length > 0 && (
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Teams</div>
                <div className={styles.summaryValue}>{teams.length}</div>
                <div className={styles.summaryHint}>Active teams in this project</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Team leads</div>
                <div className={styles.summaryValue}>{teamsWithLeadCount}</div>
                <div className={styles.summaryHint}>Teams with an assigned lead</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Members</div>
                <div className={styles.summaryValue}>{totalMembers}</div>
                <div className={styles.summaryHint}>Members across all teams</div>
              </div>
            </div>
          )}

          {projectId && !loading && (
            <div className={styles.teamsList}>
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  isEditing={editingTeamId === team.id}
                  editName={editNames[team.id]}
                  onEditNameChange={(name) =>
                    setEditNames((prev) => ({ ...prev, [team.id]: name }))
                  }
                  leadEdit={leadEdits[team.id]}
                  onLeadChange={(val) =>
                    setLeadEdits((prev) => ({ ...prev, [team.id]: val }))
                  }
                  onEnterEdit={() => {
                    setEditNames((prev) => ({ ...prev, [team.id]: team.name }));
                    setLeadEdits((prev) => ({
                      ...prev,
                      [team.id]: team.teamLeadId || "",
                    }));
                    setEditingTeamId(team.id);
                  }}
                  onCancelEdit={() => {
                    setEditNames((prev) => ({ ...prev, [team.id]: team.name }));
                    setLeadEdits((prev) => ({
                      ...prev,
                      [team.id]: team.teamLeadId || "",
                    }));
                    setEditingTeamId(null);
                  }}
                  onSave={() => saveTeam(team.id)}
                  onDelete={() => deleteTeam(team.id)}
                  onRemoveMember={(userId) => removeMember(team.id, userId)}
                  onAddMember={(user) => addMember(team.id, user)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}