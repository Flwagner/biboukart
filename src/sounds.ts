import { midiFrequency, noise, tone } from './synth';
/** Layered one-shot voices, also renderable offline for waveform regression tests. */
export function soundEffect(
  context: BaseAudioContext,
  output: AudioNode,
  buffer: AudioBuffer,
  sound: string,
  time = context.currentTime,
) {
  const bell = (midi: number, offset = 0, duration = 0.24, volume = 0.16) => {
    const f = midiFrequency(midi);
    tone(context, output, f, time + offset, duration, volume);
    tone(context, output, f * 2, time + offset, duration * 0.55, volume * 0.18);
  };
  if (sound === 'pickup') {
    [84, 88, 91, 96].forEach((note, i) => bell(note, i * 0.055, 0.28, 0.12));
  } else if (sound === 'boost' || sound === 'turbo') {
    noise(context, output, buffer, time, 0.65, 0.2, 450, 2400);
    tone(context, output, 100, time, 0.4, 0.075, 'triangle', 520);
    [60, 67, 72].forEach((note, i) => bell(note, i * 0.065, 0.18, 0.06));
  } else if (sound === 'missile') {
    noise(context, output, buffer, time, 0.32, 0.23, 2800, 450);
    tone(context, output, 800, time, 0.18, 0.11, 'sawtooth', 160);
  } else if (sound === 'shield' || sound === 'block') {
    [74, 81, 86].forEach((note, i) => bell(note, i * 0.025, sound === 'block' ? 0.18 : 0.5, 0.09));
  } else if (sound === 'trap') {
    tone(context, output, 440, time, 0.2, 0.2, 'triangle', 90);
    bell(67, 0.12, 0.12, 0.06);
  } else if (sound === 'giant') {
    [48, 55, 60, 67].forEach((note, i) => bell(note, i * 0.09, 0.3, 0.12));
    tone(context, output, 70, time, 0.5, 0.16, 'triangle', 260);
  } else if (sound === 'shockwave') {
    tone(context, output, 120, time, 0.35, 0.12, 'triangle', 650);
  } else if (sound === 'shockwaveImpact') {
    tone(context, output, 110, time, 0.45, 0.25, 'sine', 28);
    noise(context, output, buffer, time, 0.4, 0.2, 1200, 100, 'lowpass');
  } else if (sound === 'splash') {
    noise(context, output, buffer, time, 0.25, 0.16, 650, 180, 'lowpass');
  } else if (sound === 'hit') {
    // A short, playful tyre skid follows the full turn, without a harsh explosion.
    noise(context, output, buffer, time, 0.55, 0.09, 1800, 450);
    tone(context, output, 620, time, 0.55, 0.075, 'triangle', 180);
    tone(context, output, 320, time + 0.12, 0.38, 0.045, 'sine', 110);
  } else if (sound === 'explosion') {
    noise(context, output, buffer, time, 0.19, 0.22, 850, 180, 'lowpass');
    tone(context, output, 140, time, 0.22, 0.24, 'sine', 32);
  } else if (sound === 'jump') {
    tone(context, output, 180, time, 0.22, 0.08, 'triangle', 520);
    noise(context, output, buffer, time, 0.2, 0.035, 600, 1800);
  } else if (sound === 'land') {
    tone(context, output, 90, time, 0.13, 0.12, 'sine', 38);
    noise(context, output, buffer, time, 0.1, 0.05, 400, 150, 'lowpass');
  } else if (sound === 'lastlap') {
    [79, 84, 91].forEach((note, i) => bell(note, i * 0.1, 0.22, 0.1));
  } else if (sound === 'finish') {
    [72, 76, 79, 84, 79, 84].forEach((note, i) => bell(note, i * 0.11, 0.36, 0.13));
  } else if (sound === 'go') {
    [84, 88, 91].forEach((note) => bell(note, 0, 0.38, 0.09));
  } else if (sound === 'countdown') tone(context, output, 660, time, 0.1, 0.16);
  else if (sound === 'click') bell(79, 0, 0.07, 0.07);
}
