const fs = require('fs');
let content = fs.readFileSync('src/components/PixabayStudio.tsx', 'utf8');

// We need a ref for tracks to avoid dependency loops in scheduleTrack
const signature = "const PixabayStudio = React.forwardRef(({ onClose, isPlaying, primaryAudioRef, primaryStem, masterDuration }: PixabayStudioProps, ref) => {";
content = content.replace(signature, signature + "\n  const tracksRef = useRef<SfxTrack[]>([]);");

content = content.replace(/  const \[tracks, setTracks\] = useState<SfxTrack\[\]>\(\[\]\);/, `  const [tracks, setTracks] = useState<SfxTrack[]>([]);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);`);

// Update scheduleTrack to read anySolo from tracksRef
content = content.replace(/    if \(anySolo && !track\.isSolo\) finalGain = 0;/, `    const _anySolo = tracksRef.current.some(t => t.isSolo);
    if (_anySolo && !track.isSolo) finalGain = 0;`);

content = content.replace(/  \}, \[anySolo, stopTrack\]\);/, `  }, [stopTrack]);`);

// Fix the playback useEffect to only run when isPlaying changes!
content = content.replace(/  useEffect\(\(\) => \{\n    if \(isPlaying && tracks\.length > 0\) \{\n      const masterAudio = primaryAudioRef\?\.current\?\.\[primaryStem \|\| ''\];\n      const masterTime = masterAudio \? masterAudio\.currentTime : 0;\n      \n      tracks\.forEach\(t => scheduleTrack\(t, masterTime\)\);\n    \} else \{\n      stopAll\(\);\n    \}\n  \}, \[isPlaying, tracks, primaryAudioRef, primaryStem, scheduleTrack, stopAll\]\);/, `  const prevIsPlaying = useRef(false);
  useEffect(() => {
    if (isPlaying && !prevIsPlaying.current) {
      const masterAudio = primaryAudioRef?.current?.[primaryStem || ''];
      const masterTime = masterAudio ? masterAudio.currentTime : 0;
      tracksRef.current.forEach(t => scheduleTrack(t, masterTime));
    } else if (!isPlaying && prevIsPlaying.current) {
      stopAll();
    }
    prevIsPlaying.current = !!isPlaying;
  }, [isPlaying, primaryAudioRef, primaryStem, scheduleTrack, stopAll]);`);

fs.writeFileSync('src/components/PixabayStudio.tsx', content);
