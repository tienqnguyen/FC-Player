import * as ort from 'onnxruntime-web';
import { DemucsProcessor, CONSTANTS } from 'demucs-web';

// Configure ONNX Runtime to use more threads if supported
ort.env.wasm.numThreads = typeof SharedArrayBuffer !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 1;
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';

let processorInstance: any = null;

export async function separateStemsWithONNX(
  audioBuffer: AudioBuffer,
  audioContext: AudioContext,
  onProgress?: (progress: number) => void
) {
  // Detect backend
  let backend = 'wasm';
  if ('gpu' in navigator) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        backend = 'webgpu';
        (ort.env as any).webgpu = { powerPreference: 'high-performance' };
      }
    } catch (e) {
      console.log('WebGPU not available, fallback to WASM');
    }
  }
  
  if (!processorInstance) {
      processorInstance = new DemucsProcessor({
        ort,
        onProgress: ({ progress, currentSegment, totalSegments }) => {
            if (onProgress) {
                // scale progress up to 90%
                onProgress(progress * 0.9);
            }
        },
        onLog: (phase, msg) => {
            console.log(`[Demucs ONNX] [${phase}] ${msg}`);
        },
        onDownloadProgress: (loaded, total) => {
            const percent = ((loaded / total) * 100).toFixed(1);
            console.log(`Downloading model: ${percent}%`);
        },
        sessionOptions: {
            enableCpuMemArena: false,
            enableMemPattern: false,
            executionProviders: backend === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm']
        }
      });
      console.log('Loading Demucs ONNX Model...');
      await processorInstance.loadModel(CONSTANTS.DEFAULT_MODEL_URL);
  }

  // Get channel data
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = audioBuffer.numberOfChannels > 1 
    ? audioBuffer.getChannelData(1) 
    : leftChannel;

  console.log('Starting separation...');
  const result = await processorInstance.separate(leftChannel, rightChannel);
  
  if (onProgress) onProgress(1);

  // Convert the output Float32Arrays back into AudioBuffers
  const makeAudioBuffer = (dL: Float32Array, dR: Float32Array): AudioBuffer => {
    const buf = audioContext.createBuffer(2, dL.length, audioBuffer.sampleRate);
    buf.copyToChannel(dL, 0);
    buf.copyToChannel(dR, 1);
    return buf;
  };

  // The tracks are ['drums', 'bass', 'other', 'vocals']
  return {
      vocals: makeAudioBuffer(result.vocals.left, result.vocals.right),
      bass: makeAudioBuffer(result.bass.left, result.bass.right),
      drums: makeAudioBuffer(result.drums.left, result.drums.right),
      other: makeAudioBuffer(result.other.left, result.other.right)
  };
}
