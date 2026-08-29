import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

old_render = """       {showAudioEnhancer && (
         <AudioEnhancer 
           onClose={() => setShowAudioEnhancer(false)} 
           audioCtx={audioContextRef.current}
           inputNode={masterPluginInputRef.current}
           outputNode={masterPluginOutputRef.current}
         />
       )}"""

new_render = """       <AudioEnhancer 
         isOpen={showAudioEnhancer}
         onClose={() => setShowAudioEnhancer(false)} 
         audioCtx={audioContextRef.current}
         inputNode={masterPluginInputRef.current}
         outputNode={masterPluginOutputRef.current}
       />"""

if old_render in content:
    content = content.replace(old_render, new_render)
    with open('src/components/StemStudio.tsx', 'w') as f:
        f.write(content)
    print("Patched StemStudio.tsx persistence")
else:
    print("Could not find AudioEnhancer render block in StemStudio")

with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content2 = f.read()

content2 = content2.replace("interface AudioEnhancerProps {\n  onClose: () => void;", "interface AudioEnhancerProps {\n  onClose: () => void;\n  isOpen?: boolean;")
content2 = content2.replace("export function AudioEnhancer({ onClose, audioCtx, inputNode, outputNode }: AudioEnhancerProps) {", "export function AudioEnhancer({ onClose, isOpen = true, audioCtx, inputNode, outputNode }: AudioEnhancerProps) {")

return_idx = content2.find("return (\n    <div className=\"fixed inset-0 z-50 flex items-center justify-center p-4\">")
if return_idx != -1:
    content2 = content2[:return_idx] + "if (!isOpen) return null;\n\n  " + content2[return_idx:]
    with open('src/components/AudioEnhancer.tsx', 'w') as f:
        f.write(content2)
    print("Patched AudioEnhancer.tsx persistence")
else:
    print("Could not find return block in AudioEnhancer")

