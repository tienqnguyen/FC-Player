import re

with open('server/nctParser.ts', 'r') as f:
    content = f.read()

target1 = """    // Wrap with proxy stream endpoint to bypass region blocks and allow CORS playback
    const proxiedAudioUrl = directAudioUrl ? `/api/proxy-stream?url=${encodeURIComponent(directAudioUrl)}` : "";"""
replacement1 = """    // Return direct stream instead of proxy to avoid errors
    const proxiedAudioUrl = directAudioUrl;"""
content = content.replace(target1, replacement1)

target2 = """        url: q.stream ? `/api/proxy-stream?url=${encodeURIComponent(q.stream)}` : "","""
replacement2 = """        url: q.stream ? q.stream : "","""
content = content.replace(target2, replacement2)

with open('server/nctParser.ts', 'w') as f:
    f.write(content)
print("Finished replacements")
