import api from "./apiClient";

export async function getProjectRisks(projectId) {
  const res = await api.get(`/risks?projectId=${projectId}`);
  return res.data;
}

export async function createRisk(payload) {
  const res = await api.post("/risks", payload);
  return res.data;
}

export async function updateRisk(id, payload) {
  const res = await api.patch(`/risks/${id}`, payload);
  return res.data;
}

export async function updateRiskStatus(id, status) {
  const res = await api.patch(`/risks/${id}/status`, { status });
  return res.data;
}
