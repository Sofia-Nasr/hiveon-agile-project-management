import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || "/api",
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


function describeError(err) {
  if (err?.response) {
    const { status, statusText, data, config } = err.response;
    let msg = `[${status}] ${config?.method?.toUpperCase?.() || ""} ${config?.url}`;
    const detail = typeof data === "string" ? data
                 : data?.detail || data?.title || data?.message || "";
    if (detail) msg += ` → ${detail}`;
    return msg;
  }
  return err?.message || "Network/unknown error";
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // stash full error for devtools
    window.__last_api_error__ = err;
    // attach a human message the caller can show
    err.userMessage = describeError(err);
    return Promise.reject(err);
  }
);

export default api;
