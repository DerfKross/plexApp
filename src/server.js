import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { completedTorrentsMissingFrom, rememberCompletedTorrents } from "./download-history.js";
import { ensureTvSeasonFolder, listSeasonFolders, listTvFolders } from "./media-folders.js";
import { addTorrent, listTorrents } from "./qbittorrent.js";
import { scanPlex } from "./plex.js";
import { listRssFeedItems, searchTorrents } from "./search.js";

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
    internetArchiveEnabled: config.sources.internetArchive,
    torznabSources: config.sources.torznab.map((source) => new URL(source).hostname),
    rssSources: config.sources.rss.map((source, index) => ({
      index,
      label: config.sources.rssLabels[index] || new URL(source).hostname
    })),
    rssSearchSources: config.sources.rssSearch.map((source, index) => {
      const sampleUrl = source
        .replaceAll("{query}", "search")
        .replaceAll("{keyword}", "search")
        .replaceAll("{rawQuery}", "search")
        .replaceAll("{rawKeyword}", "search");

      return {
        index,
        label: config.sources.rssSearchLabels[index] || new URL(sampleUrl).hostname
      };
    }),
    rssItemsPerFeed: config.sources.rssItemsPerFeed,
    hasPlexToken: Boolean(config.plex.token)
  });
});

app.get(
  "/api/search",
  asyncRoute(async (request, response) => {
    const query = String(request.query.q || "");
    const mediaType = request.query.mediaType ? requireMediaType(String(request.query.mediaType)) : "";
    response.json(await searchTorrents({ query, mediaType }));
  })
);

app.get(
  "/api/rss",
  asyncRoute(async (request, response) => {
    const mediaType = request.query.mediaType ? requireMediaType(String(request.query.mediaType)) : "";
    const source = request.query.source;
    const sourceIndex = source === undefined ? null : Number(source);
    if (source !== undefined && (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= config.sources.rss.length)) {
      throw new Error("RSS source index is invalid.");
    }
    response.json(await listRssFeedItems(mediaType, sourceIndex));
  })
);

app.post(
  "/api/torrents",
  asyncRoute(async (request, response) => {
    const mediaType = requireMediaType(request.body.mediaType);
    const torrentUrl = String(request.body.torrentUrl || "");
    const magnetUrl = String(request.body.magnetUrl || "");
    const tvFolderName = String(request.body.tvFolderName || "");
    const tvSeasonFolderName = String(request.body.tvSeasonFolderName || "");
    const tvFolder = mediaType === "tv" ? await ensureTvSeasonFolder(tvFolderName, tvSeasonFolderName) : null;

    if (!config.sources.allowDirectTorrentUrls && !torrentUrl.startsWith("https://archive.org/")) {
      throw new Error("Direct torrent URLs are disabled on this server.");
    }

    response.json(await addTorrent({ torrentUrl, magnetUrl, mediaType, savePath: tvFolder?.savePath }));
  })
);

app.get(
  "/api/tv-folders",
  asyncRoute(async (request, response) => {
    response.json({
      root: config.paths.tv,
      folders: await listTvFolders()
    });
  })
);

app.get(
  "/api/tv-folders/:show/seasons",
  asyncRoute(async (request, response) => {
    response.json({
      show: request.params.show,
      folders: await listSeasonFolders(request.params.show)
    });
  })
);

app.get(
  "/api/torrents",
  asyncRoute(async (request, response) => {
    const activeTorrents = await listTorrents();
    await rememberCompletedTorrents(activeTorrents);
    const completedTorrents = await completedTorrentsMissingFrom(activeTorrents);
    response.json({ torrents: [...activeTorrents, ...completedTorrents] });
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

app.listen(config.port, config.host, () => {
  console.log(`PlexApp is running at http://${config.host}:${config.port}`);
  console.log(`Local URL: http://localhost:${config.port}`);
});
