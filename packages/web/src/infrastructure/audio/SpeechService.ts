// Browser Text-To-Speech Service for Jus Breathe
export class SpeechService {
  private isMuted: boolean = false;
  private isEnabled: boolean = true;
  private calmVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    // Look for high-quality, soft-sounding English voices
    this.calmVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Natural') || v.name.includes('Aria') || v.name.includes('Google') || v.name.includes('Samantha'))
    ) || voices[0] || null;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.isMuted) {
      this.cancel();
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!this.isEnabled) {
      this.cancel();
    }
  }

  speak(text: string) {
    if (this.isMuted || !this.isEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      // 1. Cancel active utterances to clear synthesis queue
      window.speechSynthesis.cancel();

      // 2. Queue the new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.calmVoice) {
        utterance.voice = this.calmVoice;
      }
      utterance.rate = 0.82; // slightly slower, calm rate
      utterance.pitch = 1.0;
      utterance.volume = 0.45; // softer cue

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis failed to play:", e);
    }
  }

  cancel() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const speechService = new SpeechService();
