const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// Apply the effect and ref changes again, safely
code = code.replace(/useEffect\(\(\) => \{\s*if \(\!audioContextRef\.current\) return;\s*stemsList\.forEach\(stem => \{\s*const gain = gainNodesRef\.current\[stem\];/, `
  useEffect(() => {
    stemsList.forEach(stem => {
       const audio = audioElementsRef.current[stem];
       if (audio) {
         audio.playbackRate = speed;
         if ('preservesPitch' in audio) {
            (audio as any).preservesPitch = true;
         }
       }
    });
  }, [speed, stemsList]);

  useEffect(() => {
    if (reverbGainRef.current && audioContextRef.current) {
       reverbGainRef.current.gain.setTargetAtTime(reverb, audioContextRef.current.currentTime, 0.1);
    }
  }, [reverb]);

  useEffect(() => {
    stemsList.forEach(stem => {
      const panner = pannerNodesRef.current[stem];
      if (panner && audioContextRef.current) {
        panner.pan.setTargetAtTime(pans[stem] || 0, audioContextRef.current.currentTime, 0.1);
      }
    });
  }, [pans, stemsList]);

  useEffect(() => {
    if (!audioContextRef.current) return;
    stemsList.forEach(stem => {
      const gain = gainNodesRef.current[stem];`
);
fs.writeFileSync('src/components/StemStudio.tsx', code);
