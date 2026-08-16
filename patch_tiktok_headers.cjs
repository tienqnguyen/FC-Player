const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `      if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) {
        headers["Referer"] = "https://www.nhaccuatui.com/";
        headers["Origin"] = "https://www.nhaccuatui.com";
      }`;

const replacementStr = `      if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) {
        headers["Referer"] = "https://www.nhaccuatui.com/";
        headers["Origin"] = "https://www.nhaccuatui.com";
      }
      if (url.includes("tiktokcdn") || url.includes("tiktok.com")) {
        headers["Referer"] = "https://www.tiktok.com/";
      }`;

content = content.replace(targetStr, replacementStr);

// ALSO patch the proxy-stream API for tiktok headers
const targetStr2 = `      if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) {
        headers["Referer"] = "https://www.nhaccuatui.com/";
        headers["Origin"] = "https://www.nhaccuatui.com";
      }`;

content = content.replace(targetStr2, replacementStr); // apply second time for the proxy-stream endpoint

fs.writeFileSync('server.ts', content);
console.log("Patched tiktok headers");
