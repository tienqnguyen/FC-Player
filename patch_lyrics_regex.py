import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# 1. Idle block regex
pattern_idle = re.compile(
    r'\{\s*\(\s*cohereTranscript\s*\|\|\s*isTranscribing\s*\)\s*&&\s*\(\s*<div[^>]*>\s*\{subtitlesUI\}\s*</div>\s*\)\s*\}\s*<div[^>]*>\s*\{sunoLyricUI\}\s*\{phoiKhiLyricUI\}\s*</div>', 
    re.MULTILINE
)

if pattern_idle.search(content):
    content = pattern_idle.sub('', content)
    print("Removed from idle block using regex")
else:
    print("Could not find idle block using regex")

# 2. Ready block regex
pattern_ready = re.compile(
    r'\{sunoLyricUI\}\s*\{phoiKhiLyricUI\}\s*\{subtitlesUI\}',
    re.MULTILINE
)
if pattern_ready.search(content):
    content = pattern_ready.sub('', content)
    print("Removed from ready block using regex")
else:
    print("Could not find ready block using regex")

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
