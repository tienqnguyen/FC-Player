import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# Let's search with regex to tolerate spaces
pattern = re.compile(r'(\{sunoLyricUI\}\s*\{phoiKhiLyricUI\}\s*</div>\s*</div>\s*\)\})', re.MULTILINE)
matches = pattern.findall(content)
if len(matches) == 1:
    content = content.replace(matches[0], matches[0] + "\n                      {originalAudioUrl && !isTrimmingBeforeExtract && renderPluginsRack()}")
    with open('src/components/StemStudio.tsx', 'w') as f:
        f.write(content)
    print("Patched with regex!")
else:
    print(f"Found {len(matches)} matches, expected 1.")
