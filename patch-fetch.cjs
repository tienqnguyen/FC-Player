const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const regex = /fetch\(url\)[\s\S]*?\.catch\(err => \{[\s\S]*?\}\);/;
const replace = `if (url.startsWith("blob:")) {
            audio.src = url;
            audio.load();
        } else {
            fetch(url)
                .then(res => res.blob())
                .then(blob => {
                    const objectUrl = URL.createObjectURL(blob);
                    audio.src = objectUrl;
                    audio.load();
                })
                .catch(err => {
                    console.error(\`Failed to fetch stem \${stem}:\`, err);
                });
        }`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('src/components/StemStudio.tsx', code);
  console.log("Patched StemStudio.tsx fetch.");
} else {
  console.log("Could not find regex match.");
}
