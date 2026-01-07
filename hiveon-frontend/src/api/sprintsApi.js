import api from "./apiClient";

// GET sprints for a project
export async function getSprints(projectId) {
  const res = await api.get("/sprints", {
    params: { projectId },
  });
  return res.data;
}

// CREATE sprint
export async function createSprint(payload) {
  const res = await api.post("/sprints", payload);
  return res.data;
}

// START sprint
export async function startSprint(sprintId) {
  await api.patch(`/sprints/${sprintId}/start`);
}

// COMPLETE sprint
export async function completeSprint(sprintId) {
  await api.patch(`/sprints/${sprintId}/complete`);
}

// EXTEND sprint
export async function extendSprint(sprintId, endDate) {
  await api.patch(`/sprints/${sprintId}/extend`, {
    endDate,
  });
}

// GET sprint stories
export async function getSprintStories(sprintId) {
  const res = await api.get(`/sprints/${sprintId}/stories`);
  return res.data;
}
export async function getSprintRisk(sprintId) {
  const res = await api.get(`/sprints/${sprintId}/risk`);
  return res.data;
}
