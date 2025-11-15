/*
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * AudioService - Handles audio generation for timer events
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

export class AudioService {
  private audioContext: AudioContext | null = null;
  private unlocked = false;

  /**
   * Initialize the AudioContext (call on first user interaction for mobile)
   */
  private initAudioContext(): void {
    if (this.audioContext) {
      return;
    }

    try {
      // Create AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Resume context if suspended (mobile browsers)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.unlocked = true;
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
    }
  }

  /**
   * Ensure audio context is ready before playing sounds
   */
  private ensureAudioContext(): AudioContext | null {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.initAudioContext();
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    return this.audioContext;
  }

  /**
   * Play a tone with specified frequency and duration
   */
  private playTone(
    frequency: number,
    duration: number,
    volume: number = 0.3,
    waveType: OscillatorType = 'sine'
  ): void {
    const context = this.ensureAudioContext();
    if (!context) {
      return;
    }

    try {
      const currentTime = context.currentTime;

      // Create oscillator for tone
      const oscillator = context.createOscillator();
      oscillator.type = waveType;
      oscillator.frequency.setValueAtTime(frequency, currentTime);

      // Create gain node for volume control and envelope
      const gainNode = context.createGain();

      // Envelope to prevent clicks: quick attack, sustain, quick release
      const attackTime = 0.01; // 10ms attack
      const releaseTime = 0.02; // 20ms release
      const sustainTime = duration / 1000 - attackTime - releaseTime;

      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, currentTime + attackTime);
      gainNode.gain.setValueAtTime(volume, currentTime + attackTime + sustainTime);
      gainNode.gain.linearRampToValueAtTime(0, currentTime + duration / 1000);

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      // Start and stop
      oscillator.start(currentTime);
      oscillator.stop(currentTime + duration / 1000);
    } catch (error) {
      console.error('Failed to play tone:', error);
    }
  }

  /**
   * Play a multi-tone chime (for completion sound)
   */
  private playChime(volume: number = 0.3): void {
    const context = this.ensureAudioContext();
    if (!context) {
      return;
    }

    try {
      const currentTime = context.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)
      const noteDuration = 0.15; // 150ms per note

      notes.forEach((frequency, index) => {
        const startTime = currentTime + (index * noteDuration);

        const oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);

        const gainNode = context.createGain();
        const attackTime = 0.01;
        const releaseTime = 0.05;
        const sustainTime = noteDuration - attackTime - releaseTime;

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + attackTime);
        gainNode.gain.setValueAtTime(volume, startTime + attackTime + sustainTime);
        gainNode.gain.linearRampToValueAtTime(0, startTime + noteDuration);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + noteDuration);
      });
    } catch (error) {
      console.error('Failed to play chime:', error);
    }
  }

  /**
   * Play countdown tick sound (start countdown)
   * Sharp 830Hz beep, 100ms
   */
  playCountdownTick(volume: number = 0.3): void {
    this.playTone(830, 100, volume, 'square');
  }

  /**
   * Play duration exercise countdown tick
   * Medium 700Hz beep, 100ms
   */
  playDurationTick(volume: number = 0.3): void {
    this.playTone(700, 100, volume, 'sine');
  }

  /**
   * Play rep completion beep
   * Quick 1000Hz ping, 50ms
   */
  playRepBeep(volume: number = 0.3): void {
    this.playTone(1000, 50, volume, 'sine');
  }

  /**
   * Play rest period countdown tick
   * Lower 600Hz beep, 100ms
   */
  playRestTick(volume: number = 0.3): void {
    this.playTone(600, 100, volume, 'triangle');
  }

  /**
   * Play session complete chime
   * Pleasant ascending chime
   */
  playComplete(volume: number = 0.3): void {
    this.playChime(volume);
  }

  /**
   * Unlock audio context (call on first user interaction)
   * Required for mobile browsers
   */
  unlock(): void {
    if (this.unlocked) {
      return;
    }

    this.initAudioContext();

    // Play a silent sound to unlock audio on mobile
    if (this.audioContext) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.01);

      this.unlocked = true;
    }
  }

  /**
   * Clean up audio context
   */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.unlocked = false;
    }
  }
}

// Export singleton instance
export const audioService = new AudioService();
