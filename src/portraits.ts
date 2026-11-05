import type { karts } from './config';

/** Side-view silhouettes match the procedural bodies used in races. */
export function kartPortrait(kart: (typeof karts)[number]) {
  const silhouettes: Record<string, string> = {
    classic: '<path d="M12 24h76v18H12z"/>',
    round: '<ellipse cx="50" cy="32" rx="39" ry="15"/>',
    formula: '<path d="M8 35 74 29 89 38H8Zm5-17h22v5H13zm7 4h4v13h-4Z"/>',
    wedge:
      '<path d="m12 22 35-4 43 18v8H12Z"/><path d="M20 37h59" stroke="#b7f9ef" stroke-width="3"/>',
    buggy:
      '<path d="M12 24h65l12 12v8H12Z"/><path d="M24 24V7h32l9 17" fill="none" stroke="#273442" stroke-width="5"/>',
    retro:
      '<path d="M10 28h48V17h20l8 11v16H10Z"/><path d="M9 35h80" stroke="#d5e3df" stroke-width="4"/>',
    rocket:
      '<path d="M10 25Q65 12 92 35 65 48 10 41Z"/><path d="m16 26 8-20 13 20Z"/><ellipse cx="17" cy="34" rx="10" ry="8" fill="#273442"/>',
    beetle:
      '<path d="M10 39C9 5 62 6 90 35v9H10Z"/><path d="m45 16 22 8" stroke="#fff1c4" stroke-width="3"/><circle cx="30" cy="26" r="4" fill="#273442"/>',
  };
  return `<svg class="kart-preview" viewBox="0 0 100 58" role="img" aria-label="${kart.name} — ${kart.description}" xmlns="http://www.w3.org/2000/svg"><g fill="${kart.color}" stroke="#273442" stroke-width="2" stroke-linejoin="round">${silhouettes[kart.shape]}</g><g fill="#273442"><circle cx="25" cy="44" r="${kart.shape === 'buggy' ? 12 : 9}"/><circle cx="76" cy="44" r="${kart.shape === 'buggy' ? 12 : 9}"/></g><g fill="#a6b6c1"><circle cx="25" cy="44" r="4"/><circle cx="76" cy="44" r="4"/></g></svg>`;
}

/** Inline, original portraits: the selected coat colour is visible even in the HUD. */
export function petPortrait(kind: 'rabbit' | 'cat') {
  const rabbit = kind === 'rabbit';
  const coat = rabbit ? '#171a20' : '#f7f7f1',
    outline = '#344451';
  const ears = rabbit
    ? '<ellipse cx="22" cy="18" rx="7" ry="16"/><ellipse cx="42" cy="18" rx="7" ry="16"/>'
    : '<path d="M12 34 9 8 30 23M34 23 55 8 52 34Z"/>';
  return `<svg class="character-icon" viewBox="0 0 64 64" role="img" aria-label="${rabbit ? 'Couscous, lapin noir' : 'Raclette, chat blanc'}" xmlns="http://www.w3.org/2000/svg"><g fill="${coat}" stroke="${outline}" stroke-width="2" stroke-linejoin="round">${ears}<ellipse cx="32" cy="42" rx="25" ry="20"/></g>${rabbit ? '<ellipse cx="22" cy="17" rx="3" ry="11" fill="#b18f9d"/><ellipse cx="42" cy="17" rx="3" ry="11" fill="#b18f9d"/>' : '<path d="m14 16 3 14 8-6m14 0 8 6 3-14" fill="#e6b8bd"/>'}<ellipse cx="22" cy="39" rx="5" ry="6" fill="${rabbit ? '#fff0cb' : '#8ebfa9'}"/><ellipse cx="42" cy="39" rx="5" ry="6" fill="${rabbit ? '#fff0cb' : '#8ebfa9'}"/><g fill="#182630"><ellipse cx="23" cy="39" rx="2" ry="4"/><ellipse cx="41" cy="39" rx="2" ry="4"/></g><path d="m28 47 4 4 4-4Z" fill="#d994a4"/><path d="M32 51v4m-7-2q7 7 14 0" fill="none" stroke="${rabbit ? '#d8c5cf' : outline}" stroke-width="1.5"/>${rabbit ? '' : '<path d="M6 44l12 3M5 51l13-1m28-3 12-3m-12 6 13 1" stroke="#76848b" stroke-width="1.5"/>'}</svg>`;
}
