import client from "./client";

export const recommend = (tags, tag_logic, mode, count = 10) =>
  client.post("/recommend", { tags, tag_logic, mode, count });
