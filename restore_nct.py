import re

with open('server/nctParser.ts', 'r') as f:
    content = f.read()

target1 = """    // Return direct stream instead of proxy to avoid errors
    const proxiedAudioUrl = directAudioUrl;"""
replacement1 = """    // Wrap with proxy stream endpoint to bypass region blocks and allow CORS playback
    const proxiedAudioUrl = directAudioUrl ? `/api/proxy-stream?url=${encodeURIComponent(directAudioUrl)}` : "";"""
content = content.replace(target1, replacement1)

target2 = """        url: q.stream ? q.stream : "","""
replacement2 = """        url: q.stream ? `/api/proxy-stream?url=${encodeURIComponent(q.stream)}` : "","""
content = content.replace(target2, replacement2)

with open('server/nctParser.ts', 'w') as f:
    f.write(content)

with open('server.ts', 'r') as f:
    content2 = f.read()

target3 = """      // Unify stream routes cleanly
      let audioUrl = `/api/stream?url=${encodeURIComponent(url)}`;"""
replacement3 = """      // Unify stream routes cleanly
      let audioUrl = "";
      if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) {
        audioUrl = `/api/proxy-stream?url=${encodeURIComponent(url)}`;
      } else {
        audioUrl = `/api/stream?url=${encodeURIComponent(url)}`;
      }"""
content2 = content2.replace(target3, replacement3)

with open('server.ts', 'w') as f:
    f.write(content2)

print("Restored backend files")
