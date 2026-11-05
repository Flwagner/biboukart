export interface FlightBody {
  pos: { y: number };
  speed: number;
  airborne: boolean;
  verticalSpeed: number;
  landingTime: number;
  jumpCooldown: number;
  takeoffs: number;
}
export const GRAVITY = 20;
/** Fixed-step vertical physics: geometry launches, gravity flies, terrain catches. */
export function updateFlight(
  body: FlightBody,
  groundHeight: number,
  dt: number,
  launch: boolean,
): 'jump' | 'land' | null {
  body.landingTime = Math.max(0, body.landingTime - dt);
  body.jumpCooldown = Math.max(0, body.jumpCooldown - dt);
  let event: 'jump' | 'land' | null = null;
  if (!body.airborne && body.pos.y - groundHeight > 0.45 && Math.abs(body.speed) > 8) {
    body.airborne = true;
    body.verticalSpeed = 0;
  }
  if (launch && !body.airborne && body.jumpCooldown === 0 && body.speed >= 14) {
    body.airborne = true;
    body.verticalSpeed = Math.min(7.8, 4.6 + (body.speed - 14) * 0.12);
    body.pos.y = Math.max(body.pos.y, groundHeight) + 0.02;
    body.jumpCooldown = 0.8;
    body.takeoffs++;
    event = 'jump';
  }
  if (body.airborne) {
    body.verticalSpeed -= GRAVITY * dt;
    body.pos.y += body.verticalSpeed * dt;
    if (body.pos.y <= groundHeight) {
      body.pos.y = groundHeight;
      body.airborne = false;
      body.verticalSpeed = 0;
      body.landingTime = 0.28;
      body.jumpCooldown = 0.4;
      event = 'land';
    }
  } else body.pos.y = groundHeight;
  return event;
}
