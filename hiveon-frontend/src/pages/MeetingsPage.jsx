import { useEffect, useState } from "react";
import api from "../api/apiClient";
import styles from "./MeetingsPage.module.css";
import { useAuth } from "../context/AuthContext";
import ReactDOM from "react-dom";
import {
  FaCalendarAlt,
  FaClock,
  FaVideo,
  FaExternalLinkAlt,
  FaTrash
} from "react-icons/fa";
import TeamPicker from "../components/TeamPicker";

export default function MeetingsPage() {
  const { user } = useAuth();

  const [meetings, setMeetings] = useState([]);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [teamId, setTeamId] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [form, setForm] = useState({
    title: "",
    projectId: "",
    description: "",
    date: "",
    time: "",
    duration: 30,
    participants: []
  });

  useEffect(() => {
    loadMeetings();
    loadProjects();
  }, []);

  /* auto refresh countdown every 30s */

  useEffect(() => {
    const interval = setInterval(() => {
      loadMeetings();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  function toggleDescription(id) {
  setExpandedDescriptions(prev => ({
    ...prev,
    [id]: !prev[id]
  }));
}
  /* ------------------- LOAD ------------------- */
 async function loadMeetings() {
  setLoading(true);

  const res = await api.get("/meetings");

  const sorted =
    res.data?.sort(
      (a, b) =>
        new Date(a.startTime).getTime() -
        new Date(b.startTime).getTime()
    ) || [];

  setMeetings(sorted);

  setLoading(false);
}
  async function loadProjects() {
    const res = await api.get("/projects");
    setProjects(res.data || []);
  }

  /* ------------------- TEAM MEMBERS ------------------- */

  useEffect(() => {
    if (!teamId || !form.projectId) {
      setTeamMembers([]);
      setForm(prev => ({ ...prev, participants: [] }));
      return;
    }

    let alive = true;

    (async () => {
      try {
        const res = await api.get("/teams", {
          params: { projectId: form.projectId }
        });

        const teams = Array.isArray(res.data) ? res.data : [];
        const team = teams.find(t => t.id === teamId);

        if (!team || !alive) return;

        const members = team.members || [];

        setTeamMembers(members);

        setForm(prev => ({
          ...prev,
          participants: members.map(m => m.id)
        }));
      } catch {
        setTeamMembers([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [teamId, form.projectId]);

  /* ------------------- HELPERS ------------------- */

  function roundToFive(date) {
    const ms = 1000 * 60 * 5;
    return new Date(Math.ceil(date.getTime() / ms) * ms);
  }

  function isToday(date) {
    const today = new Date();
    const d = new Date(date);

    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  }
function isLive(start, end) {
  const now = Date.now();
  return now >= start.getTime() && now <= end.getTime();
}
  function getCountdown(start) {
  const startDate = new Date(start);
  const now = new Date();

  const diff = startDate.getTime() - now.getTime();

  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  const formattedDate = startDate.toLocaleDateString([], {
    month: "short",
    day: "numeric"
  });

  if (days > 0) {
    return `Starts ${formattedDate} (${days}d)`;
  }

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `Starts today (${hours}h ${minutes % 60}m)`;
  }

  if (minutes > 1) {
    return `Starts in ${minutes} min`;
  }

  return "Starting soon";
}
  /* ------------------- FORM ------------------- */

  function openSchedule() {
    setShowForm(true);
  }

  function closeSchedule() {
    setShowForm(false);
    setTeamMembers([]);
    setTeamId(null);

    setForm({
      title: "",
      projectId: "",
      description: "",
      date: "",
      time: "",
      duration: 30,
      participants: []
    });
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === "projectId") {
      setTeamId(null);
      setTeamMembers([]);
      setForm(prev => ({
        ...prev,
        projectId: value,
        participants: []
      }));
    }
  }

  function toggleParticipant(id) {
    setForm(prev => {
      const exists = prev.participants.includes(id);

      return {
        ...prev,
        participants: exists
          ? prev.participants.filter(p => p !== id)
          : [...prev.participants, id]
      };
    });
  }

  async function handleSchedule(e) {
    e.preventDefault();

    const rawStart = new Date(`${form.date}T${form.time}:00`);
    const start = roundToFive(rawStart);
    const end = new Date(start.getTime() + form.duration * 60000);

    if (start < new Date()) {
      alert("Meeting cannot be scheduled in the past.");
      return;
    }

    try {
      await api.post("/meetings", {
        title: form.title,
        projectId: form.projectId,
        description: form.description,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        participantIds: form.participants
      });

      closeSchedule();
      loadMeetings();
    } catch (err) {
      alert(err.response?.data || "Failed to create meeting");
    }
  }

  async function deleteMeeting(id) {
    if (!window.confirm("Delete this meeting?")) return;

    await api.delete(`/meetings/${id}`);

    loadMeetings();
  }

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const minTime =
    form.date === todayStr ? now.toTimeString().slice(0, 5) : "00:00";

  /* ------------------- UI ------------------- */

  return (
    <>
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Meetings</h1>
            <p className={styles.subtitle}>
              Schedule and manage team meetings
            </p>
          </div>

     {user?.role === "ScrumMaster" && (
  <button className={styles.primaryBtn} onClick={openSchedule}>
    + Schedule Meeting
  </button>
)}
        </header>

        <h3 className={styles.sectionTitle}>Upcoming</h3>

        {loading && <p className={styles.info}>Loading meetings...</p>}

        {!loading && meetings.length === 0 && (
          <p className={styles.info}>No upcoming meetings scheduled.</p>
        )}

        <section className={styles.grid}>
          {meetings.map(m => {
            const start = new Date(m.startTime);
            const end = new Date(m.endTime);
            const duration = Math.round((end - start) / 60000);

            return (
              <article key={m.id} className={styles.card}>
                <div className={styles.cardHeader}>
  <h2 className={styles.cardTitle}>{m.title}</h2>

  <div className={styles.cardActions}>
    {isToday(m.startTime) && (
      <span className={styles.todayBadge}>Today</span>
    )}

    {user?.role === "ScrumMaster" && (
      <button
        className={styles.deleteBtn}
        onClick={() => deleteMeeting(m.id)}
        title="Delete meeting"
      >
        <FaTrash />
      </button>
    )}
  </div>
</div>
{m.description && (
  <>
    <p
      className={`${styles.cardDescription} ${
        expandedDescriptions[m.id] ? styles.expanded : ""
      }`}
    >
      {m.description}
    </p>

    {m.description.length > 80 && (
      <button
        className={styles.readMore}
        onClick={() => toggleDescription(m.id)}
      >
        {expandedDescriptions[m.id] ? "Show less" : "Read more"}
      </button>
    )}
  </>
)}

                <div className={styles.cardMeta}>
                  <span className={styles.metaItem}>
                    <FaCalendarAlt />
                    {start.toLocaleDateString()}
                  </span>

                  <span className={styles.metaItem}>
                    <FaClock />
                    {start.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}{" "}
                    · {duration} min
                  </span>
                </div>

                {getCountdown(m.startTime) && (
                  <span className={styles.countdown}>
                    {getCountdown(m.startTime)}
                  </span>
                )}

                {isLive(start, end) && m.googleMeetLink && (
                  <a
                    href={m.googleMeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.liveJoin}
                  >
                    Start Meeting Now
                  </a>
                )}

                {!isLive(start, end) &&
                  m.googleMeetLink?.includes("meet.google.com") && (
                    <a
                      href={m.googleMeetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.meetLink}
                    >
                      <FaVideo /> Join Google Meet <FaExternalLinkAlt />
                    </a>
                  )}
         
              </article>
            );
          })}
        </section>
      </div>

      {/* MODAL */}

      {showForm &&
        ReactDOM.createPortal(
          <div className={styles.overlay} onClick={closeSchedule}>
            <div
              className={styles.modal}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>Schedule Meeting</h2>
                <button className={styles.closeBtn} onClick={closeSchedule}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleSchedule} className={styles.form}>
                <label className={styles.label}>Title</label>
                <input
                  className={styles.input}
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                />

                <label className={styles.label}>Project</label>
                <select
                  className={styles.input}
                  name="projectId"
                  value={form.projectId}
                  onChange={handleChange}
                >
                  <option value="">Select project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <label className={styles.label}>Team</label>
                <TeamPicker
                  projectId={form.projectId}
                  value={teamId}
                  onChange={setTeamId}
                />

                <label className={styles.label}>Description</label>
                <textarea
                  className={`${styles.input} ${styles.textarea}`}
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                />

                <div className={styles.row}>
                  <div className={styles.column}>
                    <label>Date</label>
                    <input
                      type="date"
                      min={todayStr}
                      className={styles.input}
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                    />
                  </div>

                  <div className={styles.column}>
                    <label>Time</label>
                    <input
                      type="time"
                      min={minTime}
                      className={styles.input}
                      name="time"
                      value={form.time}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <label className={styles.label}>Duration</label>
                <select
                  className={styles.input}
                  name="duration"
                  value={form.duration}
                  onChange={handleChange}
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
{teamMembers.length > 0 && (
  <>
    <label className={styles.label}>Participants</label>

    <div className={styles.participantList}>
      {teamMembers.map(member => {
        const selected = form.participants.includes(member.id);

        return (
          <div
            key={member.id}
            className={`${styles.participantChip} ${
              selected ? styles.participantSelected : ""
            }`}
            onClick={() => toggleParticipant(member.id)}
          >
            {member.name || member.email}
          </div>
        );
      })}
    </div>
  </>
)}

                <div className={styles.actions}>
                  <button type="submit" className={styles.primaryBtn}>
                    Schedule Meeting
                  </button>

                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={closeSchedule}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}