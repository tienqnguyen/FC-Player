async function run() {
  const res = await fetch('https://www.nhaccuatui.com/', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const html = await res.text();
  const match = html.match(/<script type=\"application\/json\" data-nuxt-data=\"nuxt-app\"[^>]*>(.*?)<\/script>/s);
  if (match) {
    const data = JSON.parse(match[1]);
    for (let i = 0; i < data.length; i++) {
        if (typeof data[i] === 'string' && data[i].length === 12 && /^[a-zA-Z0-9]+$/.test(data[i])) {
            console.log("Found 12-char ID:", data[i], "At index:", i);
            console.log("Surrounding data:", data.slice(i-2, i+15));
            break;
        }
    }
  }
}
run();
