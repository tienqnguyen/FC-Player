const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix getSafeFilename
content = content.replace(
    /const getSafeFilename = \(title\) => \{\n    if \(\!title\) return "audio";\n    let clean = title\.replace\(\/\[\^a-zA-Z0-9_\\-\\s\]\/g, ""\)\.trim\(\);\n    if \(clean\.length > 30\) \{\n      clean = clean\.substring\(0, 30\)\.trim\(\);\n    \}\n    return clean \|\| "audio";\n  \};/g,
    `const getSafeFilename = (title: any) => {
    if (!title) return "audio";
    let clean = String(title).replace(/[^a-zA-Z0-9_\\-\\s]/g, "").trim();
    if (clean.length > 30) {
      clean = clean.substring(0, 30).trim();
    }
    return clean || "audio";
  };`
);

// Fix downloadAudio to use target="_blank"
content = content.replace(
    /const downloadUrl = `\/api\/download\?url=\$\{encodeURIComponent\(targetUrl\)\}&title=\$\{encodeURIComponent\(getSafeFilename\(song\.title\)\)\}`;[\s\n]*\/\/ Let the browser handle the download using the backend's Content-Disposition headers[\s\n]*const link = document\.createElement\("a"\);[\s\n]*link\.href = downloadUrl;[\s\n]*document\.body\.appendChild\(link\);[\s\n]*link\.click\(\);[\s\n]*document\.body\.removeChild\(link\);/g,
    `const downloadUrl = \`/api/download?url=\${encodeURIComponent(targetUrl)}&title=\${encodeURIComponent(getSafeFilename(song.title))}\`;
    
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.target = "_blank";
    link.download = getSafeFilename(song.title) + ".mp3";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);`
);

// Fix handleDownloadCurrentAudio to use target="_blank"
content = content.replace(
    /const downloadUrl = `\/api\/download\?url=\$\{encodeURIComponent\(originalUrl\)\}&title=\$\{encodeURIComponent\(title\)\}`;[\s\n]*const a = document\.createElement\('a'\);[\s\n]*a\.href = downloadUrl;[\s\n]*document\.body\.appendChild\(a\);[\s\n]*a\.click\(\);[\s\n]*document\.body\.removeChild\(a\);/g,
    `const downloadUrl = \`/api/download?url=\${encodeURIComponent(originalUrl)}&title=\${encodeURIComponent(title)}\`;
    
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.target = "_blank";
    a.download = getSafeFilename(title) + ".mp3";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);`
);

fs.writeFileSync('src/App.tsx', content);
