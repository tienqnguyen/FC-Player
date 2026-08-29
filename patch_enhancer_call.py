import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

old_call = "{showAudioEnhancer && <AudioEnhancer onClose={() => setShowAudioEnhancer(false)} />}"
new_call = """{showAudioEnhancer && (
         <AudioEnhancer 
           onClose={() => setShowAudioEnhancer(false)} 
           audioCtx={audioContextRef.current}
           inputNode={masterPluginInputRef.current}
           outputNode={masterPluginOutputRef.current}
         />
       )}"""

if old_call in content:
    content = content.replace(old_call, new_call)
    with open('src/components/StemStudio.tsx', 'w') as f:
        f.write(content)
    print("Patched AudioEnhancer call")
else:
    print("Could not find AudioEnhancer call")
