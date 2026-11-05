import { describe, it, expect } from 'vitest';
import { updateFlight, type FlightBody } from '../src/flight';
import { Race } from '../src/race';
function body(speed = 25): FlightBody {
  return {
    pos: { y: 2 },
    speed,
    airborne: false,
    verticalSpeed: 0,
    landingTime: 0,
    jumpCooldown: 0,
    takeoffs: 0,
  };
}
describe('real bump jumps', () => {
  it.each([0, 1, 2])(
    'track %i launches from a real crest and lands without granting checkpoints',
    (index) => {
      const race = new Race(index, [{ character: 0, kart: 0, device: 'keyboard' }]),
        r = race.racers[0];
      race.racers.splice(1);
      race.pickups = [];
      race.countdown = 0;
      const start = race.track.bumps[0].t - 8 / race.track.length;
      r.pos.copy(race.track.at(start));
      r.previous.copy(r.pos);
      r.progress = start;
      r.lastT = start;
      r.checkpoint = Math.floor(start * 8);
      r.speed = 26;
      const tangent = race.track.tangent(start);
      r.heading = Math.atan2(tangent.x, tangent.z);
      const events: string[] = [];
      race.onEvent = (kind) => events.push(kind);
      let maxAir = 0;
      for (let i = 0; i < 300; i++) {
        race.update(1 / 60, [race.ai(r, false)]);
        maxAir = Math.max(maxAir, r.pos.y - r.groundHeight);
        if (events.includes('jump') && events.includes('land')) break;
      }
      expect(events).toContain('jump');
      expect(events).toContain('land');
      expect(maxAir).toBeGreaterThan(0.6);
      expect(r.airborne).toBe(false);
      expect(r.landingTime).toBeGreaterThan(0);
      expect(r.finished).toBe(false);
      expect(r.checkpoint).toBeLessThanOrEqual(Math.floor(r.progress * 8));
      r.airborne = true;
      r.verticalSpeed = 9;
      r.pos.y += 40;
      const before = r.progress;
      race.respawn(r);
      expect(r.airborne).toBe(false);
      expect(r.verticalSpeed).toBe(0);
      expect(r.progress).toBe(before);
    },
  );
  it('launches, follows gravity and lands with a short compression timer', () => {
    const r = body();
    expect(updateFlight(r, 2, 1 / 60, true)).toBe('jump');
    expect(r.airborne).toBe(true);
    let maxHeight = r.pos.y,
      landed = false;
    for (let i = 0; i < 180; i++) {
      const event = updateFlight(r, 2, 1 / 60, false);
      maxHeight = Math.max(maxHeight, r.pos.y);
      if (event === 'land') {
        landed = true;
        break;
      }
    }
    expect(maxHeight).toBeGreaterThan(2.7);
    expect(landed).toBe(true);
    expect(r.pos.y).toBe(2);
    expect(r.verticalSpeed).toBe(0);
    expect(r.landingTime).toBeGreaterThan(0);
    expect(r.takeoffs).toBe(1);
  });
  it('does not launch slowly or backwards and prevents repeated takeoffs', () => {
    for (const speed of [5, -7]) {
      const r = body(speed);
      expect(updateFlight(r, 2, 1 / 60, true)).toBeNull();
      expect(r.airborne).toBe(false);
    }
    const r = body();
    for (let i = 0; i < 15; i++) updateFlight(r, 2, 1 / 60, true);
    expect(r.takeoffs).toBe(1);
  });
  it('lands on rising terrain without tunnelling below it', () => {
    const r = body();
    updateFlight(r, 2, 1 / 60, true);
    expect(updateFlight(r, 8, 1 / 60, false)).toBe('land');
    expect(r.pos.y).toBe(8);
  });
  it('remains stable on slopes when not launched', () => {
    const r = body(8);
    for (let i = 0; i < 100; i++) updateFlight(r, 2 + i * 0.01, 1 / 60, false);
    expect(r.airborne).toBe(false);
    expect(r.pos.y).toBeCloseTo(2.99);
  });
});
