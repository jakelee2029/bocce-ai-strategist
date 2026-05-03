/**
 * Monte Carlo Analysis Engine
 * Runs N stochastic simulations to find optimal launch parameters.
 *
 * Each simulation randomly perturbs angle and power around a base range,
 * then calculates the rest position using the kinematic engine.
 */

import { calculateRestPosition, distanceBetween, COURT } from './physics.js';

/**
 * Run Monte Carlo analysis: try many random (angle, power) combos from a
 * launch position and see which gets closest to the pallino.
 *
 * @param {{x:number, y:number}} launchPos   – Starting position (meters)
 * @param {{x:number, y:number}} pallinoPos  – Target position (meters)
 * @param {number} numSimulations             – Number of simulations (default 500)
 * @returns {{ simulations: Array, optimal: Object, stats: Object }}
 */
export function runMonteCarloAnalysis(launchPos, pallinoPos, numSimulations = 500) {
  // Calculate base angle towards pallino
  const baseAngle = Math.atan2(
    pallinoPos.y - launchPos.y,
    pallinoPos.x - launchPos.x
  );

  // Calculate base distance
  const baseDist = distanceBetween(launchPos, pallinoPos);

  // Calculate the ideal power (v0) that would cover exactly baseDist
  // d = v0² / (2 * a) => v0 = sqrt(2 * a * d)
  const DECEL = 0.05 * 9.81;
  const idealV0 = Math.sqrt(2 * DECEL * baseDist);

  const simulations = [];
  let bestSim = null;
  let bestDistance = Infinity;

  // Statistics accumulators
  let totalDist = 0;
  let minDist = Infinity;
  let maxDist = 0;

  for (let i = 0; i < numSimulations; i++) {
    // Perturb angle: ±15 degrees (±0.26 rad)
    const angleNoise = (Math.random() - 0.5) * 0.52;
    const angle = baseAngle + angleNoise;

    // Perturb power: ±40% of ideal
    const powerNoise = 0.6 + Math.random() * 0.8; // 0.6 to 1.4 multiplier
    const v0 = idealV0 * powerNoise;

    const result = calculateRestPosition(launchPos.x, launchPos.y, v0, angle);
    const distToPallino = distanceBetween(result, pallinoPos);

    const sim = {
      id: i,
      angle,
      v0,
      restX: result.x,
      restY: result.y,
      distToPallino,
      pathPoints: result.pathPoints,
    };

    simulations.push(sim);

    totalDist += distToPallino;
    if (distToPallino < minDist) minDist = distToPallino;
    if (distToPallino > maxDist) maxDist = distToPallino;

    if (distToPallino < bestDistance) {
      bestDistance = distToPallino;
      bestSim = sim;
    }
  }

  const avgDist = totalDist / numSimulations;

  // Calculate what % of shots land within various radii
  const within05m = simulations.filter(s => s.distToPallino < 0.5).length;
  const within1m = simulations.filter(s => s.distToPallino < 1.0).length;
  const within2m = simulations.filter(s => s.distToPallino < 2.0).length;

  return {
    simulations,
    optimal: bestSim,
    stats: {
      avgDistToPallino: avgDist,
      minDistToPallino: minDist,
      maxDistToPallino: maxDist,
      within05m,
      within1m,
      within2m,
      totalSimulations: numSimulations,
      idealAngleDeg: (bestSim.angle * 180) / Math.PI,
      idealPower: bestSim.v0,
    },
  };
}

/**
 * Generate a coach's tip based on the analysis results.
 */
export function generateCoachTip(analysisResult, pallinoPos) {
  const { stats, optimal } = analysisResult;
  const pct05 = ((stats.within05m / stats.totalSimulations) * 100).toFixed(0);
  const pct1 = ((stats.within1m / stats.totalSimulations) * 100).toFixed(0);

  const angleDeg = ((optimal.angle * 180) / Math.PI).toFixed(1);
  const power = optimal.v0.toFixed(1);
  const bestDist = (optimal.distToPallino * 100).toFixed(0); // cm

  let difficulty;
  if (stats.within1m / stats.totalSimulations > 0.5) {
    difficulty = 'High-confidence';
  } else if (stats.within1m / stats.totalSimulations > 0.2) {
    difficulty = 'Moderate';
  } else {
    difficulty = 'Challenging';
  }

  const tips = [
    `🎯 ${difficulty} shot detected.`,
    `Aim at ${angleDeg}° with ${power} m/s power.`,
    `Best simulated landing: ${bestDist} cm from pallino.`,
    `${pct05}% of shots land within 50 cm, ${pct1}% within 1 m.`,
  ];

  // Tactical advice
  if (pallinoPos.y < 1.0 || pallinoPos.y > 3.0) {
    tips.push('⚠️ Pallino is near the rail — use a gentle lob to avoid bounce-out.');
  }
  if (stats.avgDistToPallino > 3.0) {
    tips.push('💡 Consider a shorter placement shot instead of a long roll.');
  }
  if (stats.within05m / stats.totalSimulations > 0.3) {
    tips.push('✅ Great odds! Commit to this angle with steady follow-through.');
  }

  return tips;
}
