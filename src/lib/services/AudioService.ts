/*
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * AudioService - Enhanced audio generation for timer events
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

export class AudioService {
  private audioContext: AudioContext | null = null;
  private unlocked = false;

  // Audio settings (injected from settings store)
  private masterVolume = 0.7;
  private leadInEnabled = true;
  private continuousTicksEnabled = false;
  private perRepBeepsEnabled = false;
  private warningTonesEnabled = true;

  constructor() {}

  /**
   * Initialize and unlock audio context (must be called on user gesture)
   */
  public unlock(): void {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.error('Failed to create AudioContext:', error);
        return;
      }
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(err => {
        console.error('Failed to resume AudioContext:', err);
      });
    }

    this.unlocked = true;
  }

  /**
   * Play a tone with smooth envelope to prevent clicks
   * @param frequency - Frequency in Hz
   * @param duration - Duration in seconds
   */
  private playBeep(frequency: number, duration: number): void {
    if (!this.unlocked || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    // Smooth envelope to prevent clicks
    const attack = 0.015;  // 15ms attack
    const release = 0.030; // 30ms release
    const volume = this.masterVolume ?? 0.7;

    osc.frequency.value = frequency;
    osc.type = 'sine';

    // Envelope: 0 -> volume -> volume -> 0
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.setValueAtTime(volume, now + duration - release);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + duration);

    // Automatic cleanup to prevent memory leaks
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  /**
   * Play double-chirp warning tone
   */
  private playWarningChirp(): void {
    if (!this.unlocked || !this.audioContext) return;

    const now = this.audioContext.currentTime;

    // First chirp at 1000Hz
    this.playBeep(1000, 0.12);

    // Second chirp at 1200Hz, scheduled 130ms later using AudioContext time
    setTimeout(() => {
      if (this.audioContext) {
        this.playBeep(1200, 0.10);
      }
    }, 130);
  }

  // === Phase-based public methods ===

  /**
   * Called when an exercise starts
   */
  public onExerciseStart(): void {
    this.playBeep(880, 0.20); // A5 - bright start tone
  }

  /**
   * Called when an exercise ends
   */
  public onExerciseEnd(): void {
    this.playBeep(440, 0.20); // A4 - lower end tone
  }

  /**
   * Called when a rest period starts
   */
  public onRestStart(): void {
    this.playBeep(350, 0.20); // Calming low tone
  }

  /**
   * Called for countdown steps (3, 2, 1)
   * @param step - The countdown number (3, 2, or 1)
   */
  public onCountdown(step: number): void {
    if (!this.leadInEnabled) return;

    const frequencyMap: Record<number, number> = {
      3: 500,  // Low
      2: 650,  // Medium
      1: 800   // High - creates rising urgency
    };

    const freq = frequencyMap[step] ?? 650;
    const duration = step === 1 ? 0.22 : 0.18;

    this.playBeep(freq, duration);
  }

  /**
   * Called on each tick during continuous exercise timing
   */
  public onTick(): void {
    if (!this.continuousTicksEnabled) return;
    this.playBeep(750, 0.08); // Short, neutral tick
  }

  /**
   * Called for rep completion during rep-based exercises
   */
  public onRepComplete(): void {
    if (!this.perRepBeepsEnabled) return;
    this.playBeep(1000, 0.06); // Quick, high ping
  }

  /**
   * Called for warning (e.g., approaching end of exercise/rest)
   */
  public onWarning(): void {
    if (!this.warningTonesEnabled) return;
    this.playWarningChirp();
  }

  /**
   * Called when session completes - plays ascending chime
   */
  public onSessionComplete(): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)
    const noteDuration = 0.15;

    notes.forEach((frequency, index) => {
      const startTime = now + (index * noteDuration);

      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.frequency.value = frequency;
      osc.type = 'sine';

      const attack = 0.01;
      const release = 0.05;
      const volume = this.masterVolume ?? 0.7;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + attack);
      gain.gain.setValueAtTime(volume, startTime + noteDuration - release);
      gain.gain.linearRampToValueAtTime(0, startTime + noteDuration);

      osc.connect(gain);
      gain.connect(this.audioContext!.destination);

      osc.start(startTime);
      osc.stop(startTime + noteDuration);

      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });
  }

  // === Legacy methods for backward compatibility ===

  /**
   * @deprecated Use onCountdown(step) instead
   */
  playCountdownTick(volume: number = 0.3): void {
    const prevVolume = this.masterVolume;
    this.masterVolume = volume;
    this.onCountdown(3); // Use middle frequency as default
    this.masterVolume = prevVolume;
  }

  /**
   * @deprecated Use onTick() instead
   */
  playDurationTick(volume: number = 0.3): void {
    const prevVolume = this.masterVolume;
    this.masterVolume = volume;
    this.onTick();
    this.masterVolume = prevVolume;
  }

  /**
   * @deprecated Use onRepComplete() instead
   */
  playRepBeep(volume: number = 0.3): void {
    const prevVolume = this.masterVolume;
    this.masterVolume = volume;
    this.onRepComplete();
    this.masterVolume = prevVolume;
  }

  /**
   * @deprecated Use onRestStart() instead
   */
  playRestTick(volume: number = 0.3): void {
    const prevVolume = this.masterVolume;
    this.masterVolume = volume;
    this.onRestStart();
    this.masterVolume = prevVolume;
  }

  /**
   * @deprecated Use onSessionComplete() instead
   */
  playComplete(volume: number = 0.3): void {
    const prevVolume = this.masterVolume;
    this.masterVolume = volume;
    this.onSessionComplete();
    this.masterVolume = prevVolume;
  }

  // === Configuration methods ===

  /**
   * Set master volume (0.0 to 1.0)
   */
  public setMasterVolume(value: number): void {
    this.masterVolume = Math.max(0, Math.min(1, value));
  }

  /**
   * Enable/disable 3-2-1 countdown lead-in
   */
  public setLeadInEnabled(enabled: boolean): void {
    this.leadInEnabled = enabled;
  }

  /**
   * Enable/disable continuous ticks during duration exercises
   */
  public setContinuousTicksEnabled(enabled: boolean): void {
    this.continuousTicksEnabled = enabled;
  }

  /**
   * Enable/disable beeps on each rep completion
   */
  public setPerRepBeepsEnabled(enabled: boolean): void {
    this.perRepBeepsEnabled = enabled;
  }

  /**
   * Enable/disable warning tones
   */
  public setWarningTonesEnabled(enabled: boolean): void {
    this.warningTonesEnabled = enabled;
  }

  /**
   * Clean up audio context
   */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close().catch(err => {
        console.error('Failed to close AudioContext:', err);
      });
      this.audioContext = null;
      this.unlocked = false;
    }
  }
}

// Export singleton instance
export const audioService = new AudioService();
