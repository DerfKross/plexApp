import fs from "node:fs/promises";
import path from "node:path";

const dataDir = path.resolve("data");
const historyPath = path.join(dataDir, "download-history.json");
const completedRetentionMs = 24 * 60 * 60 * 1000;

async function readHistory() {
  try {
    const content = await fs.readFile(historyPath, "utf8");
    const parsed = JSON.parse(content);
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : []
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { completed: [] };
    }
    throw error;
  }
}

async function writeHistory(history) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(historyPath, `${JSON.stringify(history, null, 2)}\n`);
}

export async function rememberCompletedTorrents(torrents) {
  const completedNow = torrents.filter((torrent) => Number(torrent.progress || 0) >= 1);
  if (!completedNow.length) {
    return;
  }

  const history = pruneHistory(await readHistory());
  const byHash = new Map(history.completed.map((torrent) => [torrent.hash, torrent]));

  for (const torrent of completedNow) {
    byHash.set(torrent.hash, {
      hash: torrent.hash,
      name: torrent.name,
      category: torrent.category,
      progress: 1,
      state: "done",
      size: torrent.size,
      downloaded: torrent.downloaded,
      dlspeed: 0,
      eta: 0,
      savePath: torrent.savePath,
      completedAt: byHash.get(torrent.hash)?.completedAt || new Date().toISOString(),
      remembered: true
    });
  }

  await writeHistory({ completed: Array.from(byHash.values()) });
}

export async function completedTorrentsMissingFrom(activeTorrents) {
  const history = pruneHistory(await readHistory());
  await writeHistory(history);
  const activeHashes = new Set(activeTorrents.map((torrent) => torrent.hash));
  return history.completed.filter((torrent) => !activeHashes.has(torrent.hash));
}

export async function clearCompletedHistory() {
  await writeHistory({ completed: [] });
  return { ok: true };
}

function pruneHistory(history) {
  const cutoff = Date.now() - completedRetentionMs;
  return {
    completed: history.completed.filter((torrent) => {
      const completedAt = Date.parse(torrent.completedAt || "");
      return Number.isFinite(completedAt) && completedAt >= cutoff;
    })
  };
}
