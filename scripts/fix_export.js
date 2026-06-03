import fs from "fs";

let js = fs.readFileSync("src/App.tsx", "utf8");
// append the export default App
fs.writeFileSync("src/App.tsx", js + "\nexport default App;\n");
