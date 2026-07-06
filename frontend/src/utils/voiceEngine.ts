"use client";

export type NarratorType = "male" | "female";

interface SpeakOptions {
  voiceType?: NarratorType;
  rate?: number;  // Speed
  pitch?: number; // Pitch Tone
  echo?: boolean; // Airport Reverb Cascade
}

class VoiceEngine {
  private isMuted: boolean = false;
  private activeNarrator: NarratorType = "female";

  constructor() {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.getVoices();
    }
  }

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

  // FIXED: Synthesizes an authentic 3-Tone Airport Terminal Announcement Chime
  public playAirportChime(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || this.isMuted) {
        resolve();
        return;
      }

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          resolve();
          return;
        }

        const ctx = new AudioContextClass();
        
        // 3-Tone frequencies mapping: C#5 (554.37 Hz) -> A4 (440.00 Hz) -> F4 (349.23 Hz)
        const tones = [554.37, 440.00, 349.23];
        const duration = 0.28; // Length of each note
        const gap = 0.15;      // Spacing between notes

        tones.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + index * gap);

          // Smooth exponential decay envelope per tone
          gain.gain.setValueAtTime(0.0, ctx.currentTime + index * gap);
          gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + index * gap + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * gap + duration);

          osc.start(ctx.currentTime + index * gap);
          osc.stop(ctx.currentTime + index * gap + duration);
        });

        // Resolve the promise exactly when the chime finishes playing (approx 600ms)
        setTimeout(() => {
          resolve();
        }, 650);

      } catch (e) {
        console.warn("Chime ignored by browser audio policies:", e);
        resolve();
      }
    });
  }

  private findSystemVoice(type: NarratorType): SpeechSynthesisVoice | null {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();

    const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
    if (englishVoices.length === 0) return null;

    if (type === "female") {
      const target = englishVoices.find(
        (v) =>
          v.name.includes("Google US English") ||
          v.name.includes("Zira") ||
          v.name.includes("Hazel") ||
          v.name.includes("Samantha")
      );
      return target || englishVoices[0];
    } else {
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

  // Speaks text with a high-fidelity 4-tier decaying airport echo cascade
  public speak(text: string, options: SpeakOptions = {}) {
    if (typeof window === "undefined" || !window.speechSynthesis || this.isMuted) return;

    window.speechSynthesis.cancel();

    const selectedVoiceType = options.voiceType || this.activeNarrator;
    const rate = options.rate ?? 0.92; // Softly slower for clear terminal diction
    const pitch = options.pitch ?? (selectedVoiceType === "male" ? 0.82 : 1.02);
    const triggerEcho = options.echo ?? true;

    const systemVoice = this.findSystemVoice(selectedVoiceType);

    // 1. Primary Announcement
    const mainUtterance = new SpeechSynthesisUtterance(text);
    if (systemVoice) mainUtterance.voice = systemVoice;
    mainUtterance.rate = rate;
    mainUtterance.pitch = pitch;
    mainUtterance.volume = 1.0;

    window.speechSynthesis.speak(mainUtterance);

    // 2. FIXED: Deployed 4-Tier Decaying Airport-Hall Reverb Cascade
    if (triggerEcho && !this.isMuted) {
      // Delay 1: 160ms (Volume 15%)
      setTimeout(() => {
        if (window.speechSynthesis.speaking && !this.isMuted) {
          const echo1 = new SpeechSynthesisUtterance(text);
          if (systemVoice) echo1.voice = systemVoice;
          echo1.rate = rate;
          echo1.pitch = pitch - 0.05;
          echo1.volume = 0.15;
          window.speechSynthesis.speak(echo1);
        }
      }, 160);

      // Delay 2: 320ms (Volume 7%)
      setTimeout(() => {
        if (window.speechSynthesis.speaking && !this.isMuted) {
          const echo2 = new SpeechSynthesisUtterance(text);
          if (systemVoice) echo2.voice = systemVoice;
          echo2.rate = rate;
          echo2.pitch = pitch - 0.1;
          echo2.volume = 0.07;
          window.speechSynthesis.speak(echo2);
        }
      }, 320);

      // Delay 3: 480ms (Volume 3%)
      setTimeout(() => {
        if (window.speechSynthesis.speaking && !this.isMuted) {
          const echo3 = new SpeechSynthesisUtterance(text);
          if (systemVoice) echo3.voice = systemVoice;
          echo3.rate = rate;
          echo3.pitch = pitch - 0.15;
          echo3.volume = 0.03;
          window.speechSynthesis.speak(echo3);
        }
      }, 480);

      // Delay 4: 640ms (Volume 1%) - Final decaying acoustic reflection
      setTimeout(() => {
        if (window.speechSynthesis.speaking && !this.isMuted) {
          const echo4 = new SpeechSynthesisUtterance(text);
          if (systemVoice) echo4.voice = systemVoice;
          echo4.rate = rate;
          echo4.pitch = pitch - 0.2;
          echo4.volume = 0.01;
          window.speechSynthesis.speak(echo4);
        }
      }, 640);
    }
  }

  public stop() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

export const voiceEngine = new VoiceEngine();
export default voiceEngine;