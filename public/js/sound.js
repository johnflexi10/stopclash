class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Quick helper to create oscillator and gain nodes
  createNode(type, freq, duration, gainStart = 0.1) {
    this.init();
    if (!this.ctx) return null;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(gainStart, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    return { osc, gain };
  }

  // Click sound for button feedback
  playClick() {
    try {
      const sound = this.createNode('triangle', 600, 0.08, 0.15);
      if (!sound) return;
      sound.osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);
      sound.osc.start();
      sound.osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // Classic digital clock tick
  playTick() {
    try {
      const sound = this.createNode('sine', 800, 0.03, 0.05);
      if (!sound) return;
      sound.osc.start();
      sound.osc.stop(this.ctx.currentTime + 0.03);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // Alarm buzzer for Stop trigger
  playBuzzer() {
    try {
      this.init();
      if (!this.ctx) return;
      
      const duration = 0.5;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc2.frequency.setValueAtTime(122, this.ctx.currentTime); // minor detune for fatness

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + duration);
      osc2.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // Play upward arpeggio on round start
  playStart() {
    try {
      this.init();
      if (!this.ctx) return;

      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          const sound = this.createNode('sine', freq, 0.2, 0.08);
          if (sound) {
            sound.osc.start();
            sound.osc.stop(this.ctx.currentTime + 0.2);
          }
        }, idx * 100);
      });
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // Play cheerful victory arpeggio
  playVictory() {
    try {
      this.init();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          const sound = this.createNode('triangle', freq, 0.3, 0.1);
          if (sound) {
            sound.osc.start();
            sound.osc.stop(this.ctx.currentTime + 0.3);
          }
        }, idx * 120);
      });
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // Play sad downward sweep on round loss / time out
  playDefeat() {
    try {
      this.init();
      if (!this.ctx) return;

      const sound = this.createNode('sawtooth', 300, 0.6, 0.1);
      if (!sound) return;
      sound.osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.6);
      sound.osc.start();
      sound.osc.stop(this.ctx.currentTime + 0.6);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }
}

// Global sound manager instance
const sound = new SoundEngine();
