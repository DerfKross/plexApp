import { XMLParser } from "fast-xml-parser";
import { config } from "./config.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

const compact = (value, fallback = "") => String(value || fallback).trim();

function normalizeInternetArchiveItem(item, mediaType) {
  const identifier = item.identifier;
  const title = compact(item.title, identifier);
  return {
    id: `ia:${identifier}`,
    title,
    source: "Internet Archive",
    mediaType,
    seeders: null,
    size: null,
    url: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(identifier)}_archive.torrent`,
    magnet: "",
    detailsUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`
  };
}

async function searchInternetArchive(query, mediaType) {
  const mediaFilter = mediaType === "tv" ? "mediatype:movies" : "mediatype:movies";
  const params = new URLSearchParams({
    q: `${query} AND ${mediaFilter}`,
    fl: "identifier,title",
    rows: "12",
    page: "1",
    output: "json"
  });

  const response = await fetch(`https://archive.org/advancedsearch.php?${params}`);
  if (!response.ok) {
    throw new Error("Internet Archive search failed.");
  }

  const data = await response.json();
  return (data.response?.docs || []).map((item) => normalizeInternetArchiveItem(item, mediaType));
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function searchTorznab(sourceUrl, query, mediaType) {
  const url = new URL(sourceUrl);
  url.searchParams.set("t", "search");
  url.searchParams.set("q", query);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Torznab source failed: ${url.hostname}`);
  }

  const xml = parser.parse(await response.text());
  const items = toArray(xml.rss?.channel?.item);

  return items.slice(0, 25).map((item, index) => ({
    id: `torznab:${url.hostname}:${index}:${item.guid?.["#text"] || item.link || item.title}`,
    title: compact(item.title, "Untitled"),
    source: url.hostname,
    mediaType,
    seeders: Number(item["torznab:attr"]?.find?.((attr) => attr["@_name"] === "seeders")?.["@_value"] || 0),
    size: Number(item.size || 0),
    url: compact(item.link),
    magnet: compact(item.magneturl),
    detailsUrl: compact(item.comments || item.guid?.["#text"] || item.link)
  }));
}

export async function searchTorrents({ query, mediaType }) {
  const cleanedQuery = compact(query);
  if (cleanedQuery.length < 2) {
    throw new Error("Search needs at least 2 characters.");
  }

  const searches = [
    searchInternetArchive(cleanedQuery, mediaType),
    ...config.sources.torznab.map((source) => searchTorznab(source, cleanedQuery, mediaType))
  ];

  const settled = await Promise.allSettled(searches);
  const results = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const errors = settled
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason.message);

  return { results, errors };
}
