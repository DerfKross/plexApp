# PlexApp

Local household web UI for finding legal torrent files from approved sources, sending them to qBittorrent, tracking progress, and triggering Plex library scans.

## Windows 10 Server Setup

Run these steps on the Windows 10 machine that already runs qBittorrent.

1. Install Git for Windows:

   https://git-scm.com/download/win

2. Install Node.js LTS:

   https://nodejs.org/

3. Open PowerShell and clone the app:

   ```powershell
   cd C:\Apps
   git clone https://github.com/DerfKross/plexApp.git
   cd .\plexApp
   ```

   If `C:\Apps` does not exist yet:

   ```powershell
   New-Item -ItemType Directory -Path C:\Apps
   ```

4. Run the setup script:

   ```powershell
   .\scripts\setup-windows.ps1
   ```

5. Edit `.env` and fill in the qBittorrent password, Plex token, Plex library IDs, and your real completed-download paths.

6. Start the app:

   ```powershell
   .\scripts\start-windows.ps1
   ```

   To keep it running in the background instead:

   ```powershell
   .\scripts\start-background.ps1
   ```

7. If other devices cannot open the app, run PowerShell as Administrator and allow the app port through Windows Firewall:

   ```powershell
   .\scripts\open-firewall.ps1
   ```

Open the app on the qBittorrent server:

```text
http://localhost:3747
```

From another device on your home network:

```text
http://192.168.1.131:3747
```

## Updating Later

On the Windows 10 qBittorrent server:

```powershell
cd C:\Apps\plexApp
.\scripts\update-windows.ps1
```

That script runs `git pull` and `npm install`.

It also appends newly added `.env` options from `.env.example` without changing your existing passwords, tokens, paths, or source URLs.

## qBittorrent Settings

In qBittorrent, enable **Tools > Options > Web UI**.

Recommended local app settings:

```env
QBITTORRENT_URL=http://127.0.0.1:8080
QBITTORRENT_USERNAME=your-qbittorrent-user
QBITTORRENT_PASSWORD=your-qbittorrent-password
```

Use `127.0.0.1` because PlexApp should run on the same Windows machine as qBittorrent.

## Plex Settings

Plex is currently configured for:

```env
PLEX_URL=http://192.168.1.200:32400
PLEX_TOKEN=your-token
PLEX_MOVIE_SECTION_ID=1
PLEX_TV_SECTION_ID=2
```

## Torrent Sources

The app supports three source types:

- Internet Archive, enabled by default.
- Torznab/Newznab-compatible sources through `TORZNAB_SOURCES`.
- RSS feeds with torrent enclosures or magnet links through `TORRENT_RSS_SOURCES`.

Example `.env`:

```env
ENABLE_INTERNET_ARCHIVE=false
TORRENT_RSS_SOURCES=https://example.org/legal-torrents/rss,https://another-source.example/feed
TORRENT_RSS_LABELS=Public Domain Movies,Open TV Feed
TORRENT_RSS_SEARCH_SOURCES=https://example.org/feed/{query}/1080p/all
TORRENT_RSS_SEARCH_LABELS=Keyword Feed
TORZNAB_SOURCES=https://indexer.example/api?t=search&apikey=KEY
```

For RSS-only search, set `ENABLE_INTERNET_ARCHIVE=false`, leave `TORZNAB_SOURCES` blank, and put your RSS feed URLs in `TORRENT_RSS_SOURCES`.

When multiple RSS feeds are configured, the UI shows an **All** button plus one button per feed. Use `TORRENT_RSS_LABELS` to manually name those buttons. Use `RSS_ITEMS_PER_FEED` to control how many items are loaded from each feed when browsing.

For RSS feeds that support keyword URLs, add them to `TORRENT_RSS_SEARCH_SOURCES` and put `{query}` where the user's search term belongs. Search will URL-encode the query before inserting it. Use `{rawQuery}` only if the feed requires an unencoded value.

For sites without RSS or an API, add a custom adapter in `src/search.js`. Use that only for sources you are allowed to access and avoid scraping pages that block automated access in their terms.

## Download Paths

These paths must exist on the Windows 10 qBittorrent machine:

```env
MOVIE_SAVE_PATH=D:\Media\Movies
TV_SAVE_PATH=D:\Media\TV Shows
```

For mapped network drives such as `T:\`, use the UNC path instead of the drive letter:

```env
MOVIE_SAVE_PATH=\\SERVER\Share\Movies
TV_SAVE_PATH=\\SERVER\Share\TV Shows
```

To convert mapped paths in `.env` automatically on the Windows server:

```powershell
.\scripts\convert-mapped-paths.ps1
```

When a user adds a TV show, PlexApp lists the existing folders inside `TV_SAVE_PATH`. The user can choose one of those folders or type a new show name, then optionally choose or create a season subfolder such as `Season 09`. PlexApp creates the folders and sends the selected folder as qBittorrent's save path.

## Connection Check

After setup, run:

```powershell
.\scripts\check-connections.ps1
```

To check whether the web GUI is running:

```powershell
.\scripts\status-windows.ps1
```

Completed download history is kept for 24 hours after completion, then removed automatically. Use **Clear Done** in the Downloads panel to clear remembered completed items immediately.

## Notes

- Internet Archive search is enabled by default for legal public-domain/open-media torrents.
- User-entered direct magnet or torrent URLs are allowed by default. Set `ALLOW_DIRECT_TORRENT_URLS=false` to disable them.
- qBittorrent receives a `movie` or `tv` category and a matching save path based on the user's selection.
