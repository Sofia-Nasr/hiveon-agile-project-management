// src/utils/httpError.js
export function formatAxiosError(err) {
  try {
    const status = err?.response?.status ?? "?";
    const method = err?.config?.method?.toUpperCase?.() || "";
    const url = err?.config?.url || "";

    // Prefer a readable message from server payload
    const d = err?.response?.data;
    let msg =
      typeof d === "string" ? d :
      d?.detail ??
      d?.title ??
      d?.message ??
      d?.error ??
      (d ? JSON.stringify(d, null, 2) : (err?.message || "Unknown error"));

    return `[${status}] ${method} ${url} — ${msg}`;
  } catch {
    // Absolute fallback
    return String(err?.message || err || "Unknown error");
  }
}
