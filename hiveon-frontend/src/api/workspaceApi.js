import api from "./apiClient";

// GET workspaces user belongs to
export async function getWorkspaces() {
  const res = await api.get("/auth/workspaces"); // ✅ NO /api
  return res.data;
}

export async function createWorkspace(name) {
  const res = await api.post("/workspace", { name });
  return res.data;
}
export async function switchWorkspace(workspaceId) {
  const res = await api.post("/workspace/switch", { workspaceId });
  return res.data; // IMPORTANT
}
// SEND INVITE
export async function sendWorkspaceInvite({ email, role }) {
  const res = await api.post("/workspace/invites/send", {
    email,
    role,
  });
  return res.data;
}

// ACCEPT INVITE
export async function acceptWorkspaceInvite(token) {
  const res = await api.post("/workspace/invites/accept", {
    token,
  });
  return res.data;
}
