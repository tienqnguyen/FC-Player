import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

state_old = """  const [showAudioEnhancer, setShowAudioEnhancer] = useState<boolean>(false);"""
state_new = """  const [showAudioEnhancer, setShowAudioEnhancer] = useState<boolean>(false);
  const [active8D, setActive8D] = useState<boolean>(false);
  const [activeBassBoost, setActiveBassBoost] = useState<boolean>(false);
  const [activeSpeedFx, setActiveSpeedFx] = useState<'slowed' | 'nightcore' | '432hz' | null>(null);

  useEffect(() => {
    if (masterPannerDepthRef.current && audioContextRef.current) {
       masterPannerDepthRef.current.gain.setTargetAtTime(active8D ? 0.8 : 0, audioContextRef.current.currentTime, 0.5);
    }
  }, [active8D]);

  useEffect(() => {
    if (masterBassBoostRef.current && audioContextRef.current) {
       masterBassBoostRef.current.gain.setTargetAtTime(activeBassBoost ? 12.0 : 0, audioContextRef.current.currentTime, 0.5);
    }
  }, [activeBassBoost]);

  useEffect(() => {
    if (activeSpeedFx === 'slowed') {
       setSpeed(0.8);
       setPreservePitch(false);
       setReverb(0.4);
    } else if (activeSpeedFx === 'nightcore') {
       setSpeed(1.25);
       setPreservePitch(false);
       setReverb(0.1);
    } else if (activeSpeedFx === '432hz') {
       setSpeed(0.9818);
       setPreservePitch(false);
    } else {
       setSpeed(1.0);
       setPreservePitch(true);
       setReverb(0);
    }
  }, [activeSpeedFx]);"""
content = content.replace(state_old, state_new)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
print("Patched states")
