const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const data = await res\.json\(\);\s*if \(\!res\.ok \|\| \!data\.success\) \{/g;
const replace = `let data;
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          if (!res.ok) throw new Error("Stemmix server returned invalid response (Status " + res.status + ")");
          throw new Error("Failed to parse JSON response");
        }
        if (!res.ok || !data.success) {`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('src/App.tsx', code);
  console.log("App.tsx JSON parser patched.");
} else {
  console.log("Could not find regex match.");
}
