import { makeNoise, midiFrequency, noise, tone } from './synth';
export const MUSIC_BPM = 116;
export const MUSIC_SECONDS = (8 * 4 * 60) / MUSIC_BPM;
export interface MusicNote {
  midi: number;
  time: number;
  duration: number;
  volume: number;
  voice: 'lead' | 'bass' | 'chord';
}
/** Original eight-bar C / Am / F / G theme, never downloaded from a third party. */
export function musicScore(): MusicNote[] {
  const beat = 60 / MUSIC_BPM,
    notes: MusicNote[] = [];
  const chords = [
    [48, 52, 55],
    [48, 52, 55],
    [45, 48, 52],
    [45, 48, 52],
    [41, 45, 48],
    [41, 45, 48],
    [43, 47, 50],
    [43, 47, 50],
  ];
  const melody = [
    [72, 76, 79, 76, 74, 76, 79, -1],
    [76, 79, 81, 79, 76, 74, 72, -1],
    [69, 72, 76, 79, 76, 72, 71, -1],
    [72, 76, 81, 79, 76, 74, 72, 69],
    [72, 77, 81, 79, 77, 76, 74, -1],
    [77, 76, 72, 69, 72, 74, 76, -1],
    [71, 74, 79, 81, 79, 76, 74, 71],
    [74, 79, 83, 81, 79, 76, 74, 71],
  ];
  for (let bar = 0; bar < 8; bar++) {
    for (let step = 0; step < 8; step++) {
      const time = (bar * 4 + step * 0.5) * beat;
      if (melody[bar][step] >= 0)
        notes.push({
          midi: melody[bar][step],
          time,
          duration: beat * 0.43,
          volume: step % 2 ? 0.085 : 0.115,
          voice: 'lead',
        });
      notes.push({
        midi: chords[bar][step % 4 === 3 ? 2 : 0] - 12,
        time,
        duration: beat * 0.4,
        volume: step % 2 ? 0.085 : 0.12,
        voice: 'bass',
      });
    }
    for (const offset of [0, 2])
      for (const midi of chords[bar])
        notes.push({
          midi: midi + 12,
          time: (bar * 4 + offset) * beat,
          duration: beat * 0.8,
          volume: 0.035,
          voice: 'chord',
        });
  }
  return notes;
}
export async function renderMusic(): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(1, Math.ceil(MUSIC_SECONDS * 22050), 22050);
  const output = context.createBiquadFilter();
  output.type = 'lowpass';
  output.frequency.value = 3800;
  output.connect(context.destination);
  const echo = context.createDelay(1),
    feedback = context.createGain(),
    wet = context.createGain();
  echo.delayTime.value = (60 / MUSIC_BPM) * 0.75;
  feedback.gain.value = 0.18;
  wet.gain.value = 0.18;
  echo.connect(feedback).connect(echo);
  echo.connect(wet).connect(output);
  const lead = context.createGain();
  lead.connect(output);
  lead.connect(echo);
  for (const note of musicScore())
    tone(
      context,
      note.voice === 'lead' ? lead : output,
      midiFrequency(note.midi),
      note.time,
      note.duration,
      note.volume,
      note.voice === 'bass' ? 'sine' : 'triangle',
    );
  const buffer = makeNoise(context),
    beat = 60 / MUSIC_BPM;
  for (let step = 0; step < 64; step++) {
    const time = step * beat * 0.5;
    noise(context, output, buffer, time, 0.045, step % 2 ? 0.025 : 0.016, 6500, 5000, 'highpass');
    if (step % 4 === 0) tone(context, output, 125, time, 0.18, 0.28, 'sine', 38);
    if (step % 4 === 2) {
      noise(context, output, buffer, time, 0.11, 0.09, 1700, 1100);
      tone(context, output, 170, time, 0.08, 0.035, 'triangle', 90);
    }
  }
  const rendered = await context.startRendering(),
    data = rendered.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  if (peak > 0.8) for (let i = 0; i < data.length; i++) data[i] *= 0.8 / peak;
  // Gentle seam fade prevents clicks at the exact loop boundary.
  for (let i = 0; i < 220; i++) {
    data[i] *= i / 220;
    data[data.length - 1 - i] *= i / 220;
  }
  return rendered;
}
