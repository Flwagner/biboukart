import type { PlayerConfig, Settings } from './config';
import { idleInput, type Input } from './race';
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
  constructor(public settings: Settings) {
    addEventListener('keydown', (e) => {
      if (this.onRemap) {
        e.preventDefault();
        this.onRemap(e.code);
        this.onRemap = null;
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
      const pressed = !!p.buttons[9]?.pressed;
      if (
        pressed &&
        !this.pauseButtons.get(p.index) &&
        this.players.some((player) => player.device === `pad:${p.index}`)
      )
        this.onPause();
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
          result.throttle = Math.max(p.buttons[7]?.value ?? 0, p.buttons[0]?.value ?? 0);
          result.brake = Math.max(p.buttons[6]?.value ?? 0, p.buttons[1]?.value ?? 0);
          result.steer = Math.abs(p.axes[0]) > 0.15 ? p.axes[0] : 0;
          result.use = !!p.buttons[2]?.pressed;
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
