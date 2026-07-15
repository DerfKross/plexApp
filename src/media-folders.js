import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";

const invalidFolderChars = /[<>:"/\\|?*\x00-\x1F]/;

function requireTvRoot() {
  if (!config.paths.tv) {
    throw new Error("Missing TV_SAVE_PATH in .env.");
  }
  return path.resolve(config.paths.tv);
}

function validateShowFolderName(folderName) {
  const cleaned = String(folderName || "").trim();
  if (!cleaned) {
    throw new Error("Choose an existing TV folder or enter a new show folder name.");
  }
  if (cleaned === "." || cleaned === ".." || invalidFolderChars.test(cleaned)) {
    throw new Error("TV show folder name contains invalid Windows filename characters.");
  }
  return cleaned;
}

function resolveInsideTvRoot(folderName) {
  const root = requireTvRoot();
  const cleaned = validateShowFolderName(folderName);
  const target = path.resolve(root, cleaned);
  const relative = path.relative(root, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("TV show folder must stay inside TV_SAVE_PATH.");
  }

  return { root, folderName: cleaned, target };
}

export async function listTvFolders() {
  const root = requireTvRoot();
  await fs.mkdir(root, { recursive: true });
  const entries = await fs.readdir(root, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export async function ensureTvFolder(folderName) {
  const { folderName: cleaned, target } = resolveInsideTvRoot(folderName);
  await fs.mkdir(target, { recursive: true });
  return { folderName: cleaned, savePath: target };
}
