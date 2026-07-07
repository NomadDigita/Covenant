"use client";

export type NarratorType = "male" | "female";

interface SpeakOptions {
  voiceType?: NarratorType;
  rate?: number;  // Speed of narration
  pitch?: number; // Tone pitch
  echo?: boolean; // Airport Reverb Cascade
}

class VoiceEngine {
  private isMuted: boolean = false;
  private activeNarrator: NarratorType = "female";
  private activeAmbientCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.getVoices();
    }
  }

  public setMute(status: boolean) {
    this.isMuted = status;
    if (status) {
      this.stop();
      this.stopStarryAmbient();
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

  // Synthesizes an authentic 3-Tone Airport Terminal Announcement Chime
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
        const tones = [554.37, 440.00, 349.23];
        const duration = 0.28;
        const gap = 0.15;

        tones.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + index * gap);

          gain.gain.setValueAtTime(0.0, ctx.currentTime + index * gap);
          gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + index * gap + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * gap + duration);

          osc.start(ctx.currentTime + index * gap);
          osc.stop(ctx.currentTime + index * gap + duration);
        });

        setTimeout(() => {
          resolve();
        }, 650);

      } catch (e) {
        console.warn("Chime ignored by browser audio policies:", e);
        resolve();
      }
    });
  }

  // FIXED: Synthesizes a real-time, mixed "Starry Night Hum" and "Gold Shield Harmonics" ambient backdrop
  public playStarryAmbientSound() {
    if (typeof window === "undefined" || this.isMuted || this.activeAmbientCtx) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      this.activeAmbientCtx = ctx;

      // 1. Starry Night Hum: High-pitched sweeping sine waves (LFO-like sweep)
      const starOsc = ctx.createOscillator();
      const starGain = ctx.createGain();
      starOsc.connect(starGain);
      starGain.connect(ctx.destination);
      
      starOsc.type = "sine";
      starOsc.frequency.setValueAtTime(1000, ctx.currentTime);
      // Sweep frequency up and down slowly over 3 seconds
      starOsc.frequency.linearRampToValueAtTime(1150, ctx.currentTime + 1.5);
      starOsc.frequency.linearRampToValueAtTime(950, ctx.currentTime + 3.0);

      starGain.gain.setValueAtTime(0.015, ctx.currentTime);

      // 2. Gold Shield Harmonics: Deep perfect fifth triangle waves (A3: 220Hz and E4: 330Hz)
      const goldOsc1 = ctx.createOscillator();
      const goldOsc2 = ctx.createOscillator();
      const goldGain = ctx.createGain();

      goldOsc1.connect(goldGain);
      goldOsc2.connect(goldGain);
      goldGain.connect(ctx.destination);

      goldOsc1.type = "triangle";
      goldOsc1.frequency.setValueAtTime(220, ctx.currentTime);
      
      goldOsc2.type = "triangle";
      goldOsc2.frequency.setValueAtTime(330, ctx.currentTime);

      goldGain.gain.setValueAtTime(0.02, ctx.currentTime);

      // Begin ambient loops
      starOsc.start();
      goldOsc1.start();
      goldOsc2.start();

      // Soft decay and stop after 4.5 seconds to match the decryption page lengths
      starGain.gain.setValueAtTime(0.015, ctx.currentTime + 3.5);
      starGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.5);
      
      goldGain.gain.setValueAtTime(0.02, ctx.currentTime + 3.5);
      goldGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.5);

      starOsc.stop(ctx.currentTime + 4.5);
      goldOsc1.stop(ctx.currentTime + 4.5);
      goldOsc2.stop(ctx.currentTime + 4.5);

      setTimeout(() => {
        this.activeAmbientCtx = null;
      }, 4600);

    } catch (e) {
      console.warn("Ambient audio context blocked:", e);
    }
  }

  // Forces immediate stop on ambient loops
  public stopStarryAmbient() {
    if (this.activeAmbientCtx) {
      try {
        this.activeAmbientCtx.close();
      } catch {}
      this.activeAmbientCtx = null;
    }
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

  public speak(text: string, options: SpeakOptions = {}) {
    if (typeof window === "undefined" || !window.speechSynthesis || this.isMuted) return;

    window.speechSynthesis.cancel();

    const selectedVoiceType = options.voiceType || this.activeNarrator;
    const rate = options.rate ?? 0.92;
    const pitch = options.pitch ?? (selectedVoiceType === "male" ? 0.82 : 1.02);
    const triggerEcho = options.echo ?? true;

    const systemVoice = this.findSystemVoice(selectedVoiceType);

    const mainUtterance = new SpeechSynthesisUtterance(text);
    if (systemVoice) mainUtterance.voice = systemVoice;
    mainUtterance.rate = rate;
    mainUtterance.pitch = pitch;
    mainUtterance.volume = 1.0;

    window.speechSynthesis.speak(mainUtterance);

    if (triggerEcho && !this.isMuted) {
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