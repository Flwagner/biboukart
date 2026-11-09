import { characters, karts, trackDefinitions, type PlayerConfig } from './config';
export interface Selection {
  count: number;
  track: number;
  players: PlayerConfig[];
}
export function loadSelection(): Selection | null {
  try {
    const s = JSON.parse(localStorage.getItem('biboukart-selection-v1') || 'null');
    if (
      !s ||
      !Number.isInteger(s.count) ||
      s.count < 1 ||
      s.count > 4 ||
      !Number.isInteger(s.track) ||
      s.track < 0 ||
      s.track >= trackDefinitions.length ||
      !Array.isArray(s.players) ||
      s.players.length !== 4
    )
      return null;
    if (
      !s.players.every(
        (p: PlayerConfig) =>
          p &&
          Number.isInteger(p.character) &&
          p.character >= 0 &&
          p.character < characters.length &&
          Number.isInteger(p.kart) &&
          p.kart >= 0 &&
          p.kart < karts.length,
      )
    )
      return null;
    // Hardware indices are not persistent identities; controllers are reassigned per session.
    return {
      count: s.count,
      track: s.track,
      players: s.players.map((p: PlayerConfig) => ({
        character: p.character,
        kart: p.kart,
        device: matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard',
        childMode: p.childMode === true,
      })),
    };
  } catch {
    return null;
  }
}
export function saveSelection(selection: Selection) {
  try {
    localStorage.setItem('biboukart-selection-v1', JSON.stringify(selection));
  } catch {
    /* Optional persistence. */
  }
}
