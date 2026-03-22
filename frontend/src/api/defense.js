import client from "./client";

export const getActiveDefenses = () => client.get("/defense/active");
export const joinDefense = (id) => client.post(`/defense/${id}/join`);
export const getMyAssignments = () => client.get("/defense/my");
export const refreshDefense = (id) => client.post(`/defense/${id}/refresh`);
export const syncDefense = (id) => client.post(`/defense/${id}/sync`);
export const updateDefenseMode = (mode) =>
  client.put("/defense/settings/mode", { defense_mode: mode });

// admin
export const adminListDefenses = () => client.get("/admin/defense");
export const adminCreateDefense = (data) => client.post("/admin/defense", data);
export const adminToggleDefense = (id) =>
  client.patch(`/admin/defense/${id}/toggle`);
export const adminDeleteDefense = (id) => client.delete(`/admin/defense/${id}`);
export const adminGetParticipants = (id) =>
  client.get(`/admin/defense/${id}/participants`);

export const adminEndDefenseEarly = (id) =>
  client.patch(`/admin/defense/${id}/end`);
