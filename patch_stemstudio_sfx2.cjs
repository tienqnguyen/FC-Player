const fs = require('fs');
let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const sfxExportLogic = `      const sfxTracks = pixabayStudioRef.current ? pixabayStudioRef.current.getTracks() : [];
      const anySolo = sfxTracks.some((t: any) => t.isSolo);
      for (const track of sfxTracks) {
         if (!track.buffer) continue;
         
         const trimStart = track.trimStart || 0;
         const trimEnd = track.trimEnd || 0;
         const activeDuration = track.duration - trimStart - trimEnd;
         
         const playWindowStart = track.startTime;
         const playWindowEnd = track.startTime + activeDuration;
         
         if (playWindowEnd <= activeTrimStart) continue;
         if (playWindowStart >= activeTrimStart + exportDuration) continue;
         
         const source = offlineCtx.createBufferSource();
         source.buffer = track.buffer;
         
         const panner = offlineCtx.createStereoPanner();
         panner.pan.value = track.pan || 0;
         
         const gainNode = offlineCtx.createGain();
         let finalGain = track.volume;
         if (track.isMuted) finalGain = 0;
         if (anySolo && !track.isSolo) finalGain = 0;
         
         let offset = trimStart;
         let timeToStart = 0;
         let durationToPlay = activeDuration;
         
         if (activeTrimStart > track.startTime) {
            const elapsed = activeTrimStart - track.startTime;
            offset += elapsed;
            durationToPlay -= elapsed;
            
            if (elapsed < track.fadeIn) {
                gainNode.gain.setValueAtTime(0, timeToStart);
                gainNode.gain.linearRampToValueAtTime(finalGain, timeToStart + (track.fadeIn - elapsed));
            } else if (elapsed > activeDuration - track.fadeOut) {
                const fadeRemaining = activeDuration - elapsed;
                const curGain = finalGain * (fadeRemaining / track.fadeOut);
                gainNode.gain.setValueAtTime(curGain, timeToStart);
                gainNode.gain.linearRampToValueAtTime(0, timeToStart + fadeRemaining);
            } else {
                gainNode.gain.setValueAtTime(finalGain, timeToStart);
                gainNode.gain.setValueAtTime(finalGain, timeToStart + (activeDuration - elapsed - track.fadeOut));
                gainNode.gain.linearRampToValueAtTime(0, timeToStart + (activeDuration - elapsed));
            }
            source.start(timeToStart, offset, Math.min(exportDuration, durationToPlay));
         } else {
            timeToStart = track.startTime - activeTrimStart;
            gainNode.gain.setValueAtTime(0, timeToStart);
            gainNode.gain.linearRampToValueAtTime(finalGain, timeToStart + track.fadeIn);
            gainNode.gain.setValueAtTime(finalGain, timeToStart + activeDuration - track.fadeOut);
            gainNode.gain.linearRampToValueAtTime(0, timeToStart + activeDuration);
            source.start(timeToStart, trimStart, Math.min(exportDuration - timeToStart, durationToPlay));
         }
         
         source.connect(panner);
         panner.connect(gainNode);
         gainNode.connect(offlineCtx.destination);
      }`;

content = content.replace(/      const sfxTracks = pixabayStudioRef.current \? pixabayStudioRef.current.getTracks\(\) : \[\];[\s\S]*?      \}/, sfxExportLogic);

fs.writeFileSync('src/components/StemStudio.tsx', content);
