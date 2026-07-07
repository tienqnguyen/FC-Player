const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/vocals: data.vocals,\n            drums: data.drums,\n            bass: data.bass,\n            guitar: data.other, \/\/ Mapping 'other' to guitar since Demucs outputs 4 stems usually\n            piano: data.other,\n            other: data.other,/, `vocals: data.stems?.vocals,
            drums: data.stems?.drums,
            bass: data.stems?.bass,
            guitar: data.stems?.guitar || data.stems?.other,
            piano: data.stems?.piano || data.stems?.other,
            other: data.stems?.other,`);

fs.writeFileSync('src/App.tsx', code);
