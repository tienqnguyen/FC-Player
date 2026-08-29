import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

old_code = """                      )}
                      {originalAudioUrl && !isTrimmingBeforeExtract && renderPluginsRack()}
                   </div>
                </div>
             ) : stemmixStatus === "loading" ? ("""

new_code = """                      )}
                   </div>
                </div>
             ) : stemmixStatus === "loading" ? ("""

content = content.replace(old_code, new_code)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
print("Patched homepage")
