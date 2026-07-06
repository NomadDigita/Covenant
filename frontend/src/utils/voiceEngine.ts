"use client";

export type NarratorType = "male" | "female";

interface SpeakOptions {
  voiceType?: NarratorType;
  rate?: number;  // Speed of speech
  pitch?: number; // Tone pitch
  echo?: boolean; // Whether to trigger the digital reverb cascade
}

class VoiceEngine {
  private isMuted: boolean = false;
  private activeNarrator: NarratorType = "female";

  constructor() {
    if (typeof window !== "undefined") {
      // Warm up the browser synthesis library
      window.speechSynthesis?.getVoices();
    }
  }

  // Getters & Setters
  public setMute(status: boolean) {
    this.isMuted = status;
    if (status) {
      this.stop();
    }
  }

  public getMuteStatus(): boolean {
    return this.isMuted;
  }

  public setNarrator(type: NarratorType) {
    this.activeNarrator = type;
  }

  public getNarrator(): NarratorType {
    return this.activeNarrator;
  }

  // Locates the best available browser system voices
  private findSystemVoice(type: NarratorType): SpeechSynthesisVoice | null {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();

    // English voice catalogs filters
    const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
    if (englishVoices.length === 0) return null;

    if (type === "female") {
      // Prioritize natural-sounding female synthesizers (Google/Zira)
      const target = englishVoices.find(
        (v) =>
          v.name.includes("Google US English") ||
          v.name.includes("Zira") ||
          v.name.includes("Hazel") ||
          v.name.includes("Samantha")
      );
      return target || englishVoices[0];
    } else {
      // Prioritize deep geometric male synthesizers (David/Google Male)
      const target = englishVoices.find(
        (v) =>
          v.name.includes("David") ||
          v.name.includes("Microsoft David") ||
          v.name.includes("Google UK English Male") ||
          v.name.includes("Male")
      );
      return target || englishVoices[Math.min(1, englishVoices.length - 1)];
    }
  }

  // Core Speech Synthesis Method with custom Decaying-Volume Echo Cascade
  public speak(text: string, options: SpeakOptions = {}) {
    if (typeof window === "undefined" || !window.speechSynthesis || this.isMuted) return;

    // Immediately interrupt any ongoing speech to prevent overlapping queues
    window.speechSynthesis.cancel();

    const selectedVoiceType = options.voiceType || this.activeNarrator;
    const rate = options.rate ?? 0.95; // Softly slower for clear diction
    const pitch = options.pitch ?? (selectedVoiceType === "male" ? 0.85 : 1.05);
    const triggerEcho = options.echo ?? true;

    const systemVoice = this.findSystemVoice(selectedVoiceType);

    // 1. Primary Main Speech Utterance
    const mainUtterance = new SpeechSynthesisUtterance(text);
    if (systemVoice) mainUtterance.voice = systemVoice;
    mainUtterance.rate = rate;
    mainUtterance.pitch = pitch;
    mainUtterance.volume = 1.0; // Max volume

    window.speechSynthesis.speak(mainUtterance);

    // 2. FIXED: Deployed Decaying-Volume Echo Cascade (Simulates tactical cyber-reverb)
    if (triggerEcho && !this.isMuted) {
      // Delay Echo 1 (130ms delay at 18% volume)
      setTimeout(() => {
        if (window.speechSynthesis.speaking && !this.isMuted) {
          const echo1 = new SpeechSynthesisUtterance(text);
          if (systemVoice) echo1.voice = systemVoice;
          echo1.rate = rate;
          echo1.pitch = pitch - 0.05; // Slightly lower pitch for decay effect
          echo1.volume = 0.18;
          window.speechSynthesis.speak(echo1);
        }
      }, 130);

      // Delay Echo 2 (260ms delay at 6% volume)
      setTimeout(() => {
        if (window.speechSynthesis.speaking && !this.isMuted) {
          const echo2 = new SpeechSynthesisUtterance(text);
          if (systemVoice) echo2.voice = systemVoice;
          echo2.rate = rate;
          echo2.pitch = pitch - 0.1;
          echo2.volume = 0.06;
          window.speechSynthesis.speak(echo2);
        }
      }, 260);
    }
  }

  // Stops all speech immediately
  public stop() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

// Export as a single, global, state-retaining singleton instance
export const voiceEngine = new VoiceEngine();
export default voiceEngine;