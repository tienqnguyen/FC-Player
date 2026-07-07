const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const stemConnectRegex = /const gain = ctx\.createGain\(\);\s*gainNodesRef\.current\[stem\] = gain;/;
const stemConnectReplace = `const gain = ctx.createGain();
        gainNodesRef.current[stem] = gain;
        
        const panner = ctx.createStereoPanner();
        panner.pan.value = pans[stem] || 0;
        pannerNodesRef.current[stem] = panner;`;
code = code.replace(stemConnectRegex, stemConnectReplace);

const nodeRoutingRegex = /audioNode\.connect\(analyser\);\s*analyser\.connect\(gain\);\s*gain\.connect\(master\);/;
const nodeRoutingReplace = `audioNode.connect(analyser);
        analyser.connect(panner);
        panner.connect(gain);
        gain.connect(master);`;
code = code.replace(nodeRoutingRegex, nodeRoutingReplace);

fs.writeFileSync('src/components/StemStudio.tsx', code);
