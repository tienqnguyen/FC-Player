import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# Add states around line 125 (where other states are)
state_str = """
  // FC Plugin Bypass States
  const [fcAudioBypassed, setFcAudioBypassed] = useState(true);
  const [fcOneKnobBypassed, setFcOneKnobBypassed] = useState(true);
  const [fcStudioBypassed, setFcStudioBypassed] = useState(true);
"""
# find a good spot, like after const [active8D, setActive8D] = useState(false);
content = content.replace(
    '  const [active8D, setActive8D] = useState(false);',
    '  const [active8D, setActive8D] = useState(false);\n' + state_str
)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
