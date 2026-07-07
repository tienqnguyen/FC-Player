const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const oldFetch = `        // Fetch as blob to prevent range request issues with large WAV files
        if (url.startsWith("blob:")) {
            audio.src = url;
            audio.load();
        } else {
            fetch(url)
                .then(res => {
                    if (!res.ok) throw new Error("HTTP error " + res.status);
                    const contentType = res.headers.get("content-type");
                    if (contentType && contentType.includes("json")) {
                        throw new Error("Received JSON instead of audio");
                    }
                    if (contentType && contentType.includes("html")) {
                        throw new Error("Received HTML instead of audio");
                    }
                    return res.blob();
                })
                .then(blob => {
                    if (blob.size < 1000) {
                        throw new Error("Blob too small (" + blob.size + " bytes), likely an error page or invalid data");
                    }
                    const objectUrl = URL.createObjectURL(blob);
                    audio.src = objectUrl;
                    audio.load();
                })
                .catch(err => {
                    console.error(\`Failed to fetch stem \${stem}:\`, err);
                    if (typeof onStemLoadError === 'function') onStemLoadError(stem, err.message);
                });
        }`;

const newFetch = `        audio.src = url;
        audio.load();`;

code = code.replace(oldFetch, newFetch);
fs.writeFileSync('src/components/StemStudio.tsx', code);
