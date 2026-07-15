const state = {
  mediaType: "movie",
  results: []
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
  scanMovie: $("#scanMovieButton"),
  scanTv: $("#scanTvButton")
};

function selectedMediaType() {
  return new FormData(elements.form).get("mediaType");
}

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
              <div class="meta">${escapeHtml(result.source)}${result.size ? ` · ${formatBytes(result.size)}` : ""}${result.seeders ? ` · ${result.seeders} seeders` : ""}</div>
            </div>
            <div class="item-actions">
              ${result.detailsUrl ? `<a href="${escapeAttribute(result.detailsUrl)}" target="_blank" rel="noreferrer" title="Open details">Details</a>` : ""}
              <button type="button" class="primary" data-add="${index}">Add</button>
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
      return `
        <article class="item">
          <div class="item-head">
            <div>
              <div class="title">${escapeHtml(torrent.name)}</div>
              <div class="meta">${escapeHtml(torrent.category || "uncategorized")} · ${escapeHtml(torrent.state)} · ${percent}%${torrent.dlspeed ? ` · ${formatBytes(torrent.dlspeed)}/s` : ""}</div>
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
  const mediaType = selectedMediaType();
  const query = elements.query.value.trim();
  if (!query) return;

  elements.results.className = "list empty";
  elements.results.textContent = "Searching...";
  const data = await api(`/api/search?q=${encodeURIComponent(query)}&mediaType=${encodeURIComponent(mediaType)}`);
  state.mediaType = mediaType;
  state.results = data.results || [];
  elements.sourceStatus.textContent = data.errors?.length ? `${data.errors.length} source issue` : `${state.results.length} results`;
  renderResults();
}

async function addResult(index) {
  const result = state.results[index];
  await api("/api/torrents", {
    method: "POST",
    body: JSON.stringify({
      mediaType: state.mediaType,
      torrentUrl: result.url,
      magnetUrl: result.magnet
    })
  });
  showToast("Torrent sent to qBittorrent.");
  await refreshDownloads();
}

async function addDirectUrl() {
  const value = elements.direct.value.trim();
  if (!value) return;
  const isMagnet = value.startsWith("magnet:");

  await api("/api/torrents", {
    method: "POST",
    body: JSON.stringify({
      mediaType: selectedMediaType(),
      torrentUrl: isMagnet ? "" : value,
      magnetUrl: isMagnet ? value : ""
    })
  });
  elements.direct.value = "";
  showToast("Torrent URL sent to qBittorrent.");
  await refreshDownloads();
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
  addDirectUrl().catch((error) => showToast(error.message, true));
});

elements.results.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) return;
  addResult(Number(button.dataset.add)).catch((error) => showToast(error.message, true));
});

elements.refresh.addEventListener("click", () => {
  refreshDownloads().catch((error) => showToast(error.message, true));
});

elements.scanMovie.addEventListener("click", () => scan("movie").catch((error) => showToast(error.message, true)));
elements.scanTv.addEventListener("click", () => scan("tv").catch((error) => showToast(error.message, true)));

refreshDownloads().catch(() => {});
window.setInterval(() => refreshDownloads().catch(() => {}), 5000);
