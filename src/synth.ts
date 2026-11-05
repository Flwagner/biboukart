/** Small, click-free synthesis primitives shared by music and sound effects. */
export function tone(
  context: BaseAudioContext,
  output: AudioNode,
  frequency: number,
  time: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  endFrequency = frequency,
) {
  const oscillator = context.createOscillator(),
    envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, time);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), time + duration);
  envelope.gain.setValueAtTime(0, time);
  envelope.gain.linearRampToValueAtTime(volume, time + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  oscillator.connect(envelope).connect(output);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.01);
  oscillator.onended = () => {
    oscillator.disconnect();
    envelope.disconnect();
  };
}
export function makeNoise(context: BaseAudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate),
    data = buffer.getChannelData(0);
  let seed = 73;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = (seed / 4294967296) * 2 - 1;
  }
  return buffer;
}
export function noise(
  context: BaseAudioContext,
  output: AudioNode,
  buffer: AudioBuffer,
  time: number,
  duration: number,
  volume: number,
  frequency: number,
  endFrequency = frequency,
  type: BiquadFilterType = 'bandpass',
) {
  const source = context.createBufferSource(),
    filter = context.createBiquadFilter(),
    envelope = context.createGain();
  source.buffer = buffer;
  source.loop = true;
  filter.type = type;
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(frequency, time);
  filter.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
  envelope.gain.setValueAtTime(0, time);
  envelope.gain.linearRampToValueAtTime(volume, time + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  source.connect(filter).connect(envelope).connect(output);
  source.start(time);
  source.stop(time + duration + 0.01);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    envelope.disconnect();
  };
}
export const midiFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
