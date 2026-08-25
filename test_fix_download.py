import re

with open('server.ts', 'r') as f:
    content = f.read()

target = """      if (!isDirect && (finalUrl.includes("youtube.com") || finalUrl.includes("youtu.be") || finalUrl.includes("facebook.com") || finalUrl.includes("fb.watch"))) {"""
replacement = """      if (!isDirect && (finalUrl.includes("youtube.com") || finalUrl.includes("youtu.be") || finalUrl.includes("facebook.com") || finalUrl.includes("fb.watch") || finalUrl.includes("nhaccuatui.com") || finalUrl.includes("nct.vn"))) {"""

content = content.replace(target, replacement)

with open('server.ts', 'w') as f:
    f.write(content)
