import re

with open('server.ts', 'r') as f:
    content = f.read()

target1 = """      // Unify stream routes cleanly
      let audioUrl = "";
      if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) {
        audioUrl = `/api/proxy-stream?url=${encodeURIComponent(url)}`;
      } else {
        audioUrl = `/api/stream?url=${encodeURIComponent(url)}`;
      }"""

replacement1 = """      // Unify stream routes cleanly
      let audioUrl = `/api/stream?url=${encodeURIComponent(url)}`;"""
content = content.replace(target1, replacement1)

with open('server.ts', 'w') as f:
    f.write(content)
print("Finished replacements")
