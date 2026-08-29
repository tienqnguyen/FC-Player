import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# 1. Add state for showSystemWarning
state_injection = """  const [showAiCloudConfig, setShowAiCloudConfig] = useState(false);
  const [showSystemWarning, setShowSystemWarning] = useState(true);"""
content = content.replace('  const [showAiCloudConfig, setShowAiCloudConfig] = useState(false);', state_injection)

# 2. Update the Warning block
old_warning = """                         <div className="w-full max-w-xl mb-8 p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-[11px] sm:text-xs leading-relaxed text-center backdrop-blur-md shadow-lg flex items-start sm:items-center justify-center gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                            <p className="text-left sm:text-center">
                               <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] sm:text-[11px] block sm:inline mr-1">⚠️ Cảnh báo hệ thống:</span>
                               Không hỗ trợ tách STEM với tệp âm thanh quá dài. Tuyệt đối không dùng công cụ tự động để cào/tải nhạc hàng loạt — hành vi này sẽ gây <strong>kiệt bộ nhớ (RAM)</strong>, <strong>quá tải băng thông</strong> và dẫn tới việc <strong>IP của server bị khóa bởi Tiktok hay YT. Không sử dụng search YT quá nhiều dẫn đến hết memory của Free server</strong>.
                            </p>
                         </div>"""

new_warning = """                         {showSystemWarning && (
                            <div className="w-full max-w-xl mb-8 p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-[11px] sm:text-xs leading-relaxed text-center backdrop-blur-md shadow-lg flex items-start sm:items-center justify-center gap-2.5 relative group">
                               <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                               <p className="text-left sm:text-center pr-6">
                                  <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] sm:text-[11px] block sm:inline mr-1">⚠️ Cảnh báo hệ thống:</span>
                                  Không hỗ trợ tách STEM với tệp âm thanh quá dài. Tuyệt đối không dùng công cụ tự động để cào/tải nhạc hàng loạt — hành vi này sẽ gây <strong>kiệt bộ nhớ (RAM)</strong>, <strong>quá tải băng thông</strong> và dẫn tới việc <strong>IP của server bị khóa bởi Tiktok hay YT. Không sử dụng search YT quá nhiều dẫn đến hết memory của Free server</strong>.
                               </p>
                               <button 
                                  onClick={() => setShowSystemWarning(false)}
                                  className="absolute right-2 top-2 p-1 text-amber-400/50 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
                                  title="Ẩn cảnh báo"
                               >
                                  <X className="w-3.5 h-3.5" />
                               </button>
                            </div>
                         )}"""

content = content.replace(old_warning, new_warning)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
