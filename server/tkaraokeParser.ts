import * as nodeFetch from "node-fetch";
const fetch = ((nodeFetch as any).default || nodeFetch) as typeof import("node-fetch").default;
import * as cheerio from "cheerio";

const TKARAOKE_BASE = 'https://lyric.tkaraoke.com';

export async function fetchTKaraokePlaylist(url: string) {
    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch tkaraoke playlist: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const songs: any[] = [];
    const seenUrls = new Set<string>();

    $('a[href*=".html"]').each((_, el) => {
        const href = $(el).attr('href');
        const title = $(el).text().trim();

        if (href && title && !href.includes('playlist') && !href.includes('singer')) {
            const fullUrl = href.startsWith('http') ? href : `${TKARAOKE_BASE}${href.startsWith('/') ? '' : '/'}${href}`;
            if (!seenUrls.has(fullUrl)) {
                seenUrls.add(fullUrl);
                songs.push({ title, url: fullUrl, lyrics: null, mp3Versions: [], isGenerated: false });
            }
        }
    });

    return songs;
}

export async function fetchTKaraokeSongDetails(url: string) {
    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch tkaraoke song details: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    let lyrics = '';
    const lyricDiv = $('div.div-content-lyric').length ? $('div.div-content-lyric') : $('div.div-lyric');
    if (lyricDiv.length) {
        const cloned = lyricDiv.clone();
        cloned.find('script, style, a, i, ul, li, h1, h2, h3, h4').remove();
        cloned.find('br').replaceWith('\n');
        lyrics = cloned.text().split('\n').map(l => l.trim()).filter(l => l).join('\n');
    }

    const mp3Versions: any[] = [];
    // The user snippet uses a[title="Nghe bài hat"] but it could be "Nghe bài hát" so we select by substring or by mp3 link
    $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const title = $(el).attr('title') || '';
        
        if (title.includes('Nghe') && href.includes('/mp3/')) {
            const match = href.match(/\/mp3\/(\d+)_/);
            if (match) {
                const id = match[1];
                let filename = href.split('/').pop()?.replace('.html', '') || '';
                let singerName = filename.substring(filename.indexOf('_') + 1).replace(/_/g, ' ') || `Version ${mp3Versions.length + 1}`;
                
                // Deduplicate by URL
                const audioUrl = `https://ytmedia.tkaraoke.com/audio?refId=${id}`;
                if (!mp3Versions.find(v => v.url === audioUrl)) {
                    mp3Versions.push({
                        url: audioUrl,
                        name: singerName
                    });
                }
            }
        }
    });

    return { lyrics, mp3Versions };
}
