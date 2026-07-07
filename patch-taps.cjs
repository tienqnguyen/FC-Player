const fs = require('fs');
let code = fs.readFileSync('src/utils/webgpuDsp.ts', 'utf8');

code = code.replace(/let num_taps: i32 = 255;/g, 'let num_taps: i32 = 4095;');
code = code.replace(/let half_taps: i32 = 127;/g, 'let half_taps: i32 = 2047;');

fs.writeFileSync('src/utils/webgpuDsp.ts', code);
console.log("Patched FIR taps to 4095.");
