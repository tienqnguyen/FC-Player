import youtubedl from "youtube-dl-exec";
import axios from "axios";

export interface SoundCloudTrack {
  id: string;
  title: string;
  author: string;
  cover: string;
  originalUrl: string;
  audioUrl: string;
  duration?: number;
  source: "soundcloud";
}

export interface SoundCloudPlaylistResult {
  success: boolean;
  title: string;
  author: string;
  username: string;
  avatar: string;
  url: string;
  songs: SoundCloudTrack[];
  error?: string;
}

// In-memory cache for fast oEmbed lookups
const oembedMemoryCache = new Map<string, { data: any; expiresAt: number }>();

/**
 * Fetch oEmbed metadata for a single SoundCloud track
 * endpoint: https://soundcloud.com/oembed?url=...&format=json
 */
export async function fetchSoundCloudOembed(trackUrl: string): Promise<{
  title?: string;
  author?: string;
  thumbnail_url?: string;
  html?: string;
  author_url?: string;
} | null> {
  const cached = oembedMemoryCache.get(trackUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const oembedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(trackUrl)}&format=json`;
    const res = await axios.get(oembedUrl, {
      timeout: 3500,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    if (res.status === 200 && res.data) {
      const data = {
        title: res.data.title,
        author: res.data.author_name,
        thumbnail_url: res.data.thumbnail_url,
        html: res.data.html,
        author_url: res.data.author_url,
      };
      oembedMemoryCache.set(trackUrl, {
        data,
        expiresAt: Date.now() + 6 * 60 * 60 * 1000, // 6 hours
      });
      return data;
    }
  } catch (err: any) {
    // Graceful fallback if oembed times out or fails
  }
  return null;
}

/**
 * Parse and normalize SoundCloud username or URL into canonical format
 */
export function extractSoundCloudIdentifier(rawUrl: string): {
  normalizedUrl: string;
  username: string;
  isPlaylistOrUser: boolean;
} {
  let u = rawUrl.trim();
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    u = "https://" + u;
  }

  try {
    const parsed = new URL(u);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const username = pathParts[0] || "";
    
    // User profile or playlist types
    const isPlaylistOrUser =
      pathParts.length === 1 || // soundcloud.com/username
      (pathParts.length >= 2 &&
        ["sets", "tracks", "popular-tracks", "albums", "reposts", "likes"].includes(
          pathParts[1].toLowerCase(),
        ));

    return {
      normalizedUrl: u,
      username,
      isPlaylistOrUser,
    };
  } catch {
    return {
      normalizedUrl: rawUrl,
      username: "",
      isPlaylistOrUser: false,
    };
  }
}

/**
 * Fetch a playlist or user track list from SoundCloud using yt-dlp flat-playlist,
 * enriched with oEmbed artwork and clean titles.
 */
export async function fetchSoundCloudPlaylist(
  targetUrl: string,
  limit = 50,
): Promise<SoundCloudPlaylistResult> {
  const { normalizedUrl, username } = extractSoundCloudIdentifier(targetUrl);

  const ytdlOptions: any = {
    dumpSingleJson: true,
    flatPlaylist: true,
    noWarnings: true,
    playlistEnd: limit,
    noCheckCertificates: true,
  };

  console.log(`[SoundCloud Parser] Extracting flat-playlist for: ${normalizedUrl}`);
  const info = (await youtubedl(normalizedUrl, ytdlOptions)) as any;

  if (!info || !info.entries || info.entries.length === 0) {
    throw new Error("No tracks found on this SoundCloud page or account is private.");
  }

  const entries: any[] = info.entries;
  console.log(`[SoundCloud Parser] Found ${entries.length} tracks. Enriching with oEmbed...`);

  // Enrich tracks concurrently in chunks of 8 to balance speed and reliability
  const chunkSize = 8;
  const enrichedTracks: SoundCloudTrack[] = [];

  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    const chunkResults = await Promise.allSettled(
      chunk.map(async (entry) => {
        const trackUrl = entry.url || `https://soundcloud.com/${entry.id}`;
        const oembed = await fetchSoundCloudOembed(trackUrl);

        let title = entry.title || "SoundCloud Audio";
        let author = entry.uploader || username || "SoundCloud Artist";
        let cover = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300";

        if (oembed) {
          if (oembed.title) {
            title = oembed.title;
            // Often format is: "<Title> by <Author>"
            if (oembed.author && title.endsWith(` by ${oembed.author}`)) {
              title = title.substring(0, title.length - ` by ${oembed.author}`.length).trim();
            }
          }
          if (oembed.author) {
            author = oembed.author;
          }
          if (oembed.thumbnail_url) {
            cover = oembed.thumbnail_url;
          }
        }

        return {
          id: "sc_" + (entry.id || Math.random().toString(36).substring(2, 9)),
          title,
          author,
          cover,
          originalUrl: trackUrl,
          audioUrl: `/api/stream?url=${encodeURIComponent(trackUrl)}`,
          duration: entry.duration || 0,
          source: "soundcloud" as const,
        };
      }),
    );

    for (const r of chunkResults) {
      if (r.status === "fulfilled") {
        enrichedTracks.push(r.value);
      }
    }
  }

  const firstValidCover = enrichedTracks.find((t) => !t.cover.includes("unsplash"))?.cover;

  return {
    success: true,
    title: info.title || (username ? `SoundCloud @${username}` : "SoundCloud Playlist"),
    author: info.uploader || username || "SoundCloud",
    username: username || "soundcloud",
    avatar: firstValidCover || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300",
    url: normalizedUrl,
    songs: enrichedTracks,
  };
}
