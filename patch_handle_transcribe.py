import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# Add ID to bottom container
content = content.replace(
    '<div className="flex flex-col w-full gap-4 pt-4 border-t border-white/5">',
    '<div id="lyrics-bottom-container" className="flex flex-col w-full gap-4 pt-4 border-t border-white/5">'
)

# Modify handleCohereTranscribe
old_func = """  const handleCohereTranscribe = async () => {
    const audioUrlToTranscribe = originalAudioUrl || (stemUrls && stemUrls["vocals"]);
    if (!audioUrlToTranscribe) return;

    try {
      setIsTranscribing(true);
      setTranscriptionStatus('Uploading to Cohere ASR...');"""

new_func = """  const handleCohereTranscribe = async () => {
    const audioUrlToTranscribe = originalAudioUrl || (stemUrls && stemUrls["vocals"]);
    if (!audioUrlToTranscribe) return;

    try {
      setIsTranscribing(true);
      setTranscriptionStatus('Uploading to Cohere ASR...');
      setTimeout(() => {
         const el = document.getElementById('lyrics-bottom-container');
         if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);"""

if old_func in content:
    content = content.replace(old_func, new_func)
    print("Patched handleCohereTranscribe")
else:
    print("Could not find old_func")

# Update button text at top
old_btn = """                                    {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Type className="w-4 h-4 mr-2" />}
                                    Lyrics
                                 </button>"""

new_btn = """                                    {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Type className="w-4 h-4 mr-2" />}
                                    AI Transcript
                                 </button>"""

if old_btn in content:
    content = content.replace(old_btn, new_btn)
    print("Patched button text")
else:
    print("Could not find button text")

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
