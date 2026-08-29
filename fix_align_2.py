import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# Replace all occurrences of this pattern:
# <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
#   <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group"

content = content.replace(
    '<div className="flex flex-col gap-3 border-t border-white/5 pt-4">\n         <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group"',
    '<div className="flex flex-col gap-3 border-t border-white/5">\n         <div className="flex items-center justify-between border-b border-white/5 py-4 cursor-pointer group"'
)

# And for Master EQ, Overlay Sound which use "justify-between items-center" instead of "items-center justify-between"
content = content.replace(
    '<div className="flex flex-col gap-3 border-t border-white/5 pt-4">\n              <div className="flex justify-between items-center border-b border-white/5 pb-1.5 cursor-pointer group"',
    '<div className="flex flex-col gap-3 border-t border-white/5">\n              <div className="flex justify-between items-center border-b border-white/5 py-4 cursor-pointer group"'
)

# And for Master FX (which uses items-center justify-between)
content = content.replace(
    '<div className="flex flex-col gap-3 border-t border-white/5 pt-4">\n             <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group"',
    '<div className="flex flex-col gap-3 border-t border-white/5">\n             <div className="flex items-center justify-between border-b border-white/5 py-4 cursor-pointer group"'
)

# For Stem Mixer:
# <div className="flex flex-col gap-3">
#   <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group"
content = content.replace(
    '<div className="flex flex-col gap-3">\n             <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group"',
    '<div className="flex flex-col gap-3">\n             <div className="flex items-center justify-between border-b border-white/5 py-4 cursor-pointer group"'
)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
