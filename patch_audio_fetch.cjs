const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

code = code.replace(/fetch\(url\)\n                \.then\(res => res\.blob\(\)\)/, `fetch(url)
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
                })`);

fs.writeFileSync('src/components/StemStudio.tsx', code);
