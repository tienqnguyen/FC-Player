const fs = require('fs');
const audioBufferToWav = require('audiobuffer-to-wav');
const wav = audioBufferToWav({
  numberOfChannels: 2,
  sampleRate: 44100,
  getChannelData: () => new Float32Array(44100)
});
console.log(wav.byteLength);
