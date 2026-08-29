import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

old_code = """                 {/* RIGHT: Title and Status */}
                 <div className="flex-1 relative bg-black/40 z-30 p-5 flex flex-col justify-end items-end text-right overflow-hidden">
                    {coverUrl && (
                        <>
                           <div className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm transition-transform duration-[10s]" style={{ backgroundImage: `url(${coverUrl})` }} />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                        </>
                    )}"""

new_code = """                 {/* RIGHT: Title and Status */}
                 <div className="flex-1 relative bg-black/20 z-30 p-5 flex flex-col justify-end items-end text-right overflow-hidden">
                    {coverUrl && (
                        <>
                           <div className="absolute inset-0 bg-cover bg-center opacity-40 blur-[2px] transition-transform duration-[10s]" style={{ backgroundImage: `url(${coverUrl})` }} />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                        </>
                    )}"""

if old_code in content:
    content = content.replace(old_code, new_code)
    print("Replaced!")
else:
    print("Could not find the target code block.")

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)

