export type MenuAction = {
  pad: number;
  kind: 'move' | 'confirm' | 'back' | 'scroll';
  x: number;
  y: number;
};
type PadState = { confirm: boolean; back: boolean; x: number; y: number; repeatAt: number };

// Poll even during races/capture so held buttons never validate a newly opened menu.
export class MenuGamepad {
  private states = new Map<number, PadState>();
  poll(
    pads: readonly (Pick<Gamepad, 'index' | 'connected' | 'axes' | 'buttons'> | null)[],
    now: number,
  ): MenuAction[] {
    const actions: MenuAction[] = [];
    const connected = new Set<number>();
    for (const pad of pads) {
      if (!pad?.connected) continue;
      connected.add(pad.index);
      const previous = this.states.get(pad.index);
      const x =
        pad.buttons[15]?.pressed || pad.axes[0] > 0.5
          ? 1
          : pad.buttons[14]?.pressed || pad.axes[0] < -0.5
            ? -1
            : 0;
      const y =
        pad.buttons[13]?.pressed || pad.axes[1] > 0.5
          ? 1
          : pad.buttons[12]?.pressed || pad.axes[1] < -0.5
            ? -1
            : 0;
      const confirm = !!pad.buttons[0]?.pressed;
      const back = !!pad.buttons[1]?.pressed;
      let repeatAt = previous?.repeatAt ?? now;
      if (back && !previous?.back) actions.push({ pad: pad.index, kind: 'back', x: 0, y: 0 });
      else if (confirm && !previous?.confirm)
        actions.push({ pad: pad.index, kind: 'confirm', x: 0, y: 0 });
      else if (x || y) {
        const changed = previous?.x !== x || previous?.y !== y;
        if (changed || now >= repeatAt) {
          actions.push({ pad: pad.index, kind: 'move', x, y });
          repeatAt = now + (changed ? 400 : 160);
        }
      }
      const scroll = pad.axes[3] ?? 0;
      if (Math.abs(scroll) > 0.25)
        actions.push({ pad: pad.index, kind: 'scroll', x: 0, y: scroll });
      this.states.set(pad.index, { confirm, back, x, y, repeatAt });
    }
    for (const index of this.states.keys()) if (!connected.has(index)) this.states.delete(index);
    return actions;
  }
}

export function menuFocusables(root: HTMLElement) {
  const elements = Array.from(
    root.querySelectorAll<HTMLElement>('button,select,input,a[href]'),
  ).filter(
    (el) => el.offsetParent !== null && !el.matches(':disabled,[hidden]') && el.tabIndex >= 0,
  );
  // Keep game choices together; the logo and sound toggle remain reachable at the end.
  return [
    ...elements.filter((el) => !el.closest('.topbar')),
    ...elements.filter((el) => el.closest('.topbar')),
  ];
}

export function focusMenuControl(element: HTMLElement) {
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export function applyMenuAction(
  root: HTMLElement,
  action: MenuAction,
  initial: HTMLElement | null,
) {
  const elements = menuFocusables(root);
  if (!elements.length) return;
  let active = document.activeElement as HTMLElement;
  if (!elements.includes(active)) {
    active = initial && elements.includes(initial) ? initial : elements[0];
    focusMenuControl(active);
    if (action.kind === 'move') return;
  }
  if (action.kind === 'move') {
    if (action.x && !action.y && active instanceof HTMLSelectElement) {
      const options = Array.from(active.options).filter((o) => !o.disabled);
      const index = options.indexOf(active.selectedOptions[0]);
      const option = options[(index + action.x + options.length) % options.length];
      if (option) {
        active.value = option.value;
        active.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (
      action.x &&
      !action.y &&
      active instanceof HTMLInputElement &&
      active.type === 'range'
    ) {
      if (action.x > 0) active.stepUp();
      else active.stepDown();
      active.dispatchEvent(new Event('input', { bubbles: true }));
      active.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      const direction = action.y || action.x;
      focusMenuControl(
        elements[(elements.indexOf(active) + direction + elements.length) % elements.length],
      );
    }
  } else if (action.kind === 'confirm') {
    if (active instanceof HTMLSelectElement) {
      applyMenuAction(root, { ...action, kind: 'move', x: 1, y: 0 }, initial);
    } else if (!(active instanceof HTMLInputElement && active.type === 'range')) active.click();
  }
}
