with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

idx = content.find("!stemUrls")
if idx != -1:
    print(content[idx-100:idx+500])
