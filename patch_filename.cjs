const fs = require('fs');

// 1. Patch src/App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(
    /const getSafeFilename = \(title: any\) => \{\n    if \(\!title\) return "audio";\n    let clean = String\(title\)\.replace\(\/\[\^a-zA-Z0-9_\\-\\s\]\/g, ""\)\.trim\(\);\n    if \(clean\.length > 30\) \{\n      clean = clean\.substring\(0, 30\)\.trim\(\);\n    \}\n    return clean \|\| "audio";\n  \};/g,
    `const getSafeFilename = (title: any) => {
    if (!title) return "audio";
    let clean = String(title).replace(/[<>:"/\\\\|?*\\x00-\\x1F]/g, "").trim();
    if (clean.length > 80) {
      clean = clean.substring(0, 80).trim();
    }
    return clean || "audio";
  };`
);
fs.writeFileSync('src/App.tsx', appContent);

// 2. Patch server.ts
let serverContent = fs.readFileSync('server.ts', 'utf8');
serverContent = serverContent.replace(
    /let safeTitle = title\.replace\(\/\[\^a-zA-Z0-9\\s_-\]\/g, ""\)\.trim\(\);\n      if \(safeTitle\.length > 30\) safeTitle = safeTitle\.substring\(0, 30\)\.trim\(\);/g,
    `let safeTitle = title.replace(/[<>:"/\\\\|?*\\x00-\\x1F]/g, "").trim();
      if (safeTitle.length > 80) safeTitle = safeTitle.substring(0, 80).trim();`
);

// Fix server.ts headers to use standard filename*=UTF-8 format to correctly support unicode filenames
serverContent = serverContent.replace(
    /res\.setHeader\([\s\n]*"Content-Disposition",[\s\n]*\`attachment; filename="\$\{encodeURIComponent\(safeTitle\)\}\.m4a"\`[\s\n]*\);/g,
    `res.setHeader(
          "Content-Disposition",
          \`attachment; filename="audio.m4a"; filename*=UTF-8''\${encodeURIComponent(safeTitle)}.m4a\`
        );`
);

serverContent = serverContent.replace(
    /res\.setHeader\([\s\n]*"Content-Disposition",[\s\n]*\`attachment; filename="\$\{encodeURIComponent\(safeTitle\)\}\.\$\{extension\}"\`[\s\n]*\);/g,
    `res.setHeader(
        "Content-Disposition",
        \`attachment; filename="audio.\${extension}"; filename*=UTF-8''\${encodeURIComponent(safeTitle)}.\${extension}\`
      );`
);

fs.writeFileSync('server.ts', serverContent);
