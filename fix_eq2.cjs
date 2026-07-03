const fs = require('fs');

let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf-8');

// Replace the stems EQ creation with direct connection to analyser
const idxLowEq = code.indexOf('const lowEq = ctx.createBiquadFilter();');
const idxGainCreate = code.indexOf('const gain = ctx.createGain();', idxLowEq);
const idxGainConnectMaster = code.indexOf('gain.connect(master);', idxGainCreate) + 'gain.connect(master);'.length;

if (idxLowEq !== -1 && idxGainCreate !== -1 && idxGainConnectMaster !== -1) {
  const toReplace = code.substring(idxLowEq, idxGainConnectMaster);
  const newStemEqSetup = `        const gain = ctx.createGain();
        gainNodesRef.current[stem] = gain;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.85;
        analysersRef.current[stem] = analyser;

        source.connect(analyser);
        analyser.connect(gain);
        gain.connect(master);`;
  code = code.replace(toReplace, newStemEqSetup);
} else {
  console.log("Could not find stem EQ creation to replace.");
}

// Remove EQ update in useEffect
const idxEqNodesUpdate = code.indexOf('// Update EQ');
if (idxEqNodesUpdate !== -1) {
    const idxEndIf = code.indexOf('}', code.indexOf('if (eq && eqState) {')) + 1;
    const toReplace = code.substring(idxEqNodesUpdate, idxEndIf);
    code = code.replace(toReplace, '');
}

// Remove eqs from dependency array
code = code.replace('}, [volumes, mutes, solos, eqs]);', '}, [volumes, mutes, solos]);');

// Add new useEffect for masterEq
const newEffect = `
  useEffect(() => {
    masterEqNodesRef.current.forEach((node, i) => {
       node.gain.setTargetAtTime(masterEq[i].g, audioContextRef.current?.currentTime || 0, 0.05);
    });
  }, [masterEq]);
`;
code = code.replace('}, [volumes, mutes, solos]);', '}, [volumes, mutes, solos]);' + newEffect);

fs.writeFileSync('src/components/StemStudio.tsx', code);
