const fs = require('fs');
let content = fs.readFileSync('server/cacheHelper.ts', 'utf8');

content = content.replace(/const THREE_DAYS_MS = 3 \* 24 \* 60 \* 60 \* 1000;/g, `const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
      let ttl = THREE_DAYS_MS;
      if (prefix === "nct_albums") ttl = 7 * 24 * 60 * 60 * 1000;`);
      
content = content.replace(/if \(Date\.now\(\) - item\.timestamp > THREE_DAYS_MS\) \{/g, `if (Date.now() - item.timestamp > ttl) {`);

fs.writeFileSync('server/cacheHelper.ts', content);
