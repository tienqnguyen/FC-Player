const fs = require('fs');
let content = fs.readFileSync('src/components/PixabayStudio.tsx', 'utf8');

const rescheduleEffect = `  // Reschedule tracks if their structural properties change while playing
  const prevTracksRef = useRef<SfxTrack[]>([]);
  useEffect(() => {
    if (isPlaying) {
       tracks.forEach(track => {
          const prev = prevTracksRef.current.find(t => t.id === track.id);
          // If it's new, or if timing/buffer changed, reschedule!
          if (!prev || prev.buffer !== track.buffer || prev.startTime !== track.startTime || prev.trimStart !== track.trimStart || prev.trimEnd !== track.trimEnd || prev.fadeIn !== track.fadeIn || prev.fadeOut !== track.fadeOut) {
             const masterAudio = primaryAudioRef?.current?.[primaryStem || ''];
             const masterTime = masterAudio ? masterAudio.currentTime : 0;
             scheduleTrack(track, masterTime);
          }
       });
    }
    prevTracksRef.current = tracks;
  }, [tracks, isPlaying, primaryAudioRef, primaryStem, scheduleTrack]);`;

// Insert it right before `return (`
content = content.replace(/  return \(/, rescheduleEffect + '\n  return (');

fs.writeFileSync('src/components/PixabayStudio.tsx', content);
