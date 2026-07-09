const code = `
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (audioContextRef.current && audioContextRef.current.state === "running") {
          audioContextRef.current.suspend();
        }
      } else {
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume().then(() => {
            if (reconnectSource) reconnectSource();
          });
        } else if (audioContextRef.current && audioContextRef.current.state === "running") {
           if (reconnectSource) reconnectSource();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [reconnectSource]);
`;
