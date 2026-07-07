const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const audioInitRegex = /const master = ctx\.createGain\(\);\s*masterGainRef\.current = master;/;
const audioInitReplace = `const master = ctx.createGain();
      masterGainRef.current = master;

      const sampleRate = ctx.sampleRate;
      const length = sampleRate * 2.5; 
      const impulse = ctx.createBuffer(2, length, sampleRate);
      const impulseL = impulse.getChannelData(0);
      const impulseR = impulse.getChannelData(1);
      for (let i = 0; i < length; i++) {
        const decay = Math.exp(-i / (sampleRate * 0.3));
        impulseL[i] = (Math.random() * 2 - 1) * decay;
        impulseR[i] = (Math.random() * 2 - 1) * decay;
      }
      const convolver = ctx.createConvolver();
      convolver.buffer = impulse;
      convolverRef.current = convolver;
      
      const revGain = ctx.createGain();
      revGain.gain.value = reverb;
      reverbGainRef.current = revGain;

      master.connect(convolver);
      convolver.connect(revGain);`;
code = code.replace(audioInitRegex, audioInitReplace);

const audioConnectRegex = /lastNode\.connect\(ctx\.destination\);/;
const audioConnectReplace = `lastNode.connect(ctx.destination);
      revGain.connect(eqNodes[0]);`;
code = code.replace(audioConnectRegex, audioConnectReplace);

fs.writeFileSync('src/components/StemStudio.tsx', code);
