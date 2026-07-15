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
    mediaType: mediaType || "",
    seeders: null,
    size: null,
    url: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(identifier)}_archive.torrent`,
    magnet: "",
    detailsUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`
  };
}

async function searchInternetArchive(query, mediaType) {
  const params = new URLSearchParams({
    q: `${query} AND mediatype:movies`,
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

function queryMatches(title, query) {
  const normalizedTitle = title.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => normalizedTitle.includes(term));
}

function attrValue(attributes, name) {
  return toArray(attributes).find((attr) => attr?.["@_name"] === name)?.["@_value"];
}

function linkValue(value) {
  if (!value) return "";
  if (typeof value === "string") return compact(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = linkValue(item);
      if (resolved) return resolved;
    }
    return "";
  }
  return compact(value["@_href"] || value["@_url"] || value["#text"]);
}

function plainText(value) {
  return compact(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 600);
}

function firstImageFromHtml(value) {
  const match = compact(value).match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || "";
}

function imageUrlFromRssItem(item) {
  const imageCandidates = [
    item["media:thumbnail"]?.["@_url"],
    item["media:content"]?.["@_url"],
    item.image?.url,
    item.image?.["@_href"],
    firstImageFromHtml(item.description),
    firstImageFromHtml(item.summary),
    firstImageFromHtml(item.content),
    firstImageFromHtml(item["content:encoded"])
  ];

  return imageCandidates.map((value) => compact(value)).find(Boolean) || "";
}

function dateFromRssItem(item) {
  return compact(item.pubDate || item.published || item.updated || item["dc:date"]);
}

function normalizeRssItem(item, sourceUrl, mediaType, index, sourceIndex = -1) {
  const url = new URL(sourceUrl);
  const torrentUrl = torrentUrlFromRssItem(item);
  const magnetUrl = magnetUrlFromRssItem(item);
  const description = plainText(item.description || item.summary || item.content || item["content:encoded"]);

  return {
    id: `rss:${url.hostname}:${index}:${item.guid?.["#text"] || item.id || item.link || item.title}`,
    title: compact(item.title, "Untitled"),
    source: url.hostname,
    sourceIndex,
    mediaType: mediaType || "",
    seeders: Number(attrValue(item["torznab:attr"], "seeders") || 0),
    size: Number(item.size || item.enclosure?.["@_length"] || 0),
    url: torrentUrl || linkValue(item.link),
    magnet: magnetUrl,
    detailsUrl: linkValue(item.comments || item.guid?.["#text"] || item.id || item.link),
    imageUrl: imageUrlFromRssItem(item),
    description,
    publishedAt: dateFromRssItem(item)
  };
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
    mediaType: mediaType || "",
    seeders: Number(attrValue(item["torznab:attr"], "seeders") || 0),
    size: Number(item.size || 0),
    url: compact(item.link),
    magnet: compact(item.magneturl),
    detailsUrl: compact(item.comments || item.guid?.["#text"] || item.link)
  }));
}

function torrentUrlFromRssItem(item) {
  const enclosures = toArray(item.enclosure);
  const torrentEnclosure = enclosures.find((enclosure) => {
    const type = compact(enclosure?.["@_type"]).toLowerCase();
    const url = compact(enclosure?.["@_url"]);
    return url.endsWith(".torrent") || type.includes("bittorrent") || type.includes("x-bittorrent");
  });

  if (torrentEnclosure?.["@_url"]) {
    return compact(torrentEnclosure["@_url"]);
  }

  const links = [item.link, item.guid?.["#text"], item.comments].map((value) => linkValue(value));
  return links.find((link) => link.endsWith(".torrent")) || "";
}

function magnetUrlFromRssItem(item) {
  const links = [item.link, item.guid?.["#text"], item.comments, item.magneturl].map((value) => linkValue(value));
  return links.find((link) => link.startsWith("magnet:")) || "";
}

async function searchRssSource(sourceUrl, query, mediaType) {
  const items = await readRssItems(sourceUrl);

  return items
    .filter((item) => queryMatches(compact(item.title), query))
    .slice(0, 25)
    .map((item, index) => normalizeRssItem(item, sourceUrl, mediaType, index))
    .filter((item) => item.url || item.magnet);
}

async function readRssItems(sourceUrl) {
  const url = new URL(sourceUrl);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`RSS source failed: ${url.hostname}`);
  }

  const xml = parser.parse(await response.text());
  const channel = xml.rss?.channel || xml.feed || {};
  return toArray(channel.item || channel.entry);
}

export async function listRssFeedItems(mediaType, sourceIndex = null) {
  const indexedSources = config.sources.rss.map((source, index) => ({ source, index }));
  const selectedSources = Number.isInteger(sourceIndex)
    ? indexedSources.filter((source) => source.index === sourceIndex)
    : indexedSources;

  const settled = await Promise.allSettled(
    selectedSources.map(async ({ source, index: rssSourceIndex }) => {
      const items = await readRssItems(source);
      return items
        .slice(0, config.sources.rssItemsPerFeed)
        .map((item, index) => normalizeRssItem(item, source, mediaType, index, rssSourceIndex))
        .filter((item) => item.url || item.magnet || item.detailsUrl);
    })
  );

  const items = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const errors = settled
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason.message);

  return { items, errors, sourceIndex };
}

export async function searchTorrents({ query, mediaType }) {
  const cleanedQuery = compact(query);
  if (cleanedQuery.length < 2) {
    throw new Error("Search needs at least 2 characters.");
  }

  const searches = [
    ...(config.sources.internetArchive ? [searchInternetArchive(cleanedQuery, mediaType)] : []),
    ...config.sources.torznab.map((source) => searchTorznab(source, cleanedQuery, mediaType)),
    ...config.sources.rss.map((source) => searchRssSource(source, cleanedQuery, mediaType))
  ];

  const settled = await Promise.allSettled(searches);
  const results = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const errors = settled
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason.message);

  return { results, errors };
}
