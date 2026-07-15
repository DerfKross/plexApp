import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { addTorrent, listTorrents } from "./qbittorrent.js";
import { scanPlex } from "./plex.js";
import { searchTorrents } from "./search.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

function asyncRoute(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

function requireMediaType(value) {
  if (!["movie", "tv"].includes(value)) {
    throw new Error("mediaType must be movie or tv.");
  }
  return value;
}

app.get("/api/config", (request, response) => {
  response.json({
    directTorrentUrlsAllowed: config.sources.allowDirectTorrentUrls,
    torznabSources: config.sources.torznab.map((source) => new URL(source).hostname),
    hasPlexToken: Boolean(config.plex.token)
  });
});

app.get(
  "/api/search",
  asyncRoute(async (request, response) => {
    const query = String(request.query.q || "");
    const mediaType = requireMediaType(String(request.query.mediaType || "movie"));
    response.json(await searchTorrents({ query, mediaType }));
  })
);

app.post(
  "/api/torrents",
  asyncRoute(async (request, response) => {
    const mediaType = requireMediaType(request.body.mediaType);
    const torrentUrl = String(request.body.torrentUrl || "");
    const magnetUrl = String(request.body.magnetUrl || "");

    if (!config.sources.allowDirectTorrentUrls && !torrentUrl.startsWith("https://archive.org/")) {
      throw new Error("Direct torrent URLs are disabled on this server.");
    }

    response.json(await addTorrent({ torrentUrl, magnetUrl, mediaType }));
  })
);

app.get(
  "/api/torrents",
  asyncRoute(async (request, response) => {
    response.json({ torrents: await listTorrents() });
  })
);

app.post(
  "/api/plex/scan",
  asyncRoute(async (request, response) => {
    const mediaType = requireMediaType(request.body.mediaType);
    response.json(await scanPlex(mediaType));
  })
);

app.use((error, request, response, next) => {
  response.status(400).json({ error: error.message || "Request failed." });
});

app.listen(config.port, () => {
  console.log(`PlexApp is running at http://localhost:${config.port}`);
});
