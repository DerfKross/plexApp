const state = {
  results: [],
  rssItems: [],
  pendingAdd: null
};

const $ = (selector) => document.querySelector(selector);

const elements = {
  form: $("#searchForm"),
  directForm: $("#directForm"),
  query: $("#queryInput"),
  direct: $("#directInput"),
  results: $("#resultsList"),
  downloads: $("#downloadsList"),
  toast: $("#toast"),
  sourceStatus: $("#sourceStatus"),
  refresh: $("#refreshButton"),
  browseRss: $("#browseRssButton"),
  mediaDialog: $("#mediaDialog"),
  mediaDialogItem: $("#mediaDialogItem"),
  cancelMedia: $("#cancelMediaButton"),
  scanMovie: $("#scanMovieButton"),
  scanTv: $("#scanTvButton")
};

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.classList.toggle("error", isError);
  elements.toast.classList.add("visible");
  window.setTimeout(() => elements.toast.classList.remove("visible"), 3600);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

function formatBytes(value) {
  if (!value) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = Number(value);
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

function sourceMeta(item) {
  return [
    item.source,
    item.publishedAt,
    item.size ? formatBytes(item.size) : "",
    item.seeders ? `${item.seeders} seeders` : ""
  ]
    .filter(Boolean)
    .map((value) => escapeHtml(value))
    .join(" - ");
}

function resultActions(item, index) {
  return `
    <div class="item-actions">
      ${item.detailsUrl ? `<a href="${escapeAttribute(item.detailsUrl)}" target="_blank" rel="noreferrer" title="Open details">Details</a>` : ""}
      <button type="button" class="primary" data-add="${index}">Add</button>
    </div>
  `;
}

function renderResults() {
  if (!state.results.length) {
    elements.results.className = "list empty";
    elements.results.textContent = "No results found.";
    return;
  }

  elements.results.className = "list";
  elements.results.innerHTML = state.results
    .map(
      (result, index) => `
        <article class="item">
          <div class="item-head">
            <div>
              <div class="title">${escapeHtml(result.title)}</div>
              <div class="meta">${sourceMeta(result)}</div>
              ${result.imageUrl ? `<img class="thumb" src="${escapeAttribute(result.imageUrl)}" alt="" loading="lazy" />` : ""}
              ${result.description ? `<p class="description">${escapeHtml(result.description)}</p>` : ""}
            </div>
            ${resultActions(result, index)}
          </div>
        </article>
      `
    )
    .join("");
}

function renderRssItems() {
  if (!state.rssItems.length) {
    elements.results.className = "list empty";
    elements.results.textContent = "No RSS items found.";
    return;
  }

  state.results = state.rssItems;
  elements.results.className = "list";
  elements.results.innerHTML = state.rssItems
    .map(
      (item, index) => `
        <article class="item feed-item">
          <div class="feed-layout">
            ${item.imageUrl ? `<img class="poster" src="${escapeAttribute(item.imageUrl)}" alt="" loading="lazy" />` : `<div class="poster placeholder"></div>`}
            <div>
              <div class="title">${escapeHtml(item.title)}</div>
              <div class="meta">${sourceMeta(item)}</div>
              ${item.description ? `<p class="description">${escapeHtml(item.description)}</p>` : ""}
              <div class="feed-buttons">
                ${item.detailsUrl ? `<a href="${escapeAttribute(item.detailsUrl)}" target="_blank" rel="noreferrer" title="Open details">Details</a>` : ""}
                <button type="button" class="primary" data-add="${index}">Add</button>
              </div>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderDownloads(torrents) {
  if (!torrents.length) {
    elements.downloads.className = "list empty";
    elements.downloads.textContent = "No active downloads found.";
    return;
  }

  elements.downloads.className = "list";
  elements.downloads.innerHTML = torrents
    .map((torrent) => {
      const percent = Math.round((torrent.progress || 0) * 100);
      const meta = [
        torrent.category || "uncategorized",
        torrent.state,
        `${percent}%`,
        torrent.dlspeed ? `${formatBytes(torrent.dlspeed)}/s` : ""
      ]
        .filter(Boolean)
        .map((value) => escapeHtml(value))
        .join(" - ");

      return `
        <article class="item">
          <div class="item-head">
            <div>
              <div class="title">${escapeHtml(torrent.name)}</div>
              <div class="meta">${meta}</div>
            </div>
          </div>
          <div class="progress-track" aria-label="${percent}% complete">
            <div class="progress-bar" style="width: ${percent}%"></div>
          </div>
        </article>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

async function search() {
  const query = elements.query.value.trim();
  if (!query) return;

  elements.results.className = "list empty";
  elements.results.textContent = "Searching...";
  const data = await api(`/api/search?q=${encodeURIComponent(query)}`);
  state.results = data.results || [];
  elements.sourceStatus.textContent = data.errors?.length ? `${data.errors.length} source issue` : `${state.results.length} results`;
  renderResults();
}

async function browseRss() {
  elements.results.className = "list empty";
  elements.results.textContent = "Loading RSS feed items...";
  const data = await api("/api/rss");
  state.rssItems = data.items || [];
  elements.sourceStatus.textContent = data.errors?.length ? `${data.errors.length} RSS source issue` : `${state.rssItems.length} RSS items`;
  renderRssItems();
}

function openMediaDialog(item, afterAdd) {
  state.pendingAdd = { item, afterAdd };
  elements.mediaDialogItem.textContent = item.title || "Selected torrent";
  elements.mediaDialog.classList.remove("hidden");
}

function closeMediaDialog() {
  state.pendingAdd = null;
  elements.mediaDialog.classList.add("hidden");
  elements.mediaDialogItem.textContent = "";
}

async function addTorrentWithMedia(mediaType) {
  if (!state.pendingAdd) return;
  const { item, afterAdd } = state.pendingAdd;
  await api("/api/torrents", {
    method: "POST",
    body: JSON.stringify({
      mediaType,
      torrentUrl: item.url,
      magnetUrl: item.magnet
    })
  });
  if (afterAdd) afterAdd();
  closeMediaDialog();
  showToast("Torrent sent to qBittorrent.");
  await refreshDownloads();
}

function addResult(index) {
  const result = state.results[index];
  openMediaDialog({
    title: result.title,
    url: result.url,
    magnet: result.magnet
  });
}

function addDirectUrl() {
  const value = elements.direct.value.trim();
  if (!value) return;
  const isMagnet = value.startsWith("magnet:");
  openMediaDialog({
    title: "Direct URL",
    url: isMagnet ? "" : value,
    magnet: isMagnet ? value : ""
  }, () => {
    elements.direct.value = "";
  });
}

async function refreshDownloads() {
  const data = await api("/api/torrents");
  renderDownloads(data.torrents || []);
}

async function scan(mediaType) {
  await api("/api/plex/scan", {
    method: "POST",
    body: JSON.stringify({ mediaType })
  });
  showToast("Plex library scan started.");
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  search().catch((error) => showToast(error.message, true));
});

elements.directForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addDirectUrl();
});

elements.results.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) return;
  addResult(Number(button.dataset.add));
});

elements.refresh.addEventListener("click", () => {
  refreshDownloads().catch((error) => showToast(error.message, true));
});

elements.browseRss.addEventListener("click", () => {
  browseRss().catch((error) => showToast(error.message, true));
});

elements.mediaDialog.addEventListener("click", (event) => {
  if (event.target === elements.mediaDialog || event.target === elements.cancelMedia) {
    closeMediaDialog();
    return;
  }

  const button = event.target.closest("[data-media-choice]");
  if (!button) return;
  addTorrentWithMedia(button.dataset.mediaChoice).catch((error) => showToast(error.message, true));
});

elements.scanMovie.addEventListener("click", () => scan("movie").catch((error) => showToast(error.message, true)));
elements.scanTv.addEventListener("click", () => scan("tv").catch((error) => showToast(error.message, true)));

refreshDownloads().catch(() => {});
window.setInterval(() => refreshDownloads().catch(() => {}), 5000);
