import re

with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

# Replace defaults
content = re.sub(r'const \[saturateDrive, setSaturateDrive\] = useState\(.*?\);', 'const [saturateDrive, setSaturateDrive] = useState(0);', content)
content = re.sub(r'const \[saturateWarm, setSaturateWarm\] = useState\(.*?\);', 'const [saturateWarm, setSaturateWarm] = useState(0);', content)
content = re.sub(r'const \[dynamicsComp, setDynamicsComp\] = useState\(.*?\);', 'const [dynamicsComp, setDynamicsComp] = useState(0);', content)
content = re.sub(r'const \[dynamicsShape, setDynamicsShape\] = useState\(.*?\);', 'const [dynamicsShape, setDynamicsShape] = useState(2);', content)

content = re.sub(r'const \[eqSub, setEqSub\] = useState\(.*?\);', 'const [eqSub, setEqSub] = useState(50);', content)
content = re.sub(r'const \[eqLow, setEqLow\] = useState\(.*?\);', 'const [eqLow, setEqLow] = useState(50);', content)
content = re.sub(r'const \[eqMid, setEqMid\] = useState\(.*?\);', 'const [eqMid, setEqMid] = useState(50);', content)
content = re.sub(r'const \[eqHiMid, setEqHiMid\] = useState\(.*?\);', 'const [eqHiMid, setEqHiMid] = useState(50);', content)
content = re.sub(r'const \[eqHigh, setEqHigh\] = useState\(.*?\);', 'const [eqHigh, setEqHigh] = useState(50);', content)
content = re.sub(r'const \[eqAir, setEqAir\] = useState\(.*?\);', 'const [eqAir, setEqAir] = useState(50);', content)

content = re.sub(r'const \[modDepth, setModDepth\] = useState\(.*?\);', 'const [modDepth, setModDepth] = useState(0);', content)
content = re.sub(r'const \[modAnalog, setModAnalog\] = useState\(.*?\);', 'const [modAnalog, setModAnalog] = useState(0);', content)
content = re.sub(r'const \[maxMulti, setMaxMulti\] = useState\(.*?\);', 'const [maxMulti, setMaxMulti] = useState(0);', content)

with open('src/components/AudioEnhancer.tsx', 'w') as f:
    f.write(content)
print("Patched enhancer defaults")
