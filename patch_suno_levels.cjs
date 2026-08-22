const fs = require('fs');

let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf-8');

let target = `  const handleResetSunoSystemDefault = () => {
    setSunoSpeedFactor(1.045);
    setSunoPitchShift(6.5);
    setSunoNoiseLevel(0);
    setSunoEqLow(6.5);
    setSunoEqMid(6.5);
    setSunoEqHigh(6.5);
  };`;

let replacement = `  const handleResetSunoSystemDefault = () => {
    setSunoSpeedFactor(1.045);
    setSunoPitchShift(6.5);
    setSunoNoiseLevel(0);
    setSunoEqLow(6.5);
    setSunoEqMid(6.5);
    setSunoEqHigh(6.5);
    setDspLowpass(false);
    setDspChorus(false);
    setDspFlutter(false);
    setDspDecorrelate(false);
  };

  const handleApplySunoLevel = (level: number) => {
      if (level === 1) {
          setSunoSpeedFactor(1.02);
          setSunoPitchShift(3.5);
          setSunoNoiseLevel(0);
          setSunoEqLow(3.5);
          setSunoEqMid(3.5);
          setSunoEqHigh(3.5);
          setDspLowpass(false);
          setDspChorus(false);
          setDspFlutter(false);
          setDspDecorrelate(false);
      } else if (level === 2) {
          handleResetSunoSystemDefault();
      } else if (level === 3) {
          setSunoSpeedFactor(1.065);
          setSunoPitchShift(9.5);
          setSunoNoiseLevel(0.015);
          setSunoEqLow(9.5);
          setSunoEqMid(9.5);
          setSunoEqHigh(9.5);
          setDspLowpass(true);
          setDspChorus(true);
          setDspFlutter(true);
          setDspDecorrelate(true);
      }
  };`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/components/StemStudio.tsx', content);
    console.log("Success state");
} else {
    console.log("Target not found state");
}
