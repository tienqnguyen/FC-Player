import re

with open("src/components/StemStudio.tsx", "r") as f:
    content = f.read()

# Add import
content = content.replace("import { transcribeAudio } from '../utils/whisperTranscriber';", "import { transcribeAudio } from '../utils/whisperTranscriber';\nimport { transcribeWithCohere } from '../utils/cohereTranscriber';\nimport { Copy, FileText, Edit2, Save } from 'lucide-react';")

# Add state
state_code = """  const [cohereTranscript, setCohereTranscript] = useState<string | null>(null);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);"""
content = re.sub(r"const \[subtitles, setSubtitles\] = useState<any\[\] \| null>\(null\);", r"const [subtitles, setSubtitles] = useState<any[] | null>(null);\n" + state_code, content)

# Add handleCohere
cohere_handler = """
  const handleCohereTranscribe = async () => {
    if (!stemUrls || !stemUrls['vocals']) return;
    try {
      setIsTranscribing(true);
      setTranscriptionStatus('Uploading to Cohere ASR...');
      
      const text = await transcribeWithCohere(stemUrls['vocals'], "vi");
      setCohereTranscript(text);
      setTranscriptionStatus('Done!');
    } catch (e: any) {
      console.error('Cohere error', e);
      setTranscriptionStatus(`Error: ${e.message}`);
    } finally {
      setTimeout(() => {
        setIsTranscribing(false);
        setTranscriptionStatus('');
      }, 5000);
    }
  };
  
  const handleCopyTranscript = () => {
      if (cohereTranscript) navigator.clipboard.writeText(cohereTranscript);
  };
  
  const handleExportSRT = () => {
      if (!cohereTranscript) return;
      
      // Simple pseudo-SRT generation since we don't have timestamps from Cohere
      const lines = cohereTranscript.split(/(?<=[.?!])\\s+/).filter(l => l.trim().length > 0);
      let srtContent = "";
      let startTime = 0;
      const durationPerLine = (duration || 60) / (lines.length || 1);
      
      const formatTime = (secs: number) => {
          const h = Math.floor(secs / 3600).toString().padStart(2, '0');
          const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
          const s = Math.floor(secs % 60).toString().padStart(2, '0');
          const ms = Math.floor((secs % 1) * 1000).toString().padStart(3, '0');
          return `${h}:${m}:${s},${ms}`;
      };
      
      lines.forEach((line, i) => {
          srtContent += `${i + 1}\\n`;
          srtContent += `${formatTime(startTime)} --> ${formatTime(startTime + durationPerLine)}\\n`;
          srtContent += `${line}\\n\\n`;
          startTime += durationPerLine;
      });
      
      const blob = new Blob([srtContent], { type: 'text/srt' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${songTitle || 'transcript'}.srt`;
      a.click();
  };
"""

content = content.replace("const handleExportMix = async () => {", cohere_handler + "\n  const handleExportMix = async () => {")

# Add UI button for Cohere next to WebGPU Whisper
whisper_btn = """<button
                                   onClick={handleGenerateSubtitles}
                                   className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-wider transition-all duration-300 border bg-transparent border-transparent text-white/40 hover:text-white hover:bg-white/5 relative"
                                   title="Transcribe Vocals (WebGPU Whisper)"
                                >
                                   {isTranscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Type className="w-3.5 h-3.5" />}
                                </button>"""

cohere_btn = whisper_btn + """
                                <button
                                   onClick={handleCohereTranscribe}
                                   className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-wider transition-all duration-300 border bg-transparent border-transparent text-white/40 hover:text-amber-400 hover:bg-white/5 relative"
                                   title="Transcribe with Cohere (Better Vietnamese)"
                                >
                                   {isTranscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Sparkles className="w-3.5 h-3.5" />}
                                </button>"""

content = content.replace(whisper_btn, cohere_btn)


# Subtitles UI
subs_ui = """{/* SUBTITLES UI */}
          {(isTranscribing || subtitles || cohereTranscript) && (
             <div className="flex flex-col gap-3.5 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                   <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 uppercase"><Type className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Vocal Transcript</h3>
                   <div className="flex items-center gap-2">
                       {cohereTranscript && !isEditingTranscript && (
                           <>
                               <button onClick={() => setIsEditingTranscript(true)} className="text-white/40 hover:text-white text-[10px] uppercase font-bold flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit</button>
                               <button onClick={handleCopyTranscript} className="text-white/40 hover:text-white text-[10px] uppercase font-bold flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
                               <button onClick={handleExportSRT} className="text-amber-400/70 hover:text-amber-400 text-[10px] uppercase font-bold flex items-center gap-1"><FileText className="w-3 h-3" /> Export SRT</button>
                           </>
                       )}
                       {cohereTranscript && isEditingTranscript && (
                           <button onClick={() => setIsEditingTranscript(false)} className="text-amber-400 hover:text-amber-300 text-[10px] uppercase font-bold flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
                       )}
                       {isTranscribing && <span className="text-[9px] font-mono font-medium text-amber-400 animate-pulse">{transcriptionStatus}</span>}
                   </div>
                </div>
                
                {cohereTranscript && isEditingTranscript && (
                    <textarea 
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white/90 text-sm leading-relaxed custom-scrollbar focus:outline-none focus:border-amber-400/50 min-h-[200px]"
                        value={cohereTranscript}
                        onChange={(e) => setCohereTranscript(e.target.value)}
                    />
                )}
                
                {cohereTranscript && !isEditingTranscript && (
                    <div className="bg-black/20 border border-white/5 p-4 rounded-xl flex flex-col gap-2 max-h-64 overflow-y-auto custom-scrollbar shadow-inner text-left">
                        <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{cohereTranscript}</p>
                    </div>
                )}

                {!cohereTranscript && subtitles && subtitles.length > 0 && (
                   <div className="bg-black/20 border border-white/5 p-4 rounded-xl flex flex-col gap-2 max-h-64 overflow-y-auto custom-scrollbar shadow-inner text-center md:text-left">
                      {subtitles.map((sub: any, idx: number) => (
                         <p key={idx} className="text-white/80 text-sm leading-relaxed mb-1 font-medium hover:text-white transition-colors cursor-pointer" onClick={() => {
                            handleSeek({ target: { value: sub.timestamp[0] } } as any);
                         }}>
                            <span className="text-amber-400/50 text-[10px] font-mono mr-2 hidden sm:inline-block w-20">[{sub.timestamp[0].toFixed(1)}s - {sub.timestamp[1]?.toFixed(1) || 'end'}s]</span>
                            {sub.text}
                         </p>
                      ))}
                   </div>
                )}
                {!cohereTranscript && subtitles && subtitles.length === 0 && !isTranscribing && (
                   <p className="text-white/40 text-xs italic">No speech detected.</p>
                )}
             </div>
          )}"""

content = re.sub(r"\{\/\* SUBTITLES UI \*\/}.*?(?=\{\/\* MASTER FX \*\/})", subs_ui + "\n\n          ", content, flags=re.DOTALL)

with open("src/components/StemStudio.tsx", "w") as f:
    f.write(content)
