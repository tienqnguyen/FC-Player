const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const downloadUrl = `\/api\/download\?url=\$\{encodeURIComponent\(targetUrl\)\}&title=\$\{encodeURIComponent\(getSafeFilename\(song\.title\)\)\}`;[\s\S]*?\}\s*catch\s*\(err\)\s*\{[\s\S]*?\}\s*\};/;

const replacement = `const downloadUrl = \`/api/download?url=\${encodeURIComponent(targetUrl)}&title=\${encodeURIComponent(getSafeFilename(song.title))}\`;
    
    // Let the browser handle the download using the backend's Content-Disposition headers
    const link = document.createElement("a");
    link.href = downloadUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx handleDownload to use simple a.click()");
