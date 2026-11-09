import type { PlayerConfig, Settings } from './config';
import { idleInput, type Input } from './race';
import { padValue, padPressed, type PadControl } from './gamepad';
export class Inputs {
  keys = new Set<string>();
  touches = new Map<number, { player: number; action: string }>();
  touchState: Record<string, number>[] = [{}, {}, {}, {}];
  players: PlayerConfig[] = [];
  previousUse: boolean[] = [];
  onPause = () => {};
  onDisconnect = () => {};
  onRemap: ((code: string) => void) | null = null;
  pauseButtons = new Map<number, boolean>();
  onPadRemap: ((control: PadControl) => boolean) | null = null;
  private padRemapReady = false;
  private padRemapHeld = false;
  private padRemapBack: { pad: number; since: number } | null = null;
  private onPadRemapCancel: (() => void) | null = null;
  beginPadRemap(callback: (control: PadControl) => boolean, onCancel?: () => void) {
    this.onPadRemap = callback;
    this.padRemapReady = false;
    this.padRemapHeld = true;
    this.padRemapBack = null;
    this.onPadRemapCancel = onCancel ?? null;
  }
  cancelPadRemap() {
    this.onPadRemap = null;
    this.padRemapBack = null;
    this.onPadRemapCancel = null;
  }
  pollPadRemap(now = performance.now()) {
    if (!this.onPadRemap && !this.padRemapHeld) return false;
    const pads = Array.from(navigator.getGamepads?.() ?? []).filter((p): p is Gamepad => !!p);
    const neutral = pads.every(
      (p) =>
        p.buttons.every((b) => !b.pressed && b.value < 0.25) &&
        p.axes.every((a) => Math.abs(a) < 0.25),
    );
    if (!this.onPadRemap) {
      this.padRemapHeld = !neutral;
      return true;
    }
    if (this.padRemapBack) {
      const back = this.padRemapBack;
      const pad = pads.find((p) => p.index === back.pad);
      if (!pad) {
        this.padRemapBack = null;
        this.padRemapReady = false;
      } else if (pad.buttons[1]?.pressed) {
        if (now - back.since >= 800) {
          this.onPadRemapCancel?.();
          this.cancelPadRemap();
        }
      } else {
        this.padRemapBack = null;
        if (this.onPadRemap({ kind: 'button', index: 1 })) this.onPadRemap = null;
      }
      return true;
    }
    if (neutral) this.padRemapReady = true;
    if (!this.padRemapReady) return true;
    for (const pad of pads) {
      const button = pad.buttons.findIndex((b) => b.pressed || b.value > 0.65);
      const axis = pad.axes.findIndex((a) => Math.abs(a) > 0.65);
      const control: PadControl | null =
        button >= 0
          ? { kind: 'button', index: button }
          : axis >= 0
            ? { kind: 'axis', index: axis, direction: pad.axes[axis] < 0 ? -1 : 1 }
            : null;
      if (control) {
        this.padRemapReady = false;
        if (button === 1) {
          this.padRemapBack = { pad: pad.index, since: now };
          break;
        }
        if (this.onPadRemap(control)) this.onPadRemap = null;
        break;
      }
    }
    return true;
  }
  constructor(public settings: Settings) {
    addEventListener('keydown', (e) => {
      if (this.onRemap) {
        e.preventDefault();
        const callback = this.onRemap;
        this.onRemap = null;
        callback(e.code);
        return;
      }
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Escape' && !e.repeat) this.onPause();
      if (this.players.length) {
        if (
          this.settings.bindings.some((b) => b.includes(e.code)) ||
          ['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)
        )
          e.preventDefault();
        this.keys.add(e.code);
      }
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.clear());
    addEventListener('gamepaddisconnected', () => {
      this.clear();
      this.onDisconnect();
    });
    addEventListener('pointerup', (e) => this.release(e.pointerId));
    addEventListener('pointercancel', (e) => this.release(e.pointerId));
  }
  clear() {
    this.keys.clear();
    this.touches.clear();
    this.touchState = [{}, {}, {}, {}];
    this.previousUse = [];
  }
  pollPause() {
    for (const p of navigator.getGamepads?.() ?? []) {
      if (!p) continue;
      const pressed = this.players.some(
        (player, i) =>
          player.device === `pad:${p.index}` && padPressed(p, this.settings.padBindings[i][5]),
      );
      if (pressed && !this.pauseButtons.get(p.index)) this.onPause();
      this.pauseButtons.set(p.index, pressed);
    }
  }
  release(id: number) {
    const touch = this.touches.get(id);
    if (touch) {
      this.touchState[touch.player][touch.action] = Math.max(
        0,
        (this.touchState[touch.player][touch.action] ?? 0) - 1,
      );
      this.touches.delete(id);
    }
  }
  bindTouch(root: HTMLElement) {
    root.querySelectorAll<HTMLElement>('[data-action]').forEach((el) =>
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const player = Number(el.dataset.player),
          action = el.dataset.action!;
        this.release(e.pointerId);
        this.touches.set(e.pointerId, { player, action });
        this.touchState[player][action] = (this.touchState[player][action] ?? 0) + 1;
        if (e.isTrusted) el.setPointerCapture(e.pointerId);
      }),
    );
  }
  read(): Input[] {
    const pads = navigator.getGamepads?.() ?? [];
    return this.players.map((player, i) => {
      const result = idleInput();
      const binding = this.settings.bindings[i];
      if (player.device === 'keyboard') {
        result.throttle = +this.keys.has(binding[0]);
        result.brake = +this.keys.has(binding[1]);
        result.steer = +this.keys.has(binding[3]) - +this.keys.has(binding[2]);
        result.use = this.keys.has(binding[4]);
      }
      if (player.device.startsWith('pad:')) {
        const p = pads[Number(player.device.split(':')[1])];
        if (p) {
          const b = this.settings.padBindings[i];
          result.throttle = padValue(p, b[0]);
          result.brake = padValue(p, b[1]);
          result.steer = padValue(p, b[3]) - padValue(p, b[2]);
          result.use = padPressed(p, b[4]);
        }
      }
      const t = this.touchState[i];
      result.throttle = Math.max(result.throttle, t.throttle ? 1 : 0);
      result.brake = Math.max(result.brake, t.brake ? 1 : 0);
      result.steer += (t.right ? 1 : 0) - (t.left ? 1 : 0);
      result.steer = Math.max(-1, Math.min(1, result.steer));
      const use = result.use || !!t.use;
      result.use = use && !this.previousUse[i];
      this.previousUse[i] = use;
      return result;
    });
  }
}
