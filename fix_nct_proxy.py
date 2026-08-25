import re

with open('server/nctParser.ts', 'r') as f:
    content = f.read()

target = """    // Return direct stream instead of proxy to avoid errors
    const proxiedAudioUrl = directAudioUrl;"""

replacement = """    // We must wrap the URL in our local proxy to avoid CORS issues when the frontend uses Web Audio API
    const proxiedAudioUrl = directAudioUrl ? `/api/proxy-stream?url=${encodeURIComponent(directAudioUrl)}` : "";"""

content = content.replace(target, replacement)

target_qualities = """        url: q.stream ? q.stream : "","""
replacement_qualities = """        url: q.stream ? `/api/proxy-stream?url=${encodeURIComponent(q.stream)}` : "","""

content = content.replace(target_qualities, replacement_qualities)

with open('server/nctParser.ts', 'w') as f:
    f.write(content)
