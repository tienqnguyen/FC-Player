import re

with open('src/components/FcStudioFx.tsx', 'r') as f:
    content = f.read()

# Props update
content = re.sub(
    r'export interface FcStudioFxProps \{([\s\S]*?)\}',
    r'export interface FcStudioFxProps {\1  isBypassed: boolean;\n  onBypassChange: (b: boolean) => void;\n}',
    content
)

content = content.replace(
    'export function FcStudioFx({ onClose, isOpen = true, audioCtx, inputNode, outputNode }: FcStudioFxProps) {',
    'export function FcStudioFx({ onClose, isOpen = true, audioCtx, inputNode, outputNode, isBypassed, onBypassChange }: FcStudioFxProps) {\n  const bypass = isBypassed;\n  const setBypass = onBypassChange;'
)

# Header update
old_header = """        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#121319] border-b border-white/5 shrink-0 relative">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-teal-500/0"></div>
          <h2 className="text-white font-black tracking-widest text-xl flex items-center gap-2">
            <span className="text-emerald-500">FC</span> STUDIO FX <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded ml-1">PRO PACK</span>
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>"""

new_header = """        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#121319] border-b border-white/5 shrink-0 relative">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-teal-500/0"></div>
          <h2 className="text-white font-black tracking-widest text-xl flex items-center gap-2">
            <span className="text-emerald-500">FC</span> STUDIO FX <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded ml-1">PRO PACK</span>
          </h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setCompThresh(-24); setCompRatio(4); setCompAttack(15); setCompMakeup(2);
                setDeEsser(40); setAir(50); setExciter(20);
                setModRate(2); setModDepth(60);
                setStereoWidth(130); setLimitThresh(-2);
                setCompActive(true); setVocalActive(true); setModActive(false); setMasterActive(true);
              }}
              className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
            >
              Reset All
            </button>
            <div className="w-px h-6 bg-white/10"></div>
            <button 
              onClick={() => setBypass(!bypass)} 
              className={`px-6 py-1.5 rounded-md text-xs font-black tracking-widest transition-all border ${!bypass ? 'bg-black/50 text-white/50 border-white/10 hover:text-white hover:border-white/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'}`}
            >
              {bypass ? 'BYPASSED' : 'ACTIVE'}
            </button>
            <button onClick={onClose} className="text-white/40 hover:text-white ml-2 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>"""

content = content.replace(old_header, new_header)

# Wrapper class
content = content.replace(
    """<div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6" style={{ background: 'radial-gradient(circle at 50% 0%, #2a2d3a 0%, #1a1b23 100%)' }}>""",
    """<div className={`p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 ${bypass ? 'opacity-40 grayscale-[0.8] pointer-events-none' : ''} transition-all duration-500`} style={{ background: 'radial-gradient(circle at 50% 0%, #2a2d3a 0%, #1a1b23 100%)' }}>"""
)

# Replace routing
old_routing = """    // Serial Routing
    inputNode.connect(mod1.In);
    mod1.Out.connect(mod2.In);
    mod2.Out.connect(mod3.In);
    mod3.Out.connect(mod4.In);
    mod4.Out.connect(outputNode);"""

new_routing = """    // Disconnect any existing routing to prevent duplicates
    try { inputNode.disconnect(); } catch (e) {}
    try { mod1.Out.disconnect(); } catch (e) {}
    try { mod2.Out.disconnect(); } catch (e) {}
    try { mod3.Out.disconnect(); } catch (e) {}
    try { mod4.Out.disconnect(); } catch (e) {}

    // Serial Routing
    if (bypass) {
        inputNode.connect(outputNode);
    } else {
        inputNode.connect(mod1.In);
        mod1.Out.connect(mod2.In);
        mod2.Out.connect(mod3.In);
        mod3.Out.connect(mod4.In);
        mod4.Out.connect(outputNode);
    }"""

content = content.replace(old_routing, new_routing)

# Update the useEffect dependencies for routing
old_deps = "  }, [audioCtx, inputNode, outputNode]);"
new_deps = "  }, [audioCtx, inputNode, outputNode, bypass]);"
content = content.replace(old_deps, new_deps, 1) # Only replace the first one which is the setup useEffect

with open('src/components/FcStudioFx.tsx', 'w') as f:
    f.write(content)
