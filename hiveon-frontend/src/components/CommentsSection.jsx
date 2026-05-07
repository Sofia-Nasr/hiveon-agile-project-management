import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./CommentsSection.module.css";
import api from "../api/apiClient";
import { useAuth } from "../context/AuthContext";

export default function CommentsSection({
  entityId,
  entityType, 
  assigneeName,
  assigneeEmail
}) {
  const { user } = useAuth();

  const [comments, setComments] = useState([]);
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const listRef = useRef(null);

  // ✅ normalize entityType so UserStory etc are consistent
  const normalizedEntityType = useMemo(() => {
    if (!entityType) return "";
    if (!entityType) return "";

if (entityType === "UserStory") return "UserStory";
if (entityType === "Epic") return "Epic";
return "TaskItem";
  }, [entityType]);

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, normalizedEntityType]);

  async function fetchComments() {
    if (!entityId || !normalizedEntityType) return;

    try {
      const res = await api.get(`/comments`, {
        params: { entityId, entityType: normalizedEntityType },
      });
      setComments(res.data || []);
      scrollToBottom();
    } catch (err) {
      console.error("Failed to load comments", err?.response?.data || err);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;

    setIsSending(true);

    try {
      await api.post(`/comments`, {
        entityId,
        entityType: normalizedEntityType,
        content: text,
      });

      setInput("");
      setShowSuggestions(false);
      await fetchComments();
    } catch (err) {
      // ✅ THIS will show you the real backend reason
      console.error("Failed to send comment", err?.response?.data || err);
      alert(
        err?.response?.data?.message ||
          "Failed to send comment. Check console for details."
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/comments/${id}`);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Delete failed", err?.response?.data || err);
    }
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (!listRef.current) return;
      listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }

  // ✅ "Sarah Chen" -> "sarahchen" (like your screenshot)
  function toUsername(name) {
    if (!name) return "";
    return String(name).toLowerCase().replace(/\s+/g, "");
  }

  function handleChange(e) {
    const value = e.target.value;
    setInput(value);

    const atMatch = value.match(/(^|\s)@[\w]*$/);
    setShowSuggestions(Boolean(atMatch));
  }
 function insertMention(displayName, email) {
  if (!displayName || !email) return;

  const token = `@${displayName}|${email} `;

  setInput((prev) => {
    const atMatch = prev.match(/(^|\s)@[\w]*$/);

    if (atMatch) {
      return prev.replace(/(^|\s)@[\w]*$/, (m) => {
        const space = m.startsWith(" ") ? " " : "";
        return space + token;
      });
    }

    return prev + " " + token;
  });

  setShowSuggestions(false);
}
function renderContent(text) {
  const regex =
    /@[^|\r\n]+\|[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = regex.lastIndex;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    const token = match[0];
    const display = token.split("|")[0];

    parts.push(
      <span key={start} className={styles.mention}>
        {display}
      </span>
    );

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
  function initials(name) {
    if (!name) return "?";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  // Enter to send, Shift+Enter for newline (feels like Jira)
  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>COMMENTS</div>

      <div className={styles.list} ref={listRef}>
        {comments.length === 0 && (
          <div className={styles.empty}>No comments yet. Be the first!</div>
        )}

        {comments.map((c) => (
          <div key={c.id} className={styles.comment}>
            <div className={styles.avatar}>{initials(c.authorName)}</div>

            <div className={styles.contentWrap}>
              <div className={styles.topRow}>
                <span className={styles.author}>{c.authorName}</span>
                <span className={styles.time}>
                  {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                </span>

                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(c.id)}
                  title="Delete"
                >
                  ✕
                </button>
              </div>

              <div className={styles.text}>{renderContent(c.content)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.inputBar}>
        <div className={styles.inputWrapper}>
          <textarea
            placeholder="Add a comment... Use @ to mention someone"
            value={input}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            className={styles.input}
            rows={2}
          />

{showSuggestions && assigneeName && assigneeEmail && (
  <div className={styles.suggestions}>
    <div
      className={styles.suggestionItem}
      onMouseDown={(e) => {
        e.preventDefault(); 
        insertMention(assigneeName, assigneeEmail);
      }}
    >
      <strong>{assigneeName}</strong>
      <span className={styles.suggestionMeta}>
        {assigneeEmail}
      </span>
    </div>
  </div>
)}
          <button
            onClick={handleSend}
            className={styles.sendBtn}
            disabled={isSending || !input.trim()}
            title="Send"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
