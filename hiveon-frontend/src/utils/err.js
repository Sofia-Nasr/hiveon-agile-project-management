// src/utils/err.js
export function describeAxiosError(err) {
  const r = err?.response;
  if (!r) return err?.message || String(err);

  const parts = [`[${r.status}] ${r.config?.method?.toUpperCase()} ${r.config?.url}`];
  const data = r.data;

  if (typeof data === "string") parts.push(data);
  else if (data?.detail) parts.push(data.detail);
  else if (data?.title) parts.push(data.title);
  else if (data?.errors) parts.push(JSON.stringify(data.errors));
  else parts.push(JSON.stringify(data));

  return parts.join(" — ");
}
