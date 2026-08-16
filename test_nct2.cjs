fetch('https://www.nhaccuatui.com/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
})
.then(r => r.text())
.then(html => {
    const match = html.match(/<script type=\"application\/json\" data-nuxt-data=\"nuxt-app\"[^>]*>(.*?)<\/script>/s);
    if (match) {
        const data = JSON.parse(match[1]);
        const results = [];
        
        for (let i = 0; i < data.length; i++) {
            if (typeof data[i] === 'string' && data[i].length === 12 && /^[a-zA-Z0-9]+$/.test(data[i])) {
                // If it's a playlist ID, there's usually a title shortly after, and an image URL
                // Let's just scan ahead a bit
                let title = null;
                let image = null;
                for (let j = 1; j <= 10; j++) {
                   if (!title && typeof data[i+j] === 'string' && data[i+j].length > 5 && !data[i+j].startsWith('http')) {
                       title = data[i+j];
                   }
                   if (!image && typeof data[i+j] === 'string' && data[i+j].includes('image-cdn.nct.vn/playlist')) {
                       image = data[i+j];
                   }
                }
                if (title && image && !results.find(r => r.id === data[i])) {
                    results.push({ id: data[i], title, image });
                }
            }
        }
        console.log('Found:', results.length);
        console.log(results.slice(0, 10));
    }
});
