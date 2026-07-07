import toWav from 'audiobuffer-to-wav';


function safeDecodeAudioData(ctx: BaseAudioContext, audioData: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    try {
      const promise = ctx.decodeAudioData(
        audioData,
        (buffer) => resolve(buffer),
        (err) => reject(err || new Error("decodeAudioData callback error"))
      );
      if (promise && typeof promise.catch === 'function') {
        promise.catch((err) => reject(err || new Error("decodeAudioData promise error")));
      }
    } catch (err) {
      reject(err);
    }
  });
}

export const buildImpulseResponse = (ctx: BaseAudioContext, duration: number, decay: number) => {
    const rate = ctx.sampleRate;
    const length = rate * duration;
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    // Apply a simple 1-pole lowpass filter to remove harsh digital white noise
    let lastL = 0;
    let lastR = 0;
    const lp = 0.05; // Very strong lowpass to make it sound like a warm room reverb

    for (let i = 0; i < length; i++) {
        const n = Math.pow(1 - i / length, decay);
        const noiseL = (Math.random() * 2 - 1) * n;
        const noiseR = (Math.random() * 2 - 1) * n;
        
        lastL = lastL + lp * (noiseL - lastL);
        lastR = lastR + lp * (noiseR - lastR);

        left[i] = lastL;
        right[i] = lastR;
    }
    return impulse;
};

export const buildDistortionCurve = (amount: number) => {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        // Soft clipping using Math.tanh for clean, warm harmonics instead of harsh distortion noise
        curve[i] = Math.tanh(x * (1 + k)) / Math.tanh(1 + k);
    }
    return curve;
};

export function buildHDPipeline(ctx: BaseAudioContext, eqSettings: any[], spatialSettings: any) {
    // 1. Entry
    const sigIn = ctx.createGain();
    sigIn.gain.value = 1.0; 

    // 2. EQ
    const eqNodes = eqSettings.map(eq => {
        const filter = ctx.createBiquadFilter();
        filter.type = eq.type as BiquadFilterType;
        filter.frequency.value = eq.f;
        filter.Q.value = eq.q;
        filter.gain.value = eq.g;
        return filter;
    });

    sigIn.connect(eqNodes[0]);
    for (let i = 0; i < eqNodes.length - 1; i++) {
        eqNodes[i].connect(eqNodes[i+1]);
    }
    const eqOut = eqNodes[eqNodes.length - 1];

    // 3. Psychoacoustic Sub-Bass Enhancer - Clean Low Frequency Extension
    // Instead of distortion which causes fizz/noise, we use a resonant low-shelf
    // combined with a subtle bump around 60Hz for deep, clean weight.
    const bassShelf = ctx.createBiquadFilter();
    bassShelf.type = 'lowshelf';
    bassShelf.frequency.value = 80;
    
    // Scale bassWeight parameter to a dB gain (0 to 1 -> 0 to 12dB boost)
    // bassWeightGain is kept as a proxy to update parameters if needed, but we'll 
    // connect a dummy gain and update the shelf gain instead.
    const bassWeightDB = spatialSettings.bassWeight * 12.0;
    bassShelf.gain.value = bassWeightDB;
    
    const bassPeak = ctx.createBiquadFilter();
    bassPeak.type = 'peaking';
    bassPeak.frequency.value = 55; // Sub-bass visceral hit
    bassPeak.Q.value = 1.2;
    bassPeak.gain.value = spatialSettings.bassWeight * 6.0; // Up to 6dB peak

    // We still keep a fake bassWeightGain to maintain the return object structure and updates
    const bassWeightGain = ctx.createGain();
    bassWeightGain.gain.value = spatialSettings.bassWeight;

    eqOut.connect(bassShelf);
    bassShelf.connect(bassPeak);

    const postBassMix = ctx.createGain();
    bassPeak.connect(postBassMix);

    // 4. Parallel Detail Extractor & Punch
    const dryDetailGain = ctx.createGain(); dryDetailGain.gain.value = 1.0;
    const wetDetailGain = ctx.createGain(); wetDetailGain.gain.value = spatialSettings.punch;
    
    const detailCompressor = ctx.createDynamicsCompressor();
    detailCompressor.threshold.value = -40; 
    detailCompressor.knee.value = 40;
    detailCompressor.ratio.value = 12; 
    detailCompressor.attack.value = 0.002;
    detailCompressor.release.value = 0.2;
    
    postBassMix.connect(dryDetailGain);
    postBassMix.connect(detailCompressor).connect(wetDetailGain);
    
    const postDetailMix = ctx.createGain();
    dryDetailGain.connect(postDetailMix);
    wetDetailGain.connect(postDetailMix);

    // 5. HD Clarity Exciter - Parallel Harmonic Generation
    // We add a parallel path that generates subtle 2nd and 3rd order harmonics
    // in the high frequencies for that "expensive" airy sound.
    const exciterDry = ctx.createGain(); exciterDry.gain.value = 1.0;
    const exciterWet = ctx.createGain(); exciterWet.gain.value = spatialSettings.clarity * 0.4;
    
    const exciterHPF = ctx.createBiquadFilter();
    exciterHPF.type = 'highpass';
    exciterHPF.frequency.value = 3500; // Excitement starts in upper mids
    
    // WaveShaper for even/odd harmonics
    const exciterWShape = ctx.createWaveShaper();
    const exciterCurve = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) {
        const x = (i / 2047.5) - 1;
        // Asymmetric curve for pleasant 2nd/3rd order harmonics
        exciterCurve[i] = (Math.sign(x) * (1 - Math.exp(-Math.abs(x * 1.5))));
    }
    exciterWShape.curve = exciterCurve;
    exciterWShape.oversample = 'none';

    const exciterPostLPF = ctx.createBiquadFilter();
    exciterPostLPF.type = 'lowpass';
    exciterPostLPF.frequency.value = 16000; // Tame super high artifacts

    const exciterHighShelf = ctx.createBiquadFilter();
    exciterHighShelf.type = 'highshelf';
    exciterHighShelf.frequency.value = 5000; 
    exciterHighShelf.gain.value = spatialSettings.clarity * 3.0;

    postDetailMix.connect(exciterDry);
    postDetailMix.connect(exciterHighShelf).connect(exciterHPF).connect(exciterWShape).connect(exciterPostLPF).connect(exciterWet);

    const postExciterMix = ctx.createGain();
    exciterDry.connect(postExciterMix);
    exciterWet.connect(postExciterMix);

    const trebleAir = ctx.createBiquadFilter();
    trebleAir.type = 'highshelf';
    trebleAir.frequency.value = 12000;
    const trebleDB = (spatialSettings.treble !== undefined ? spatialSettings.treble : 0) * 12.0;
    trebleAir.gain.value = trebleDB;
    
    postExciterMix.connect(trebleAir);

    const postAirMix = ctx.createGain();
    trebleAir.connect(postAirMix);

    // M/S Processing & Vocal Focus
    const splitter = ctx.createChannelSplitter(2);
    postAirMix.connect(splitter);

    const midGain = ctx.createGain(); midGain.gain.value = 0.5;
    const sideGain = ctx.createGain(); sideGain.gain.value = 0.5;
    const invertR = ctx.createGain(); invertR.gain.value = -1.0;

    splitter.connect(midGain, 0);
    splitter.connect(midGain, 1);
    splitter.connect(sideGain, 0);
    splitter.connect(invertR, 1).connect(sideGain);
    
    const vocalDeMud = ctx.createBiquadFilter();
    vocalDeMud.type = 'peaking';
    vocalDeMud.frequency.value = 400;
    vocalDeMud.Q.value = 1.2;
    vocalDeMud.gain.value = -2.5 * spatialSettings.vocalHD;

    const vocalPresenceNode = ctx.createBiquadFilter();
    vocalPresenceNode.type = 'peaking';
    vocalPresenceNode.frequency.value = 3500; 
    vocalPresenceNode.Q.value = 0.8;
    vocalPresenceNode.gain.value = 3.0 * spatialSettings.vocalHD;

    const vocalAir = ctx.createBiquadFilter();
    vocalAir.type = 'highshelf';
    vocalAir.frequency.value = 8500;
    vocalAir.gain.value = 2.5 * spatialSettings.vocalHD;

    const vocalExciterBPF = ctx.createBiquadFilter();
    vocalExciterBPF.type = 'bandpass';
    vocalExciterBPF.frequency.value = 5000;
    vocalExciterBPF.Q.value = 0.5; // Wider for more natural sound

    const vocalWShape = ctx.createWaveShaper();
    vocalWShape.curve = buildDistortionCurve(1.5); // Very soft warm saturation
    vocalWShape.oversample = 'none';

    const vocalPresenceGain = ctx.createGain();
    vocalPresenceGain.gain.value = spatialSettings.vocalHD;

    midGain.connect(vocalDeMud);
    vocalDeMud.connect(vocalPresenceNode);
    vocalPresenceNode.connect(vocalAir);

    vocalAir.connect(vocalExciterBPF);
    vocalExciterBPF.connect(vocalWShape);
    vocalWShape.connect(vocalPresenceGain);

    const midMix = ctx.createGain();
    vocalAir.connect(midMix);
    vocalPresenceGain.connect(midMix);

    // Original Side Path (so it doesn't collapse to Mono when wideness is 0)
    const drySideGain = ctx.createGain();
    drySideGain.gain.value = 1.0;
    sideGain.connect(drySideGain);

    // HD Spatial Wideness (Side Process)
    const widenHPF = ctx.createBiquadFilter();
    widenHPF.type = 'highpass';
    widenHPF.frequency.value = 250; 
    sideGain.connect(widenHPF);

    const sideHighShelf = ctx.createBiquadFilter();
    sideHighShelf.type = 'highshelf';
    sideHighShelf.frequency.value = 5000;
    sideHighShelf.gain.value = 5.0; 

    // HD Multi-tap Haas Spreader
    const haas1 = ctx.createDelay(); haas1.delayTime.value = 0.013; // 13ms
    const haas2 = ctx.createDelay(); haas2.delayTime.value = 0.027; // 27ms
    
    const haasGain1 = ctx.createGain(); haasGain1.gain.value = 0.7;
    const haasGain2 = ctx.createGain(); haasGain2.gain.value = 0.4;

    widenHPF.connect(sideHighShelf);
    
    sideHighShelf.connect(haas1);
    haas1.connect(haas2);

    const widenGain = ctx.createGain();
    // Increase baseline width effect
    widenGain.gain.value = spatialSettings.wideness * 1.2;
    
    sideHighShelf.connect(widenGain);
    haas1.connect(haasGain1).connect(widenGain);
    haas2.connect(haasGain2).connect(widenGain);

    const merger = ctx.createChannelMerger(2);
    const lMix = ctx.createGain(); lMix.gain.value = 1.0;
    const rMix = ctx.createGain(); rMix.gain.value = 1.0;
    const invertSide = ctx.createGain(); invertSide.gain.value = -1.0;

    midMix.connect(lMix);
    drySideGain.connect(lMix);
    widenGain.connect(lMix);
    
    midMix.connect(rMix);
    drySideGain.connect(invertSide).connect(rMix);
    widenGain.connect(invertSide).connect(rMix);

    lMix.connect(merger, 0, 0);
    rMix.connect(merger, 0, 1);

    // HD 3D Spatial Reverb Engine
    // Avoids convolver white-noise generation, uses a dense, ultra-wide 4-tap matrix
    // for pristine, zero-noise, maximum width HD spatialization.
    
    // Wet & Dry blending
    const dryGain = ctx.createGain(); 
    dryGain.gain.value = 1.0 - (spatialSettings.reverb * 0.4);
    
    const wetGain = ctx.createGain(); 
    // Increase wet gain ratio for a much more expansive HD space
    wetGain.gain.value = spatialSettings.reverb * 1.5; 
    
    const spaceMix = ctx.createGain();
    merger.connect(dryGain).connect(spaceMix);
    
    // 3D Panner for early reflections to create immediate width
    const panner1 = ctx.createStereoPanner(); panner1.pan.value = -0.9;
    const panner2 = ctx.createStereoPanner(); panner2.pan.value = 0.9;
    
    // Tap 1 (Early Reflection Left)
    const delay1 = ctx.createDelay(1.0); delay1.delayTime.value = 0.045; // 45ms
    // Tap 2 (Early Reflection Right)
    const delay2 = ctx.createDelay(1.0); delay2.delayTime.value = 0.065; // 65ms
    
    merger.connect(delay1).connect(panner1).connect(wetGain);
    merger.connect(delay2).connect(panner2).connect(wetGain);

    // 3D Panners for late tail bloom
    const panner3 = ctx.createStereoPanner(); panner3.pan.value = -0.7;
    const panner4 = ctx.createStereoPanner(); panner4.pan.value = 0.7;
    
    // Tap 3 (Late Tail Left)
    const delay3 = ctx.createDelay(2.0); delay3.delayTime.value = 0.320; // 320ms
    // Tap 4 (Late Tail Right)
    const delay4 = ctx.createDelay(2.0); delay4.delayTime.value = 0.480; // 480ms
    
    // Smooth HD Filters to keep the verb warm and tucked back
    const filter3 = ctx.createBiquadFilter(); filter3.type = 'lowpass'; filter3.frequency.value = 1400;
    const filter4 = ctx.createBiquadFilter(); filter4.type = 'lowpass'; filter4.frequency.value = 1800;
    const hp3 = ctx.createBiquadFilter(); hp3.type = 'highpass'; hp3.frequency.value = 250;
    const hp4 = ctx.createBiquadFilter(); hp4.type = 'highpass'; hp4.frequency.value = 300;
    
    // Subtle cross-feedback parameters
    const fb3 = ctx.createGain(); fb3.gain.value = 0.40 + (spatialSettings.reverb * 0.15);
    const fb4 = ctx.createGain(); fb4.gain.value = 0.45 + (spatialSettings.reverb * 0.15);
    
    merger.connect(delay3);
    merger.connect(delay4);
    
    // Cross-feed Ping-Pong Routing
    delay3.connect(filter3).connect(hp3).connect(fb3).connect(delay4);
    delay4.connect(filter4).connect(hp4).connect(fb4).connect(delay3);
    
    delay3.connect(panner3).connect(wetGain);
    delay4.connect(panner4).connect(wetGain);
    
    wetGain.connect(spaceMix);

    // 9. Multi-Stage Mastering Chain
    // Stage A: Glue Compressor (Gentle bus compression)
    const glueCompressor = ctx.createDynamicsCompressor();
    glueCompressor.threshold.value = -12;
    glueCompressor.knee.value = 8;
    glueCompressor.ratio.value = 2.0;
    glueCompressor.attack.value = 0.010;
    glueCompressor.release.value = 0.250;

    // Stage B: Harmonic Warmth (Final analog-style glow)
    const masterWarmth = ctx.createWaveShaper();
    masterWarmth.curve = buildDistortionCurve(0.05); // Extremely subtle saturation
    masterWarmth.oversample = 'none';

    // Stage C: Precision Brickwall Limiter
    const brickwall = ctx.createDynamicsCompressor();
    brickwall.threshold.value = -1.5;
    brickwall.knee.value = 0;
    brickwall.ratio.value = 20; 
    brickwall.attack.value = 0.001; 
    brickwall.release.value = 0.050;

    spaceMix.connect(glueCompressor);
    glueCompressor.connect(masterWarmth);
    masterWarmth.connect(brickwall);

    const sigOut = ctx.createGain();
    sigOut.gain.value = 1.25; // Transparent make-up gain
    brickwall.connect(sigOut);

    return { 
        input: sigIn, 
        output: sigOut, 
        nodes: {
            eqNodes,
            bassShelf,
            bassPeak,
            wetDetailGain,
            exciterHighShelf,
            trebleAir,
            vocalDeMud,
            vocalPresenceNode,
            vocalAir,
            vocalPresenceGain,
            widenGain,
            wetGain,
            dryGain
        }
    };
}

export const exportOfflineHD = async (
    audioUrl: string, 
    eqSettings: any[], 
    spatialSettings: any,
    onProgress: (progress: number) => void
) => {
    onProgress(10);
    const resp = await fetch(audioUrl);
    const audioData = await resp.arrayBuffer();
    onProgress(30);

    const acts = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await safeDecodeAudioData(acts, audioData);
    onProgress(50);

    const offlineCtx = new OfflineAudioContext(audioBuffer.numberOfChannels || 2, audioBuffer.length, audioBuffer.sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    const pipeline = buildHDPipeline(offlineCtx, eqSettings, spatialSettings);

    source.connect(pipeline.input);
    pipeline.output.connect(offlineCtx.destination);
    source.start(0);

    onProgress(60);
    const renderedBuffer = await offlineCtx.startRendering();
    onProgress(80);

    const wav = toWav(renderedBuffer);
    const blob = new Blob([new DataView(wav)], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    onProgress(100);
    
    return url;
};
