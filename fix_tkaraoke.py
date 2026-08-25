import re

with open('server/tkaraokeParser.ts', 'r') as f:
    content = f.read()

target = """    $('a[href*=".html"]').each((_, el) => {
        const href = $(el).attr('href');
        const title = $(el).text().trim();

        if (href && title && !href.includes('playlist') && !href.includes('singer')) {
            const fullUrl = href.startsWith('http') ? href : `${TKARAOKE_BASE}${href.startsWith('/') ? '' : '/'}${href}`;
            if (!seenUrls.has(fullUrl)) {
                seenUrls.add(fullUrl);
                songs.push({ title, url: fullUrl, lyrics: null, mp3Versions: [], isGenerated: false });
            }
        }
    });"""

replacement = """    $('a[href*=".html"]').each((_, el) => {
        const href = $(el).attr('href');
        const title = $(el).text().trim();

        if (href && title && !href.includes('playlist') && !href.includes('singer')) {
            const fullUrl = href.startsWith('http') ? href : `${TKARAOKE_BASE}${href.startsWith('/') ? '' : '/'}${href}`;
            if (!seenUrls.has(fullUrl)) {
                seenUrls.add(fullUrl);
                
                let audioUrl = "";
                // Look for mp3 link in the same container (row, li, etc)
                const parentContainer = $(el).closest('tr, li, div.row, div.song-item, .table, tbody');
                if (parentContainer.length) {
                    parentContainer.find('a').each((_, aEl) => {
                        const aHref = $(aEl).attr('href') || '';
                        const aTitle = $(aEl).attr('title') || '';
                        // Sometimes title is missing, just check href
                        if (aHref.includes('/mp3/')) {
                            const match = aHref.match(/\\/mp3\\/(\\d+)_/);
                            if (match) {
                                audioUrl = `https://ytmedia.tkaraoke.com/audio?refId=${match[1]}`;
                            }
                        }
                    });
                }
                
                // If not found in parent, scan siblings or next elements
                if (!audioUrl) {
                    const nextEl = $(el).nextAll('a').first();
                    if (nextEl.length && (nextEl.attr('href') || '').includes('/mp3/')) {
                        const match = (nextEl.attr('href') || '').match(/\\/mp3\\/(\\d+)_/);
                        if (match) {
                            audioUrl = `https://ytmedia.tkaraoke.com/audio?refId=${match[1]}`;
                        }
                    }
                }
                
                songs.push({ title, url: fullUrl, audioUrl, lyrics: null, mp3Versions: [], isGenerated: false });
            }
        }
    });"""

content = content.replace(target, replacement)

with open('server/tkaraokeParser.ts', 'w') as f:
    f.write(content)

