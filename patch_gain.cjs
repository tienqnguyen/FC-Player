const fs = require('fs');
let content = fs.readFileSync('src/components/PixabayStudio.tsx', 'utf8');

const newScheduling = `  const scheduleTrack = useCallback((track: SfxTrack, masterTime: number) => {
    if (!audioCtxRef.current || !track.buffer) return;
    const ctx = audioCtxRef.current;
    
    const trimStart = track.trimStart || 0;
    const trimEnd = track.trimEnd || 0;
    const activeDuration = track.duration! - trimStart - trimEnd;
    
    const playWindowStart = track.startTime;
    const playWindowEnd = track.startTime + activeDuration;
    
    if (masterTime >= playWindowEnd) return;
    
    stopTrack(track.id);
    
    const source = ctx.createBufferSource();
    source.buffer = track.buffer;
    
    const fadeGainNode = ctx.createGain();
    const userGainNode = ctx.createGain();
    
    let finalGain = track.volume;
    if (track.isMuted) finalGain = 0;
    if (anySolo && !track.isSolo) finalGain = 0;
    userGainNode.gain.value = finalGain;
    
    let offset = trimStart;
    let timeToStart = ctx.currentTime;
    
    if (masterTime > track.startTime) {
       const elapsed = masterTime - track.startTime;
       offset += elapsed;
       
       if (elapsed < track.fadeIn) {
           fadeGainNode.gain.setValueAtTime(0, timeToStart);
           fadeGainNode.gain.linearRampToValueAtTime(1, timeToStart + (track.fadeIn - elapsed));
       } else if (elapsed > activeDuration - track.fadeOut) {
           const fadeRemaining = activeDuration - elapsed;
           const curGain = (fadeRemaining / track.fadeOut);
           fadeGainNode.gain.setValueAtTime(curGain, timeToStart);
           fadeGainNode.gain.linearRampToValueAtTime(0, timeToStart + fadeRemaining);
       } else {
           fadeGainNode.gain.setValueAtTime(1, timeToStart);
           fadeGainNode.gain.setValueAtTime(1, timeToStart + (activeDuration - elapsed - track.fadeOut));
           fadeGainNode.gain.linearRampToValueAtTime(0, timeToStart + (activeDuration - elapsed));
       }
       source.start(timeToStart, offset, activeDuration - elapsed);
    } else {
       timeToStart = ctx.currentTime + (track.startTime - masterTime);
       fadeGainNode.gain.setValueAtTime(0, timeToStart);
       fadeGainNode.gain.linearRampToValueAtTime(1, timeToStart + track.fadeIn);
       fadeGainNode.gain.setValueAtTime(1, timeToStart + activeDuration - track.fadeOut);
       fadeGainNode.gain.linearRampToValueAtTime(0, timeToStart + activeDuration);
       source.start(timeToStart, trimStart, activeDuration);
    }
    
    source.connect(fadeGainNode);
    fadeGainNode.connect(userGainNode);
    userGainNode.connect(ctx.destination);
    
    sourceNodesRef.current.set(track.id, { source, gain: userGainNode });
  }, [anySolo, stopTrack]);`;

content = content.replace(/  const scheduleTrack = useCallback\(\(track: SfxTrack, masterTime: number\) => \{[\s\S]*?\}, \[anySolo, stopTrack\]\);/, newScheduling);

fs.writeFileSync('src/components/PixabayStudio.tsx', content);
