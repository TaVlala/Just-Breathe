// Web Audio API Synthesizer for "Jus Breathe"
class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.tickGain = null;
    this.chimeGain = null;
    this.ambientSource = null;
    this.ambientGain = null;

    // Preferences
    this.isMuted = {
      master: false,
      tick: false,
      chime: false,
      voice: false,
      ambient: false
    };

    this.volumes = {
      master: 0.8,
      tick: 0.3,
      chime: 0.7,
      ambient: 0.15
    };

    this.currentAmbientType = 'none'; // 'none', 'waves', 'rain', 'drone'
    this.voiceGuideEnabled = true;
    this.calmVoice = null;

    // Pre-load Speech Synthesis voices
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    
    // Setup gain nodes for volume control
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted.master ? 0 : this.volumes.master, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.tickGain = this.ctx.createGain();
    this.tickGain.gain.setValueAtTime(this.isMuted.tick ? 0 : this.volumes.tick, this.ctx.currentTime);
    this.tickGain.connect(this.masterGain);

    this.chimeGain = this.ctx.createGain();
    this.chimeGain.gain.setValueAtTime(this.isMuted.chime ? 0 : this.volumes.chime, this.ctx.currentTime);
    this.chimeGain.connect(this.masterGain);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(this.isMuted.ambient ? 0 : this.volumes.ambient, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    // Warm start
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    // Prefer soft-sounding English voices
    this.calmVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Aria') || v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Zira') || v.name.includes('Samantha'))
    ) || voices[0];
  }

  // Setters for volume and mute
  setMasterVolume(val) {
    this.volumes.master = parseFloat(val);
    if (this.masterGain && !this.isMuted.master) {
      this.masterGain.gain.setTargetAtTime(this.volumes.master, this.ctx.currentTime, 0.05);
    }
  }

  setTickVolume(val) {
    this.volumes.tick = parseFloat(val);
    if (this.tickGain && !this.isMuted.tick) {
      this.tickGain.gain.setTargetAtTime(this.volumes.tick, this.ctx.currentTime, 0.05);
    }
  }

  setChimeVolume(val) {
    this.volumes.chime = parseFloat(val);
    if (this.chimeGain && !this.isMuted.chime) {
      this.chimeGain.gain.setTargetAtTime(this.volumes.chime, this.ctx.currentTime, 0.05);
    }
  }

  setAmbientVolume(val) {
    this.volumes.ambient = parseFloat(val);
    if (this.ambientGain && !this.isMuted.ambient) {
      this.ambientGain.gain.setTargetAtTime(this.volumes.ambient, this.ctx.currentTime, 0.05);
    }
  }

  toggleMute(type) {
    if (this.isMuted[type] !== undefined) {
      this.isMuted[type] = !this.isMuted[type];
      
      this.init(); // Ensure initialized
      
      const currentTime = this.ctx.currentTime;
      if (type === 'master' && this.masterGain) {
        this.masterGain.gain.setTargetAtTime(this.isMuted.master ? 0 : this.volumes.master, currentTime, 0.05);
      } else if (type === 'tick' && this.tickGain) {
        this.tickGain.gain.setTargetAtTime(this.isMuted.tick ? 0 : this.volumes.tick, currentTime, 0.05);
      } else if (type === 'chime' && this.chimeGain) {
        this.chimeGain.gain.setTargetAtTime(this.isMuted.chime ? 0 : this.volumes.chime, currentTime, 0.05);
      } else if (type === 'ambient') {
        if (this.ambientGain) {
          this.ambientGain.gain.setTargetAtTime(this.isMuted.ambient ? 0 : this.volumes.ambient, currentTime, 0.05);
        }
        if (!this.isMuted.ambient && this.currentAmbientType !== 'none') {
          this.startAmbient(this.currentAmbientType);
        }
      }
    }
    return this.isMuted[type];
  }

  // Ticking Sounds
  playTick(type = 'woodblock') {
    this.init();
    if (this.isMuted.tick || this.isMuted.master) return;

    const t = this.ctx.currentTime;

    if (type === 'woodblock') {
      // Woodblock: short sine wave with rapid frequency drop
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);

      gainNode.gain.setValueAtTime(1.0, t);
      gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

      osc.connect(gainNode);
      gainNode.connect(this.tickGain);

      osc.start(t);
      osc.stop(t + 0.1);
    } else if (type === 'click') {
      // Mechanical Watch Click: high-pass filtered white noise burst
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

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.8, t);
      gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.015);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.tickGain);

      noise.start(t);
      noise.stop(t + 0.02);
    } else if (type === 'heartbeat') {
      // Heartbeat: dual low frequency thump (lub-dub)
      const playThump = (time, pitch, volume, duration) => {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + duration);

        gainNode.gain.setValueAtTime(volume, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(gainNode);
        gainNode.connect(this.tickGain);

        osc.start(time);
        osc.stop(time + duration + 0.05);
      };

      // "Lub" (first beat, lower frequency, slightly longer)
      playThump(t, 55, 1.0, 0.12);
      // "Dub" (second beat, slightly higher frequency, shorter, 150ms later)
      playThump(t + 0.15, 62, 0.7, 0.08);
    }
  }

  // Chime / Transition Sounds
  playChime(type = 'singing-bowl') {
    this.init();
    if (this.isMuted.chime || this.isMuted.master) return;

    const t = this.ctx.currentTime;

    if (type === 'singing-bowl') {
      // Singing bowl: rich multi-harmonic drone with slow decay
      const frequencies = [220, 440, 660, 880, 1100];
      const gains = [1.0, 0.5, 0.25, 0.15, 0.08];
      const duration = 6.0;

      frequencies.forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        osc.type = 'sine';
        // Add tiny detune for organic phasing
        osc.frequency.setValueAtTime(freq + (Math.random() * 1.5 - 0.75), t);

        // Slow build-up (soft attack)
        oscGain.gain.setValueAtTime(0, t);
        oscGain.gain.linearRampToValueAtTime(gains[index] * 0.4, t + 0.15);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(oscGain);
        oscGain.connect(this.chimeGain);

        osc.start(t);
        osc.stop(t + duration + 0.2);
      });
    } else if (type === 'crystal') {
      // Crystal chime: pure, sparkling sine chord
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const duration = 2.5;

      notes.forEach((freq, index) => {
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
      // Warm Gong: low frequency detuned square + triangle with filter sweep
      const baseFreq = 85;
      const duration = 5.0;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(baseFreq, t);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 1.5 + 2, t); // Ring modulation feeling

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(100, t + duration);

      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(0.8, t + 0.05); // quick punch
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

  // Speech Cues
  speak(text) {
    if (this.isMuted.voice || this.isMuted.master || !this.voiceGuideEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Cancel current speaking to prevent queue overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.calmVoice) {
      utterance.voice = this.calmVoice;
    }
    utterance.rate = 0.82; // Calm, slower pace
    utterance.pitch = 1.0;
    utterance.volume = 0.5; // Moderately soft so it doesn't startle

    window.speechSynthesis.speak(utterance);
  }

  // Ambient Soundscapes
  startAmbient(type) {
    this.init();
    this.stopAmbient();
    this.currentAmbientType = type;

    if (type === 'none' || this.isMuted.ambient || this.isMuted.master) return;

    const bufferSize = this.ctx.sampleRate * 4; // 4 seconds of noise
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate Pink Noise approximation
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11; // scale
      b6 = white * 0.115926;
    }

    this.ambientSource = this.ctx.createBufferSource();
    this.ambientSource.buffer = noiseBuffer;
    this.ambientSource.loop = true;

    if (type === 'waves') {
      // Ocean Waves: Pink noise modulated by slow LFO (breathing rhythm)
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, this.ctx.currentTime);

      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();

      lfo.frequency.value = 0.12; // 8-second wave cycles
      lfoGain.gain.value = 250; // swing frequency by 250Hz

      // Modulate filter cutoff frequency with LFO
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      // Volume modulation for swelling effect
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

      // Store nodes to stop them
      this.ambientNodes = [lfo, this.ambientSource];
    } else if (type === 'rain') {
      // Rain: Pink noise with high-pass filter + random tiny crackles
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      filter.Q.setValueAtTime(0.7, this.ctx.currentTime);

      this.ambientSource.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientSource.start();

      // Periodic random drops generator
      const scriptNode = this.ctx.createScriptProcessor(4096, 0, 1);
      scriptNode.onaudioprocess = (e) => {
        const out = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < out.length; i++) {
          out[i] = 0;
          if (Math.random() < 0.0003) {
            // Drop impulse
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
      // Zen Drone: Detuned low oscillators for binaural-like relaxation
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const osc3 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(73.42, this.ctx.currentTime); // D2

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(110.00, this.ctx.currentTime); // A2

      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(110.40, this.ctx.currentTime); // Detuned for beating

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
          if (node.stop) node.stop();
        } catch(e) {}
      });
      this.ambientNodes = null;
    }
    if (this.ambientSource) {
      try {
        this.ambientSource.disconnect();
        this.ambientSource.stop();
      } catch(e) {}
      this.ambientSource = null;
    }
  }
}

export const audio = new AudioSynthesizer();
export default audio;
