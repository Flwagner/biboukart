import type { Item } from './config';
import { renderMusic } from './music';
import { makeNoise } from './synth';
import { soundEffect } from './sounds';

export class Audio {
  context: AudioContext | null = null;
  master: GainNode | null = null;
  musicBus: GainNode | null = null;
  effectsBus: GainNode | null = null;
  musicSource: AudioBufferSourceNode | null = null;
  musicBuffer: AudioBuffer | null = null;
  private engine: OscillatorNode | null = null;
  private engineHarmonic: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private preparation: Promise<void> | null = null;
  private masterLevel = 0.3;
  private musicLevel = 0.55;
  private effectsLevel = 0.8;
  private paused = false;
  private recent = new Map<string, number>();
  lastSound = '';
  get volume() {
    return this.masterLevel;
  }
  set volume(value: number) {
    this.masterLevel = Math.max(0, Math.min(1, value));
    this.applyLevels();
  }
  get musicVolume() {
    return this.musicLevel;
  }
  set musicVolume(value: number) {
    this.musicLevel = Math.max(0, Math.min(1, value));
    this.applyLevels();
  }
  get effectsVolume() {
    return this.effectsLevel;
  }
  set effectsVolume(value: number) {
    this.effectsLevel = Math.max(0, Math.min(1, value));
    this.applyLevels();
  }
  private applyLevels() {
    if (!this.context) return;
    const time = this.context.currentTime;
    this.master?.gain.setTargetAtTime(this.paused ? 0 : this.masterLevel, time, 0.04);
    this.musicBus?.gain.setTargetAtTime(this.musicLevel * 0.65, time, 0.08);
    this.effectsBus?.gain.setTargetAtTime(this.effectsLevel, time, 0.04);
  }
  setPaused(value: boolean) {
    this.paused = value;
    this.applyLevels();
  }
  async unlock() {
    try {
      if (!this.context) {
        const context = (this.context = new AudioContext());
        this.master = context.createGain();
        this.musicBus = context.createGain();
        this.effectsBus = context.createGain();
        this.master.gain.value = this.paused ? 0 : this.masterLevel;
        this.musicBus.gain.value = this.musicLevel * 0.65;
        this.effectsBus.gain.value = this.effectsLevel;
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -12;
        compressor.knee.value = 15;
        compressor.ratio.value = 5;
        this.master.connect(compressor).connect(context.destination);
        this.musicBus.connect(this.master);
        this.effectsBus.connect(this.master);
        this.noiseBuffer = makeNoise(context);
        this.engine = context.createOscillator();
        this.engineHarmonic = context.createOscillator();
        this.engineGain = context.createGain();
        this.engineFilter = context.createBiquadFilter();
        this.engine.type = 'triangle';
        this.engineHarmonic.type = 'sawtooth';
        this.engineHarmonic.detune.value = 7;
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.value = 350;
        this.engineGain.gain.value = 0;
        this.engine.connect(this.engineFilter);
        this.engineHarmonic.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain).connect(this.effectsBus);
        this.engine.start();
        this.engineHarmonic.start();
        this.applyLevels();
      }
      await this.context.resume();
      if (!this.preparation) this.preparation = this.prepareMusic();
      await this.preparation;
    } catch {
      /* Unsupported or denied audio never prevents racing. */
    }
  }
  private async prepareMusic() {
    try {
      const buffer = await renderMusic();
      if (!this.context || !this.musicBus) return;
      this.musicBuffer = buffer;
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(this.musicBus);
      source.start();
      this.musicSource = source;
    } catch {
      /* Sound effects remain usable if offline synthesis is unavailable. */
    }
  }
  play(kind: string, item?: Item) {
    const context = this.context,
      output = this.effectsBus,
      buffer = this.noiseBuffer;
    if (
      !context ||
      !output ||
      !buffer ||
      context.state !== 'running' ||
      this.paused ||
      !this.masterLevel ||
      !this.effectsLevel
    )
      return;
    const sound = kind === 'item' ? (item ?? 'turbo') : kind,
      time = context.currentTime;
    if (time - (this.recent.get(sound) ?? -Infinity) < 0.08) return;
    this.recent.set(sound, time);
    this.lastSound = sound;
    soundEffect(context, output, buffer, sound, time);
  }
  update(speed: number, active: boolean) {
    if (!this.context || !this.engine || !this.engineHarmonic || !this.engineGain) return;
    const time = this.context.currentTime,
      rpm = 48 + Math.abs(speed) * 2.2;
    this.engine.frequency.setTargetAtTime(rpm, time, 0.12);
    this.engineHarmonic.frequency.setTargetAtTime(rpm * 0.5, time, 0.12);
    this.engineFilter?.frequency.setTargetAtTime(260 + Math.abs(speed) * 18, time, 0.12);
    this.engineGain.gain.setTargetAtTime(active ? 0.028 : 0, time, 0.06);
  }
}
