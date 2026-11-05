import { describe, it, expect } from 'vitest';
import { Audio } from '../src/audio';
import { musicScore, MUSIC_SECONDS, MUSIC_BPM } from '../src/music';
import { midiFrequency } from '../src/synth';
describe('original soundtrack and resilient mixer', () => {
  it('composes a deterministic eight-bar score with three distinct voices', () => {
    const score = musicScore();
    expect(score).toEqual(musicScore());
    expect(new Set(score.map((note) => note.voice))).toEqual(new Set(['lead', 'bass', 'chord']));
    expect(score.length).toBeGreaterThan(150);
    for (const note of score) {
      expect(note.time).toBeGreaterThanOrEqual(0);
      expect(note.time + note.duration).toBeLessThanOrEqual(MUSIC_SECONDS);
      expect(note.volume).toBeGreaterThan(0);
      expect(note.midi).toBeGreaterThan(20);
    }
    expect(MUSIC_SECONDS).toBeCloseTo((32 * 60) / MUSIC_BPM);
  });
  it('tunes notes at concert pitch', () => {
    expect(midiFrequency(69)).toBe(440);
    expect(midiFrequency(81)).toBe(880);
  });
  it('clamps the three independent mixer levels and keeps mute at zero', () => {
    const audio = new Audio();
    audio.volume = 2;
    audio.musicVolume = -1;
    audio.effectsVolume = 0.25;
    expect(audio.volume).toBe(1);
    expect(audio.musicVolume).toBe(0);
    expect(audio.effectsVolume).toBe(0.25);
    audio.volume = 0;
    audio.setPaused(true);
    audio.setPaused(false);
    expect(audio.volume).toBe(0);
  });
  it('continues without Web Audio or an audio device', async () => {
    const audio = new Audio();
    await expect(audio.unlock()).resolves.toBeUndefined();
    expect(() => {
      audio.play('pickup');
      audio.update(20, true);
      audio.setPaused(true);
    }).not.toThrow();
  });
});
