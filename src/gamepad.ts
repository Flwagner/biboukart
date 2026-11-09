export type PadControl =
  { kind: 'button'; index: number } | { kind: 'axis'; index: number; direction: -1 | 1 };
export const padActions = ['Accélérer', 'Freiner / reculer', 'Gauche', 'Droite', 'Objet', 'Pause'];
export const defaultPadBindings: PadControl[][] = [
  [
    { kind: 'button', index: 7 },
    { kind: 'button', index: 0 },
  ],
  [
    { kind: 'button', index: 6 },
    { kind: 'button', index: 1 },
  ],
  [{ kind: 'axis', index: 0, direction: -1 }],
  [{ kind: 'axis', index: 0, direction: 1 }],
  [{ kind: 'button', index: 2 }],
  [{ kind: 'button', index: 9 }],
];
export const freshPadBindings = () =>
  Array.from({ length: 4 }, () => defaultPadBindings.map((b) => b.map((c) => ({ ...c }))));
export function validPadBindings(value: unknown): value is PadControl[][][] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every(
      (profile) =>
        Array.isArray(profile) &&
        profile.length === padActions.length &&
        profile.every(
          (binding) =>
            Array.isArray(binding) &&
            binding.length > 0 &&
            binding.length <= 2 &&
            binding.every(
              (c) =>
                c &&
                Number.isInteger(c.index) &&
                c.index >= 0 &&
                c.index < 64 &&
                (c.kind === 'button' ||
                  (c.kind === 'axis' && (c.direction === -1 || c.direction === 1))),
            ),
        ),
    )
  );
}
export function padValue(pad: Gamepad, binding: PadControl[]) {
  return Math.max(
    0,
    ...binding.map((c) => {
      if (c.kind === 'button') {
        const button = pad.buttons[c.index];
        return button?.value ?? (button?.pressed ? 1 : 0);
      }
      const value = (pad.axes[c.index] ?? 0) * c.direction;
      return value > 0.15 ? Math.min(1, value) : 0;
    }),
  );
}
export function padPressed(pad: Gamepad, binding: PadControl[]) {
  return (
    padValue(pad, binding) > 0.5 ||
    binding.some((c) => c.kind === 'button' && pad.buttons[c.index]?.pressed)
  );
}
export function padControlLabel(control: PadControl) {
  const names = [
    'A / Croix',
    'B / Rond',
    'X / Carré',
    'Y / Triangle',
    'LB / L1',
    'RB / R1',
    'LT / L2',
    'RT / R2',
    'Back / Select',
    'Start / Options',
    'Stick gauche',
    'Stick droit',
    '↑',
    '↓',
    '←',
    '→',
    'Guide',
  ];
  return control.kind === 'button'
    ? `B${control.index} · ${names[control.index] ?? 'Bouton'}`
    : `Axe ${control.index} ${control.direction < 0 ? '−' : '+'}`;
}
