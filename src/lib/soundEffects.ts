// Sound effects utility for quiz interactions
// Uses Web Audio API to generate short sound effects

class SoundEffects {
  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize AudioContext only when needed (user interaction required)
    this.initAudioContext = this.initAudioContext.bind(this);
  }

  private initAudioContext() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Web Audio API not supported:', error);
      }
    }
    return this.audioContext;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) {
    const context = this.initAudioContext();
    if (!context) return;

    // Resume context if suspended (required for user interaction)
    if (context.state === 'suspended') {
      context.resume();
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.type = type;

    // Envelope to prevent clicks
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + duration);
  }

  // Click sound for starting a question
  playClick() {
    this.playTone(800, 0.1, 'square', 0.05);
  }

  // Happy sound for correct answers
  playCorrect() {
    const context = this.initAudioContext();
    if (!context) return;

    // Play a pleasant ascending chord
    setTimeout(() => this.playTone(523, 0.15, 'sine', 0.08), 0);   // C5
    setTimeout(() => this.playTone(659, 0.15, 'sine', 0.06), 50);  // E5
    setTimeout(() => this.playTone(784, 0.2, 'sine', 0.04), 100);  // G5
  }

  // Sad sound for wrong answers
  playWrong() {
    const context = this.initAudioContext();
    if (!context) return;

    // Play a descending tone
    if (context.state === 'suspended') {
      context.resume();
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    // Start high and slide down
    oscillator.frequency.setValueAtTime(400, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, context.currentTime + 0.3);
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.06, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.3);
  }
}

// Create a singleton instance
export const soundEffects = new SoundEffects();

// Hook for React components
export function useSoundEffects() {
  return {
    playClick: () => soundEffects.playClick(),
    playCorrect: () => soundEffects.playCorrect(),
    playWrong: () => soundEffects.playWrong(),
  };
}