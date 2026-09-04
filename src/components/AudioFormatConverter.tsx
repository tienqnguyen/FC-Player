import React, { useState } from "react";
import { 
  FileAudio, 
  Download, 
  Loader2, 
  X, 
  Music, 
  Link as LinkIcon, 
  Search, 
  Sparkles, 
  Copy, 
  Check, 
  Key,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from "lucide-react";
import { convertClientSide } from "../utils/clientAudioConverter";

function cleanVietnameseFilename(title: string, ext: string, fallback = "suno_audio"): string {
  const cleaned = (title || "")
    .replace(/[\0\r\n\t]/g, " ")
    .replace(/[\/\\?%*:|"<>;,]/g, "")
    .trim() || fallback;
  return `${cleaned}.${ext}`;
}

export function AudioFormatConverter({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"file" | "suno">("file");
  const [targetFormat, setTargetFormat] = useState<"mp3" | "wav" | "m4a">("mp3");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sunoUrl, setSunoUrl] = useState("");
  const [sunoInfo, setSunoInfo] = useState<{title: string, mp4Url: string, m4aUrl?: string, sunoId: string, mangoDrm?: boolean} | null>(null);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("converted.mp3");

  // Official Suno WAV Export states
  const [showWavSection, setShowWavSection] = useState(false);
  const [sunoToken, setSunoToken] = useState("");
  const [isExportingWav, setIsExportingWav] = useState(false);
  const [wavStatus, setWavStatus] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setDownloadUrl(null);
      setErrorMsg(null);
      setProgress(0);
    }
  };

  const fetchInfo = async () => {
    if (!sunoUrl) return;
    const match = sunoUrl.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    if (!match) {
       setErrorMsg("Invalid Suno URL or ID. Please check the link.");
       return;
    }
    const sunoId = match[0];
    
    setIsFetchingInfo(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/suno-info?sunoId=${sunoId}`);
      if (!res.ok) throw new Error("Failed to fetch info from Suno");
      const data = await res.json();
      setSunoInfo(data);
      setDownloadName(cleanVietnameseFilename(data.title, targetFormat, sunoId));
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to fetch song info");
    } finally {
      setIsFetchingInfo(false);
    }
  };

  const startConversion = async () => {
    setIsConverting(true);
    setProgress(20);
    setErrorMsg(null);
    const ext = targetFormat === "wav" ? "wav" : targetFormat === "m4a" ? "m4a" : "mp3";

    try {
      if (activeTab === "file" && selectedFile) {
        const base = selectedFile.name.replace(/\.[^/.]+$/, "");
        setDownloadName(cleanVietnameseFilename(`${base}_${targetFormat}`, ext, "converted"));
        
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("format", targetFormat);
        setProgress(40);
        
        const response = await fetch(`/api/convert-audio?format=${targetFormat}`, {
          method: "POST",
          body: formData,
        });
        
        setProgress(80);
        if (!response.ok) {
           let errorText = "Không thể chuyển đổi âm thanh trên máy chủ";
           try {
              const raw = await response.text();
              try {
                 const errJson = JSON.parse(raw);
                 errorText = errJson.error || errJson.message || raw;
              } catch {
                 if (raw && !raw.trim().startsWith("<")) {
                    errorText = raw;
                 } else if (response.status === 413) {
                    errorText = "Dung lượng file quá lớn. Vui lòng chọn file nhỏ hơn (dưới 50MB).";
                 } else {
                    errorText = `Máy chủ gặp lỗi (${response.status}: ${response.statusText || "Lỗi xử lý file"})`;
                 }
              }
           } catch {
              errorText = response.statusText || errorText;
           }
           throw new Error(errorText);
        }
        const blob = await response.blob();
        setProgress(100);
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
      } else if (activeTab === "suno" && sunoInfo) {
        setDownloadName(cleanVietnameseFilename(sunoInfo.title, ext, sunoInfo.sunoId));
        setProgress(30);

        let convertedBlob: Blob | null = null;

        // 1. First attempt: High-speed server-side conversion with direct streamUrl
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);

          const response = await fetch("/api/convert-audio-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              sunoId: sunoInfo.sunoId,
              format: targetFormat,
              title: sunoInfo.title,
              streamUrl: sunoInfo.mp4Url
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            setProgress(90);
            convertedBlob = await response.blob();
          } else {
            console.warn(`Máy chủ phản hồi mã ${response.status}. Chuyển đổi dự phòng trực tiếp trên trình duyệt.`);
          }
        } catch (serverErr) {
          console.warn("Máy chủ quá tải hoặc không phản hồi kịp, chuyển đổi trực tiếp trên trình duyệt:", serverErr);
        }

        // 2. Resilient Fallback: In-browser Web Audio decoding and encoding (100% reliable)
        if (!convertedBlob) {
          setProgress(50);
          try {
            convertedBlob = await convertClientSide(sunoInfo.mp4Url, targetFormat, (p) => {
              setProgress(p);
            });
          } catch (clientErr: any) {
            console.error("Client-side conversion error:", clientErr);
            throw new Error(`Không thể chuyển đổi bài hát từ Suno: ${clientErr.message || "Vui lòng kiểm tra lại link bài hát."}`);
          }
        }

        setProgress(100);
        const url = URL.createObjectURL(convertedBlob);
        setDownloadUrl(url);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to convert file");
    } finally {
      setIsConverting(false);
    }
  };

  const handleFetchOfficialWav = async () => {
    if (!sunoInfo || !sunoToken) {
      setErrorMsg("Vui lòng dán Suno Token hoặc cookie __session để tải WAV gốc từ Suno");
      return;
    }
    setIsExportingWav(true);
    setWavStatus("Đang gửi yêu cầu tạo file WAV đến Suno...");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/suno-export-wav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sunoId: sunoInfo.sunoId,
          token: sunoToken.trim(),
        }),
      });

      let data: any = {};
      try {
        const raw = await res.text();
        try {
          data = JSON.parse(raw);
        } catch {
          data = { error: raw };
        }
      } catch {
        data = { error: res.statusText };
      }
      if (!res.ok) {
        throw new Error(data.error || "Không thể yêu cầu file WAV từ Suno");
      }

      if (data.wavUrl) {
        setWavStatus("Đã có link WAV! Đang chuẩn bị tải về...");
        const a = document.createElement("a");
        a.href = data.wavUrl;
        a.download = `${sunoInfo.title}.wav`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 1000);
        setWavStatus("Tải WAV thành công!");
      } else if (data.pending) {
        setWavStatus(data.message || "Suno đang xử lý render WAV. Vui lòng bấm thử lại sau 5-10 giây.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Lỗi khi lấy WAV từ Suno");
      setWavStatus(null);
    } finally {
      setIsExportingWav(false);
    }
  };

  const wavSnippet = `(async () => {
  const API = 'https://studio-api-prod.suno.com';
  const id = '${sunoInfo?.sunoId || "YOUR_SONG_ID"}';
  const token = await window.Clerk.session.getToken();
  const H = {
    accept: '*/*',
    'content-type': 'application/json',
    authorization: 'Bearer ' + token,
    'browser-token': JSON.stringify({ token: btoa(JSON.stringify({ timestamp: Date.now() })) }),
    'device-id': '00000000-0000-4000-8000-000000000001',
    origin: 'https://suno.com',
    referer: 'https://suno.com/',
  };
  await fetch(API + '/api/gen/' + id + '/convert_wav/', { method: 'POST', headers: H }).catch(() => null);
  const deadline = Date.now() + 4 * 60 * 1000;
  while (Date.now() < deadline) {
    const r = await fetch(API + '/api/gen/' + id + '/wav_file/', { headers: H }).catch(() => null);
    if (r && r.ok) {
      const j = await r.json();
      if (j.wav_file_url) {
        const a = document.createElement('a');
        a.href = j.wav_file_url;
        a.download = '${(sunoInfo?.title || "song").replace(/[/\\?%*:|"<>]/g, "-")}.wav';
        document.body.appendChild(a);
        a.click();
        a.remove();
        alert('Tải WAV thành công!');
        return;
      }
    }
    await new Promise(r => setTimeout(r, 4000));
  }
  alert('WAV timeout');
})();`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-[#11131A] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-white tracking-widest uppercase">
                Audio Converter & Suno Master WAV
              </h3>
              <p className="text-[10px] text-white/50">Làm sạch file M4A/MP4 và xuất MP3/WAV chuẩn</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          
          {/* Source Tabs */}
          <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5 shrink-0">
            <button
              onClick={() => { setActiveTab("file"); setDownloadUrl(null); }}
              className={`flex-1 text-[11px] font-bold uppercase tracking-wider py-2.5 rounded-lg transition-all ${activeTab === "file" ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/80"}`}
            >
              Upload File
            </button>
            <button
              onClick={() => { setActiveTab("suno"); setDownloadUrl(null); }}
              className={`flex-1 text-[11px] font-bold uppercase tracking-wider py-2.5 rounded-lg transition-all ${activeTab === "suno" ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/80"}`}
            >
              Suno URL
            </button>
          </div>

          {/* Target Format Selector */}
          <div className="flex items-center justify-between bg-black/30 p-2.5 rounded-xl border border-white/5">
            <span className="text-[11px] font-semibold text-white/70">Định dạng xuất:</span>
            <div className="flex gap-1.5 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => {
                  setTargetFormat("mp3");
                  if (sunoInfo) setDownloadName(cleanVietnameseFilename(sunoInfo.title, "mp3", sunoInfo.sunoId));
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                  targetFormat === "mp3"
                    ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : "bg-white/5 text-white/40 hover:text-white/80"
                }`}
              >
                MP3 (320k)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetFormat("wav");
                  if (sunoInfo) setDownloadName(cleanVietnameseFilename(sunoInfo.title, "wav", sunoInfo.sunoId));
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                  targetFormat === "wav"
                    ? "bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                    : "bg-white/5 text-white/40 hover:text-white/80"
                }`}
              >
                WAV (16-bit)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetFormat("m4a");
                  if (sunoInfo) setDownloadName(cleanVietnameseFilename(sunoInfo.title, "m4a", sunoInfo.sunoId));
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                  targetFormat === "m4a"
                    ? "bg-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.3)]"
                    : "bg-white/5 text-white/40 hover:text-white/80"
                }`}
              >
                M4A (Mango DRM)
              </button>
            </div>
          </div>

          {/* Tab 1: File Upload */}
          {activeTab === "file" && (
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/10 rounded-xl hover:border-emerald-500/40 hover:bg-white/5 transition-all cursor-pointer">
              <FileAudio className="w-8 h-8 text-white/30 mb-2" />
              <span className="text-[11px] text-white/70 font-medium">Bấm để chọn file M4A / MP4 / Audio cần sửa</span>
              <span className="text-[9px] text-white/40 mt-1">Hệ thống sẽ bóc tách siêu dữ liệu AI & sửa lỗi moov atom</span>
              <input 
                type="file" 
                accept="audio/*,video/mp4,.m4a,.mp4,.wav,.ogg" 
                className="hidden" 
                onChange={handleFileSelect}
              />
            </label>
          )}

          {/* Tab 2: Suno URL */}
          {activeTab === "suno" && (
             !sunoInfo ? (
               <div className="flex flex-col gap-2 p-4 border border-white/10 rounded-xl bg-white/5">
                 <div className="flex items-center gap-2 text-white/60 mb-1">
                   <LinkIcon className="w-4 h-4 text-emerald-400" />
                   <span className="text-[11px] font-medium">Dán link bài hát Suno hoặc ID</span>
                 </div>
                 <input
                   type="text"
                   placeholder="e.g. https://suno.com/song/2feba957-e976-4588-a734-9b42682e855f"
                   value={sunoUrl}
                   onChange={(e) => setSunoUrl(e.target.value)}
                   className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-[12px] text-white outline-none focus:border-emerald-500/50 transition-colors placeholder:text-white/20 font-mono"
                 />
                 <button
                   disabled={sunoUrl.length < 10 || isFetchingInfo}
                   onClick={fetchInfo}
                   className="mt-2 w-full flex items-center justify-center gap-2 font-black text-[11px] tracking-wider uppercase py-3 rounded-xl transition-all bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:bg-white/10 disabled:text-white/30 disabled:shadow-none"
                 >
                   {isFetchingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                   {isFetchingInfo ? "Đang tìm bài hát..." : "Lấy Thông Tin Bài Hát"}
                 </button>
               </div>
             ) : (
               <div className="flex flex-col gap-3 p-4 border border-white/10 rounded-xl bg-white/5">
                 <div className="flex items-center justify-between">
                   <div className="flex flex-col">
                     <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-0.5">Bài hát tìm thấy</span>
                     <span className="text-sm font-bold text-white line-clamp-1">{sunoInfo.title}</span>
                     <span className="text-[10px] text-white/40 font-mono mt-0.5">{sunoInfo.sunoId}</span>
                   </div>
                   <button 
                     onClick={() => {
                       setSunoInfo(null);
                       setShowWavSection(false);
                     }}
                     className="text-[10px] text-white/40 hover:text-white underline"
                   >
                     Đổi link khác
                   </button>
                 </div>

                 {/* Mango DRM Decryption notice */}
                 <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10.5px] text-amber-300">
                   <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                   <span>
                     <strong>Mango DRM Decryptor kích hoạt:</strong> Tự động giải mã khóa AES-GCM / AES-128-CTR từ Suno, trích xuất âm thanh 48kHz nguyên bản không suy hao.
                   </span>
                 </div>
                 
                 {/* Quick raw & decrypted links */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                   <a 
                     href={`/api/suno-decrypt?sunoId=${sunoInfo.sunoId}&download=true&title=${encodeURIComponent(sunoInfo.title)}`}
                     download={cleanVietnameseFilename(sunoInfo.title, "m4a", sunoInfo.sunoId)}
                     className="flex items-center justify-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase py-2.5 rounded-lg transition-colors"
                   >
                     <Download className="w-3.5 h-3.5 text-amber-400" /> Tải M4A Gốc Giải Mã (Original)
                   </a>
                   <a 
                     href={sunoInfo.mp4Url} 
                     target="_blank" rel="noopener noreferrer"
                     download={cleanVietnameseFilename(sunoInfo.title, "mp4", sunoInfo.sunoId)}
                     className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-bold uppercase py-2.5 rounded-lg transition-colors"
                   >
                     <Download className="w-3.5 h-3.5 text-pink-400" /> Tải Raw MP4 (Video)
                   </a>
                 </div>

                 {/* Official Suno WAV Tool Toggle */}
                 <div className="mt-2 pt-2 border-t border-white/10">
                   <button
                     onClick={() => setShowWavSection(!showWavSection)}
                     className="w-full flex items-center justify-between p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-left transition-colors group"
                   >
                     <div className="flex items-center gap-2">
                       <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                       <span className="text-[11px] font-bold text-indigo-300">Tải WAV Studio Lossless từ Suno</span>
                     </div>
                     {showWavSection ? <ChevronUp className="w-3.5 h-3.5 text-indigo-400" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />}
                   </button>

                   {showWavSection && (
                     <div className="flex flex-col gap-2.5 mt-2 p-3 bg-black/40 border border-indigo-500/20 rounded-lg animate-in fade-in duration-150">
                       <p className="text-[10px] text-white/70 leading-relaxed">
                         Suno hỗ trợ xuất file Master WAV 16-bit nguyên bản thông qua tài khoản của bạn:
                       </p>

                       {/* Option 1: Direct Token */}
                       <div className="flex flex-col gap-1.5 bg-white/5 p-2.5 rounded-lg border border-white/5">
                         <div className="flex items-center gap-1 text-[10px] font-semibold text-white/80">
                           <Key className="w-3 h-3 text-emerald-400" />
                           <span>Cách 1: Dán Suno Token (hoặc Cookie __session)</span>
                         </div>
                         <input
                           type="password"
                           placeholder="Dán token Bearer hoặc Clerk session token..."
                           value={sunoToken}
                           onChange={(e) => setSunoToken(e.target.value)}
                           className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-[10px] text-white outline-none focus:border-emerald-500 font-mono placeholder:text-white/20"
                         />
                         <button
                           disabled={!sunoToken.trim() || isExportingWav}
                           onClick={handleFetchOfficialWav}
                           className="mt-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase py-2 rounded transition-all disabled:opacity-40"
                         >
                           {isExportingWav ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                           {isExportingWav ? "Đang yêu cầu WAV..." : "Tạo & Tải Suno WAV"}
                         </button>
                         {wavStatus && (
                           <div className="text-[9px] text-indigo-300 bg-indigo-500/10 p-1.5 rounded text-center">
                             {wavStatus}
                           </div>
                         )}
                       </div>

                       {/* Option 2: Run Snippet */}
                       <div className="flex flex-col gap-1.5 bg-white/5 p-2.5 rounded-lg border border-white/5">
                         <div className="flex items-center justify-between">
                           <span className="text-[10px] font-semibold text-white/80">
                             Cách 2: Chạy trực tiếp trên Suno (F12 Console)
                           </span>
                           <button
                             onClick={() => {
                               navigator.clipboard.writeText(wavSnippet);
                               setCopiedSnippet(true);
                               setTimeout(() => setCopiedSnippet(false), 2000);
                             }}
                             className="text-[9px] font-bold uppercase text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                           >
                             {copiedSnippet ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                             {copiedSnippet ? "ĐÃ COPY!" : "COPY SCRIPT"}
                           </button>
                         </div>
                         <p className="text-[9px] text-white/50 leading-relaxed">
                           Mở F12 trên tab bài hát Suno của bạn, dán đoạn script này vào Console rồi bấm Enter. Trình duyệt sẽ tự động lấy token của bạn và tải file WAV về máy. Có thể mất lượt đếm download từ SUNO.
                         </p>
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             )
          )}

          {activeTab === "file" && selectedFile && (
            <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
              <span className="text-xs text-white/80 truncate pr-4">{selectedFile.name}</span>
              <span className="text-[10px] text-white/40 shrink-0">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs break-words">
              {errorMsg}
            </div>
          )}

          {/* Download ready button */}
          {downloadUrl ? (
            <div className="flex flex-col gap-2">
               <a 
                 href={downloadUrl}
                 download={downloadName}
                 className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] tracking-wider uppercase py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
               >
                 <Download className="w-4 h-4" />
                 Tải file {targetFormat.toUpperCase()} ({downloadName})
               </a>
               <button 
                 onClick={() => {
                     setDownloadUrl(null);
                     if (activeTab === "file") {
                        setSelectedFile(null);
                     } else {
                        setSunoInfo(null);
                        setSunoUrl("");
                     }
                     setProgress(0);
                 }}
                 className="w-full text-[10px] font-bold text-white/40 hover:text-white uppercase py-2"
               >
                 Chuyển đổi file khác
               </button>
            </div>
          ) : (
            (activeTab === "file" ? selectedFile : sunoInfo) && (
              <button
                disabled={isConverting}
                onClick={startConversion}
                className={`w-full flex items-center justify-center gap-2 font-black text-[11px] tracking-wider uppercase py-3.5 rounded-xl transition-all ${
                  isConverting 
                    ? 'bg-white/5 text-white/30 cursor-not-allowed'
                    : targetFormat === 'wav' 
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]' 
                      : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                }`}
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang xử lý sang {targetFormat.toUpperCase()} ({progress}%)
                  </>
                ) : (
                  `Làm sạch & Chuyển sang ${targetFormat.toUpperCase()}`
                )}
              </button>
            )
          )}

        </div>
      </div>
    </div>
  );
}
