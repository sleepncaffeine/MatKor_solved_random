import client from "./client";

export const register = (email, password, signup_key) =>
  client.post("/auth/register", { email, password, signup_key });

export const login = (email, password) =>
  client.post("/auth/login", { email, password });

export const refresh = (refresh_token) =>
  client.post("/auth/refresh", { refresh_token });
