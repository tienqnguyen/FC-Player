import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# 1. Inject the states
state_injection = """  const [active8D, setActive8D] = useState<boolean>(false);
  
  // FC Plugin Bypass States
  const [fcAudioBypassed, setFcAudioBypassed] = useState(true);
  const [fcOneKnobBypassed, setFcOneKnobBypassed] = useState(true);
  const [fcStudioBypassed, setFcStudioBypassed] = useState(true);"""

content = content.replace('  const [active8D, setActive8D] = useState<boolean>(false);', state_injection)


# 2. Fix the props at the bottom
pattern_audio = r'<AudioEnhancer\s+isOpen=\{showAudioEnhancer\}\s+onClose=\{\(\) => setShowAudioEnhancer\(false\)\}\s+audioCtx=\{audioContextRef\.current\}\s+inputNode=\{masterPluginInputRef\.current\}\s+outputNode=\{masterPluginOutputRef\.current\}\s+/>'

replacement_audio = """<AudioEnhancer 
         isOpen={showAudioEnhancer}
         onClose={() => setShowAudioEnhancer(false)} 
         audioCtx={audioContextRef.current}
         inputNode={masterPluginInputRef.current}
         outputNode={masterPluginOutputRef.current}
         isBypassed={fcAudioBypassed}
         onBypassChange={setFcAudioBypassed}
       />"""

content = re.sub(pattern_audio, replacement_audio, content)

pattern_one = r'<FcOneKnobPro\s+isOpen=\{showFcOneKnobPro\}\s+onClose=\{\(\) => setShowFcOneKnobPro\(false\)\}\s+audioCtx=\{audioContextRef\.current\}\s+inputNode=\{masterPluginInputRef\.current\}\s+outputNode=\{masterPluginOutputRef\.current\}\s+/>'

replacement_one = """<FcOneKnobPro 
         isOpen={showFcOneKnobPro}
         onClose={() => setShowFcOneKnobPro(false)} 
         audioCtx={audioContextRef.current}
         inputNode={masterPluginInputRef.current}
         outputNode={masterPluginOutputRef.current}
         isBypassed={fcOneKnobBypassed}
         onBypassChange={setFcOneKnobBypassed}
       />"""

content = re.sub(pattern_one, replacement_one, content)

pattern_studio = r'<FcStudioFx\s+isOpen=\{showFcStudioFx\}\s+onClose=\{\(\) => setShowFcStudioFx\(false\)\}\s+audioCtx=\{audioContextRef\.current\}\s+inputNode=\{masterPluginInputRef\.current\}\s+outputNode=\{masterPluginOutputRef\.current\}\s+/>'

replacement_studio = """<FcStudioFx 
         isOpen={showFcStudioFx}
         onClose={() => setShowFcStudioFx(false)} 
         audioCtx={audioContextRef.current}
         inputNode={masterPluginInputRef.current}
         outputNode={masterPluginOutputRef.current}
         isBypassed={fcStudioBypassed}
         onBypassChange={setFcStudioBypassed}
       />"""

content = re.sub(pattern_studio, replacement_studio, content)

# Also fix the duplicate import 'Zap'
content = content.replace("import { Play, Pause, FastForward, Rewind, Download, Share2, UploadCloud, VolumeX, Mic, Mic2, FileAudio, Disc, Plus, Trash2, X, Settings, Settings2, Sliders, Activity, Speaker, CloudLightning, Waves, TreePine, Zap, Search, Loader2, Music, Crown, Cloud, Cpu, Sparkles, ChevronRight, ChevronDown, Check, Zap as ZapIcon, Maximize2, Minimize2, Type, Subscript, Languages, Video, FileText, Image as ImageIcon, Volume2, TypeIcon } from 'lucide-react';", "import { Play, Pause, FastForward, Rewind, Download, Share2, UploadCloud, VolumeX, Mic, Mic2, FileAudio, Disc, Plus, Trash2, X, Settings, Settings2, Sliders, Activity, Speaker, CloudLightning, Waves, TreePine, Zap, Search, Loader2, Music, Crown, Cloud, Cpu, Sparkles, ChevronRight, ChevronDown, Check, Maximize2, Minimize2, Type, Subscript, Languages, Video, FileText, Image as ImageIcon, Volume2, TypeIcon } from 'lucide-react';")

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)

