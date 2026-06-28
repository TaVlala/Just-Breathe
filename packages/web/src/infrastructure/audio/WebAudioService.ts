// Web Audio API Synthesizer for "Jus Breathe"
export class WebAudioService {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private tickGain: GainNode | null = null;
  private chimeGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientNodes: AudioNode[] | null = null;

  private volumes = {
    master: 0.8,
    tick: 0.3,
    chime: 0.7,
    ambient: 0.15
  };

  private mutes = {
    tick: false,
    chime: false,
    ambient: false
  };

  private currentAmbientType: 'none' | 'waves' | 'rain' | 'drone' = 'none';

  constructor() {
    // Lazy initialisation to support interaction guard
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    // 1. DynamicsCompressorNode as limiter to prevent clipping/distortion
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime); // start compressing at -12dB
    this.compressor.knee.setValueAtTime(4, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime); // aggressive limiting ratio
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime); // fast attack
    this.compressor.release.setValueAtTime(0.08, this.ctx.currentTime); // fast release
    
    // Connect compressor to output
    this.compressor.connect(this.ctx.destination);

    // 2. Master gain node (connects to compressor)
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volumes.master, this.ctx.currentTime);
    this.masterGain.connect(this.compressor);

    // 3. Child gain nodes (connect to master gain)
    this.tickGain = this.ctx.createGain();
    this.tickGain.gain.setValueAtTime(this.mutes.tick ? 0 : this.volumes.tick, this.ctx.currentTime);
    this.tickGain.connect(this.masterGain);

    this.chimeGain = this.ctx.createGain();
    this.chimeGain.gain.setValueAtTime(this.mutes.chime ? 0 : this.volumes.chime, this.ctx.currentTime);
    this.chimeGain.connect(this.masterGain);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(this.mutes.ambient ? 0 : this.volumes.ambient, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    // Warm start
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Ensure AudioContext is active (e.g. called on visibility change or unlock)
  resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolumes(v: { master: number; tick: number; chime: number; ambient: number }) {
    this.volumes = { ...v };
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    this.masterGain?.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.tickGain?.gain.setTargetAtTime(this.mutes.tick ? 0 : this.volumes.tick, t, 0.05);
    this.chimeGain?.gain.setTargetAtTime(this.mutes.chime ? 0 : this.volumes.chime, t, 0.05);
    this.ambientGain?.gain.setTargetAtTime(this.mutes.ambient ? 0 : this.volumes.ambient, t, 0.05);
  }

  setMutes(m: { tick: boolean; chime: boolean; ambient: boolean }) {
    this.mutes = { ...m };
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    this.tickGain?.gain.setTargetAtTime(this.mutes.tick ? 0 : this.volumes.tick, t, 0.05);
    this.chimeGain?.gain.setTargetAtTime(this.mutes.chime ? 0 : this.volumes.chime, t, 0.05);
    this.ambientGain?.gain.setTargetAtTime(this.mutes.ambient ? 0 : this.volumes.ambient, t, 0.05);

    if (!this.mutes.ambient && this.currentAmbientType !== 'none') {
      this.startAmbient(this.currentAmbientType);
    } else if (this.mutes.ambient) {
      this.stopAmbient();
    }
  }

  playTick(type: 'woodblock' | 'click' | 'heartbeat') {
    this.init();
    if (!this.ctx || this.mutes.tick || !this.tickGain) return;

    const t = this.ctx.currentTime;

    if (type === 'woodblock') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);

      gain.gain.setValueAtTime(1.0, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

      osc.connect(gain);
      gain.connect(this.tickGain);

      osc.start(t);
      osc.stop(t + 0.1);
    } else if (type === 'click') {
      const bufferSize = this.ctx.sampleRate * 0.02; // 20ms
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(4000, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.015);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.tickGain);

      noise.start(t);
      noise.stop(t + 0.02);
    } else if (type === 'heartbeat') {
      const playThump = (time: number, pitch: number, volume: number, duration: number) => {
        if (!this.ctx || !this.tickGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + duration);

        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(gain);
        gain.connect(this.tickGain);

        osc.start(time);
        osc.stop(time + duration + 0.05);
      };

      playThump(t, 55, 1.0, 0.12);
      playThump(t + 0.15, 62, 0.7, 0.08);
    }
  }

  playChime(type: 'singing-bowl' | 'crystal' | 'gong') {
    this.init();
    if (!this.ctx || this.mutes.chime || !this.chimeGain) return;

    const t = this.ctx.currentTime;

    if (type === 'singing-bowl') {
      const frequencies = [220, 440, 660, 880, 1100];
      const gains = [1.0, 0.5, 0.25, 0.15, 0.08];
      const duration = 6.0;

      frequencies.forEach((freq, index) => {
        if (!this.ctx || !this.chimeGain) return;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq + (Math.random() * 1.5 - 0.75), t);

        oscGain.gain.setValueAtTime(0, t);
        oscGain.gain.linearRampToValueAtTime(gains[index] * 0.4, t + 0.15);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(oscGain);
        oscGain.connect(this.chimeGain);

        osc.start(t);
        osc.stop(t + duration + 0.2);
      });
    } else if (type === 'crystal') {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const duration = 2.5;

      notes.forEach((freq, index) => {
        if (!this.ctx || !this.chimeGain) return;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        oscGain.gain.setValueAtTime(0.25, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration - index * 0.2);

        osc.connect(oscGain);
        oscGain.connect(this.chimeGain);

        osc.start(t);
        osc.stop(t + duration + 0.1);
      });
    } else if (type === 'gong') {
      const baseFreq = 85;
      const duration = 5.0;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(baseFreq, t);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 1.5 + 2, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(100, t + duration);

      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(0.8, t + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.chimeGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + duration + 0.1);
      osc2.stop(t + duration + 0.1);
    }
  }

  startAmbient(type: 'none' | 'waves' | 'rain' | 'drone') {
    this.init();
    this.stopAmbient();
    this.currentAmbientType = type;

    if (type === 'none' || this.mutes.ambient || !this.ctx || !this.ambientGain) return;

    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11;
      b6 = white * 0.115926;
    }

    this.ambientSource = this.ctx.createBufferSource();
    this.ambientSource.buffer = noiseBuffer;
    this.ambientSource.loop = true;

    if (type === 'waves') {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, this.ctx.currentTime);

      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();

      lfo.frequency.value = 0.12; // 8-second cycles
      lfoGain.gain.value = 250;

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      const volGain = this.ctx.createGain();
      volGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

      const volLfoGain = this.ctx.createGain();
      volLfoGain.gain.value = 0.25;

      lfo.connect(volLfoGain);
      volLfoGain.connect(volGain.gain);

      this.ambientSource.connect(filter);
      filter.connect(volGain);
      volGain.connect(this.ambientGain);

      lfo.start();
      this.ambientSource.start();

      this.ambientNodes = [lfo, this.ambientSource];
    } else if (type === 'rain') {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      filter.Q.setValueAtTime(0.7, this.ctx.currentTime);

      this.ambientSource.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientSource.start();

      // Custom script processor for random rain drop crackles
      const scriptNode = this.ctx.createScriptProcessor(4096, 0, 1);
      scriptNode.onaudioprocess = (e) => {
        const out = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < out.length; i++) {
          out[i] = 0;
          if (Math.random() < 0.0003) {
            out[i] = Math.random() * 0.4;
          }
        }
      };

      const dropFilter = this.ctx.createBiquadFilter();
      dropFilter.type = 'lowpass';
      dropFilter.frequency.setValueAtTime(2500, this.ctx.currentTime);

      scriptNode.connect(dropFilter);
      dropFilter.connect(this.ambientGain);

      this.ambientNodes = [this.ambientSource, scriptNode, dropFilter];
    } else if (type === 'drone') {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const osc3 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(73.42, this.ctx.currentTime); // D2

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(110.00, this.ctx.currentTime); // A2

      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(110.40, this.ctx.currentTime); // detuned

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, this.ctx.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(this.ambientGain);

      osc1.start();
      osc2.start();
      osc3.start();

      this.ambientNodes = [osc1, osc2, osc3];
    }
  }

  stopAmbient() {
    if (this.ambientNodes) {
      this.ambientNodes.forEach(node => {
        try {
          node.disconnect();
          if ('stop' in node && typeof node.stop === 'function') {
            node.stop();
          }
        } catch (e) {}
      });
      this.ambientNodes = null;
    }
    if (this.ambientSource) {
      try {
        this.ambientSource.disconnect();
        this.ambientSource.stop();
      } catch (e) {}
      this.ambientSource = null;
    }
  }
}

export const webAudioService = new WebAudioService();
