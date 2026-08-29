import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# 1. Vocal Transcript
# from: <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
#       <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection('transcript')}>
content = content.replace(
    '<div className="flex flex-col gap-3 border-t border-white/5 pt-4">\n             <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection(\'transcript\')}>',
    '<div className="flex flex-col gap-3 border-t border-white/5">\n             <div className="flex items-center justify-between border-b border-white/5 py-4 cursor-pointer group" onClick={() => toggleSection(\'transcript\')}>'
)

# 2. SUNO Lyric Tool
content = content.replace(
    '<div className="flex flex-col gap-3 border-t border-white/5 pt-4">\n             <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection(\'lyric\')}>',
    '<div className="flex flex-col gap-3 border-t border-white/5">\n             <div className="flex items-center justify-between border-b border-white/5 py-4 cursor-pointer group" onClick={() => toggleSection(\'lyric\')}>'
)

# 3. PHỐI KHÍ LYRIC
content = content.replace(
    '<div className="flex flex-col gap-3 border-t border-white/5 pt-4">\n        <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection(\'arrange\')}>',
    '<div className="flex flex-col gap-3 border-t border-white/5">\n        <div className="flex items-center justify-between border-b border-white/5 py-4 cursor-pointer group" onClick={() => toggleSection(\'arrange\')}>'
)

# 4. AI Cloud custom space
content = content.replace(
    '<div className="flex flex-col gap-3.5 border-t border-white/5 pt-5 pb-3">\n             <div \n                 className="flex justify-between items-center border-b border-white/5 pb-1.5 cursor-pointer group"',
    '<div className="flex flex-col gap-3.5 border-t border-white/5 pb-3">\n             <div \n                 className="flex justify-between items-center border-b border-white/5 py-4 cursor-pointer group"'
)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
