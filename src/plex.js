import { config } from "./config.js";

export async function scanPlex(mediaType) {
  const sectionId = mediaType === "movie" ? config.plex.movieSectionId : config.plex.tvSectionId;

  if (!config.plex.token || !sectionId) {
    throw new Error("Missing Plex token or library section id in .env.");
  }

  const url = `${config.plex.url.replace(/\/$/, "")}/library/sections/${encodeURIComponent(sectionId)}/refresh`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "X-Plex-Token": config.plex.token }
  });

  if (!response.ok) {
    throw new Error(`Plex scan failed: ${response.status}`);
  }

  return { ok: true };
}
