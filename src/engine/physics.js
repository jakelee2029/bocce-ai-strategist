/**
 * Kinematic Engine for Bocce Ball Simulation
 * Uses rolling friction to calculate rest position.
 *
 * Physics model:
 *   Friction coefficient μ = 0.05
 *   Deceleration a = μ * g (g = 9.81 m/s²)
 *   Time to stop: t_stop = v0 / a
 *   Distance traveled: d = v0² / (2 * a)
 *   Path is a straight line from launch point at the given angle.
 */

const FRICTION_MU = 0.05;
const GRAVITY = 9.81; // m/s²
const DECELERATION = FRICTION_MU * GRAVITY; // 0.4905 m/s²

// Court dimensions in meters (standard bocce court)
export const COURT = {
  lengthM: 27.5,  // ~90 feet
  widthM: 4.0,    // ~13 feet
};

/**
 * Calculate the rest position of a ball given initial velocity and angle.
 * All positions are in METERS; the canvas component handles pixel conversion.
 *
 * @param {number} x0 - Starting x position (meters)
 * @param {number} y0 - Starting y position (meters)
 * @param {number} v0 - Initial speed (m/s)
 * @param {number} angle - Launch angle in radians (0 = right, π/2 = up)
 * @returns {{ x: number, y: number, distance: number, pathPoints: {x:number,y:number}[] }}
 */
export function calculateRestPosition(x0, y0, v0, angle) {
  if (v0 <= 0) return { x: x0, y: y0, distance: 0, pathPoints: [{ x: x0, y: y0 }] };

  const tStop = v0 / DECELERATION;
  const totalDistance = (v0 * v0) / (2 * DECELERATION);

  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  // Generate path points for visualization (every ~0.02 seconds or 50 steps)
  const steps = Math.max(20, Math.min(100, Math.ceil(tStop / 0.02)));
  const dt = tStop / steps;
  const pathPoints = [];

  let cx = x0;
  let cy = y0;

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const dist = v0 * t - 0.5 * DECELERATION * t * t;
    const px = x0 + dist * dx;
    const py = y0 + dist * dy;

    // Clamp to court boundaries
    const clampedX = Math.max(0, Math.min(COURT.lengthM, px));
    const clampedY = Math.max(0, Math.min(COURT.widthM, py));

    pathPoints.push({ x: clampedX, y: clampedY });

    // If we hit a wall, stop
    if (px < 0 || px > COURT.lengthM || py < 0 || py > COURT.widthM) {
      break;
    }
  }

  let finalX = x0 + totalDistance * dx;
  let finalY = y0 + totalDistance * dy;

  // Clamp final position to court
  finalX = Math.max(0, Math.min(COURT.lengthM, finalX));
  finalY = Math.max(0, Math.min(COURT.widthM, finalY));

  return {
    x: finalX,
    y: finalY,
    distance: totalDistance,
    pathPoints,
  };
}

/**
 * Euclidean distance between two points.
 */
export function distanceBetween(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
