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
