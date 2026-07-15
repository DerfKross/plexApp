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

## Download Paths

These paths must exist on the Windows 10 qBittorrent machine:

```env
MOVIE_SAVE_PATH=D:\Media\Movies
TV_SAVE_PATH=D:\Media\TV Shows
```

## Connection Check

After setup, run:

```powershell
.\scripts\check-connections.ps1
```

## Notes

- Internet Archive search is enabled by default for legal public-domain/open-media torrents.
- User-entered direct magnet or torrent URLs are allowed by default. Set `ALLOW_DIRECT_TORRENT_URLS=false` to disable them.
- qBittorrent receives a `movie` or `tv` category and a matching save path based on the user's selection.
