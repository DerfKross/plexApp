import dotenv from "dotenv";

dotenv.config();

const splitCsv = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const config = {
  port: Number(process.env.PORT || 3747),
  host: process.env.HOST || "0.0.0.0",
  qbittorrent: {
    url: process.env.QBITTORRENT_URL || "http://127.0.0.1:8080",
    username: process.env.QBITTORRENT_USERNAME || "",
    password: process.env.QBITTORRENT_PASSWORD || ""
  },
  paths: {
    movie: process.env.MOVIE_SAVE_PATH || "",
    tv: process.env.TV_SAVE_PATH || ""
  },
  plex: {
    url: process.env.PLEX_URL || "http://127.0.0.1:32400",
    token: process.env.PLEX_TOKEN || "",
    movieSectionId: process.env.PLEX_MOVIE_SECTION_ID || "",
    tvSectionId: process.env.PLEX_TV_SECTION_ID || ""
  },
  sources: {
    torznab: splitCsv(process.env.TORZNAB_SOURCES),
    rss: splitCsv(process.env.TORRENT_RSS_SOURCES),
    allowDirectTorrentUrls: process.env.ALLOW_DIRECT_TORRENT_URLS !== "false"
  }
};
