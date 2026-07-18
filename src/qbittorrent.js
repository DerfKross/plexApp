import { config } from "./config.js";

let cookie = "";
let cookieTime = 0;

const apiUrl = (path) => `${config.qbittorrent.url.replace(/\/$/, "")}${path}`;

async function login() {
  if (cookie && Date.now() - cookieTime < 20 * 60 * 1000) {
    return cookie;
  }

  const body = new URLSearchParams({
    username: config.qbittorrent.username,
    password: config.qbittorrent.password
  });

  const response = await fetch(apiUrl("/api/v2/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const text = await response.text();
  if (!response.ok || text.trim() !== "Ok.") {
    throw new Error("Could not sign in to qBittorrent Web UI. Check URL, username, and password.");
  }

  cookie = (response.headers.get("set-cookie") || "").split(";")[0];
  cookieTime = Date.now();
  return cookie;
}

export async function addTorrent({ torrentUrl, magnetUrl, mediaType, savePath }) {
  const authCookie = await login();
  const savepath = savePath || config.paths[mediaType];

  if (!savepath) {
    throw new Error(`Missing ${mediaType === "movie" ? "MOVIE_SAVE_PATH" : "TV_SAVE_PATH"} in .env.`);
  }

  const form = new FormData();
  form.append("savepath", savepath);
  form.append("category", mediaType);
  form.append("paused", "false");

  if (magnetUrl) {
    form.append("urls", magnetUrl);
  } else if (torrentUrl) {
    const torrentResponse = await fetch(torrentUrl);
    if (!torrentResponse.ok) {
      throw new Error(`Could not download torrent file: ${torrentResponse.status}`);
    }
    const blob = new Blob([await torrentResponse.arrayBuffer()], { type: "application/x-bittorrent" });
    form.append("torrents", blob, "download.torrent");
  } else {
    throw new Error("Select a torrent result or paste a magnet/torrent URL.");
  }

  const response = await fetch(apiUrl("/api/v2/torrents/add"), {
    method: "POST",
    headers: { Cookie: authCookie },
    body: form
  });

  if (!response.ok) {
    throw new Error(`qBittorrent rejected the torrent: ${response.status}`);
  }

  return { ok: true };
}

export async function listTorrents() {
  const authCookie = await login();
  const response = await fetch(apiUrl("/api/v2/torrents/info"), {
    headers: { Cookie: authCookie }
  });

  if (!response.ok) {
    throw new Error(`Could not read qBittorrent progress: ${response.status}`);
  }

  const torrents = await response.json();
  return torrents.map((torrent) => ({
    hash: torrent.hash,
    name: torrent.name,
    category: torrent.category,
    progress: torrent.progress,
    state: torrent.state,
    size: torrent.size,
    downloaded: torrent.downloaded,
    dlspeed: torrent.dlspeed,
    eta: torrent.eta,
    addedOn: torrent.added_on || 0,
    savePath: torrent.save_path
  }));
}
