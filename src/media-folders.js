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

function folderAccessError(error, configuredPath) {
  if (error.code === "ENOENT") {
    return new Error(`TV_SAVE_PATH does not exist or the drive is unavailable: ${configuredPath}`);
  }
  if (error.code === "EACCES" || error.code === "EPERM") {
    return new Error(`PlexApp does not have permission to access TV_SAVE_PATH: ${configuredPath}`);
  }
  return new Error(`Could not access TV_SAVE_PATH (${configuredPath}): ${error.message}`);
}

function validateFolderName(folderName, message) {
  const cleaned = String(folderName || "").trim();
  if (!cleaned) {
    throw new Error(message);
  }
  if (cleaned === "." || cleaned === ".." || invalidFolderChars.test(cleaned)) {
    throw new Error("Folder name contains invalid Windows filename characters.");
  }
  return cleaned;
}

function validateShowFolderName(folderName) {
  return validateFolderName(folderName, "Choose an existing TV folder or enter a new show folder name.");
}

function validateSeasonFolderName(folderName) {
  return validateFolderName(folderName, "Choose an existing season folder or enter a new season folder name.");
}

function resolveInsideTvRoot(folderName, seasonFolderName = "") {
  const root = requireTvRoot();
  const cleaned = validateShowFolderName(folderName);
  const cleanedSeason = seasonFolderName ? validateSeasonFolderName(seasonFolderName) : "";
  const target = cleanedSeason ? path.resolve(root, cleaned, cleanedSeason) : path.resolve(root, cleaned);
  const relative = path.relative(root, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("TV show folder must stay inside TV_SAVE_PATH.");
  }

  return { root, folderName: cleaned, seasonFolderName: cleanedSeason, target };
}

export async function listTvFolders() {
  const root = requireTvRoot();
  let entries;
  try {
    await fs.mkdir(root, { recursive: true });
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch (error) {
    throw folderAccessError(error, config.paths.tv);
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export async function ensureTvFolder(folderName) {
  const { folderName: cleaned, target } = resolveInsideTvRoot(folderName);
  try {
    await fs.mkdir(target, { recursive: true });
  } catch (error) {
    throw folderAccessError(error, target);
  }
  return { folderName: cleaned, savePath: target };
}

export async function listSeasonFolders(showFolderName) {
  const { target } = resolveInsideTvRoot(showFolderName);
  let entries;
  try {
    await fs.mkdir(target, { recursive: true });
    entries = await fs.readdir(target, { withFileTypes: true });
  } catch (error) {
    throw folderAccessError(error, target);
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export async function ensureTvSeasonFolder(showFolderName, seasonFolderName = "") {
  const { folderName, seasonFolderName: seasonName, target } = resolveInsideTvRoot(showFolderName, seasonFolderName);
  try {
    await fs.mkdir(target, { recursive: true });
  } catch (error) {
    throw folderAccessError(error, target);
  }
  return { folderName, seasonFolderName: seasonName, savePath: target };
}
