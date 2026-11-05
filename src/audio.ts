export class Audio {
  context: AudioContext | null = null;
  volume = 0.3;
  engine: OscillatorNode | null = null;
  gain: GainNode | null = null;
  async unlock() {
    try {
      if (!this.context) this.context = new AudioContext();
      await this.context.resume();
      if (!this.engine) {
        this.engine = this.context.createOscillator();
        this.gain = this.context.createGain();
        this.engine.type = 'sawtooth';
        this.gain.gain.value = 0;
        this.engine.connect(this.gain).connect(this.context.destination);
        this.engine.start();
      }
    } catch {
      /* Audio remains optional. */
    }
  }
  tone(freq: number, duration = 0.12) {
    if (!this.context || !this.volume) return;
    const o = this.context.createOscillator(),
      g = this.context.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, this.context.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * 0.6, this.context.currentTime + duration);
    g.gain.setValueAtTime(this.volume * 0.12, this.context.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
    o.connect(g).connect(this.context.destination);
    o.start();
    o.stop(this.context.currentTime + duration);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  update(speed: number, active: boolean) {
    if (this.context && this.engine && this.gain) {
      this.engine.frequency.setTargetAtTime(
        45 + Math.abs(speed) * 3,
        this.context.currentTime,
        0.12,
      );
      this.gain.gain.setTargetAtTime(
        active ? this.volume * 0.018 : 0,
        this.context.currentTime,
        0.05,
      );
    }
  }
}
