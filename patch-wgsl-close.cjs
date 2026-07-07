const fs = require('fs');
let code = fs.readFileSync('src/utils/webgpuDsp.ts', 'utf8');

code = code.replace(
  /outputBuffer\[index\] = final_sample;\n\}`;/,
  `outputBuffer[index] = final_sample;
}
\`;
}`
);

fs.writeFileSync('src/utils/webgpuDsp.ts', code);
console.log("Patched close.");
