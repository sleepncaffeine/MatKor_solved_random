import client from "./client";

export const getMe = () => client.get("/user/me");
export const registerHandle = (handle) =>
  client.put("/user/me/handle", { handle });
export const getMyStats = () => client.get("/user/me/stats");
