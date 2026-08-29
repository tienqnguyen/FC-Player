import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# Replace original audio tag
old_audio_tag = """                              <audio 
                                 controls 
                                 src={originalAudioUrl} 
                                 className="w-full h-10 outline-none opacity-80 hover:opacity-100 transition-opacity" 
                                 onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                                 onPlay={() => setIsPlaying(true)}
                                 onPause={() => setIsPlaying(false)}
                              />"""

new_audio_tag = """                              <audio 
                                 ref={originalAudioElementRef}
                                 controls 
                                 src={originalAudioUrl} 
                                 className="w-full h-10 outline-none opacity-80 hover:opacity-100 transition-opacity" 
                                 onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                                 onPlay={() => { 
                                   setIsPlaying(true); 
                                   initAudio(); 
                                   if (audioContextRef.current?.state === 'suspended') {
                                     audioContextRef.current.resume();
                                   }
                                 }}
                                 onPause={() => setIsPlaying(false)}
                              />"""

if old_audio_tag in content:
    content = content.replace(old_audio_tag, new_audio_tag)
    with open('src/components/StemStudio.tsx', 'w') as f:
        f.write(content)
    print("Replaced audio tag")
else:
    print("Could not find audio tag")
