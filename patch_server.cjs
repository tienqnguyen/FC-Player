const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

content = content.replace(
  /const safeTitle = title\.replace\(\/\[\^a-zA-Z0-9\\s-\_\]\/g, ""\)\.trim\(\) \|\| "audio";/g,
  'let safeTitle = title.replace(/[^a-zA-Z0-9\\\\s-_]/g, "").trim();\n      if (safeTitle.length > 30) safeTitle = safeTitle.substring(0, 30).trim();\n      if (!safeTitle) safeTitle = "audio";'
);

fs.writeFileSync('server.ts', content);
