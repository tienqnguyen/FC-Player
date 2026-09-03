import React, { useState, useRef } from "react";
import { FileAudio, Download, Loader2, X, Music } from "lucide-react";

export function AudioFormatConverter({ onClose }: { onClose: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setDownloadUrl(null);
      setErrorMsg(null);
      setProgress(0);
    }
  };

  const startConversion = async () => {
    if (!selectedFile) return;
    setIsConverting(true);
    setProgress(20);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      setProgress(40);
      
      const response = await fetch("/api/convert-audio", {
        method: "POST",
        body: formData,
      });

      setProgress(80);

      if (!response.ok) {
         let errorText = "Conversion failed on server";
         try {
            const errJson = await response.json();
            errorText = errJson.error || errorText;
         } catch(e) {
            errorText = await response.text() || errorText;
         }
         throw new Error(errorText);
      }

      const blob = await response.blob();
      setProgress(100);
      
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to convert file");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#11131A] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-emerald-400" />
            <h3 className="text-[12px] font-bold text-white tracking-widest uppercase">M4A to MP3 Converter</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/10 rounded-xl hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer">
            <FileAudio className="w-8 h-8 text-white/30 mb-2" />
            <span className="text-[11px] text-white/60 font-medium">Click to select an M4A/Audio file</span>
            <input 
              type="file" 
              accept="audio/*,.m4a,.wav,.ogg" 
              className="hidden" 
              onChange={handleFileSelect}
            />
          </label>

          {selectedFile && (
            <div className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/5">
              <span className="text-xs text-white/80 truncate pr-4">{selectedFile.name}</span>
              <span className="text-[10px] text-white/40 shrink-0">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
              {errorMsg}
            </div>
          )}

          {downloadUrl ? (
            <div className="flex flex-col gap-2">
               <a 
                 href={downloadUrl}
                 download={selectedFile?.name.replace(/\.[^/.]+$/, "") + "_converted.mp3"}
                 className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] tracking-wider uppercase py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
               >
                 <Download className="w-4 h-4" />
                 Download MP3
               </a>
               <button
                  onClick={() => {
                      setDownloadUrl(null);
                      setSelectedFile(null);
                      setProgress(0);
                  }}
                  className="w-full text-[10px] font-bold text-white/40 hover:text-white uppercase py-2"
               >
                  Convert Another File
               </button>
            </div>
          ) : (
            <button
              disabled={!selectedFile || isConverting}
              onClick={startConversion}
              className={`w-full flex items-center justify-center gap-2 font-black text-[11px] tracking-wider uppercase py-3 rounded-xl transition-all ${
                !selectedFile || isConverting 
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Converting ({progress}%)
                </>
              ) : (
                "Convert to MP3"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
