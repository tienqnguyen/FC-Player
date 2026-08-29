import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

search_str = """                           <div className="w-full text-left">
                                 {sunoLyricUI}
                                 {phoiKhiLyricUI}
                           </div>
                        </div>
                      )}"""

if search_str in content:
    replacement = search_str + "\n                      {originalAudioUrl && !isTrimmingBeforeExtract && renderPluginsRack()}"
    content = content.replace(search_str, replacement)
    with open('src/components/StemStudio.tsx', 'w') as f:
        f.write(content)
    print("Injected into idle state successfully.")
else:
    print("Could not find the injection point.")
