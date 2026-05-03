import React, { useRef, useEffect, useState, useCallback } from 'react';
import { COURT } from '../engine/physics.js';

// ── Court rendering constants ──────────────────────────────────
const BALL_RADIUS_M = 0.055; // ~11 cm diameter regulation bocce
const PALLINO_RADIUS_M = 0.025;
const COURT_PADDING = 40;
const FOUL_LINE_M = 3.0;

// ── Color palette (Special Olympics theme) ─────────────────────
const COLORS = {
  courtGreen: '#2E7D32',
  courtDark: '#1B5E20',
  boundary: '#FFFFFF',
  foulLine: 'rgba(255, 255, 255, 0.4)',
  pallino: '#FFD700',
  pallinoStroke: '#FFA000',
  teamRed: '#E4002B',
  teamRedStroke: '#B71C1C',
  teamGreen: '#00C853',
  teamGreenStroke: '#1B5E20',
  cloudDot: 'rgba(255, 215, 0, 0.12)',
  optimalPath: '#FFD700',
  grid: 'rgba(255,255,255,0.06)',
};

/**
 * BocceCanvas — The main interactive court visualization.
 *
 * @param {Object} props
 * @param {Function} props.onPallinoPlace  - Callback when pallino is placed
 * @param {Function} props.onBallPlace     - Callback when a ball is placed
 * @param {Object}   props.pallino         - { x, y } in meters or null
 * @param {Array}    props.balls           - [{ x, y, team }] in meters
 * @param {Object}   props.analysis        - Monte Carlo result or null
 * @param {string}   props.placementMode   - 'pallino' | 'red' | 'green' | null
 */
export default function BocceCanvas({
  onPallinoPlace,
  onBallPlace,
  pallino,
  balls,
  analysis,
  placementMode,
  onBallPickup,
  onPallinoPickup,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 900, h: 160 });
  const [hoverPos, setHoverPos] = useState(null);

  // ── Coordinate transforms ─────────────────────────────────
  const scaleX = (canvasSize.w - COURT_PADDING * 2) / COURT.lengthM;
  const scaleY = (canvasSize.h - COURT_PADDING * 2) / COURT.widthM;

  const mToCanvas = useCallback(
    (mx, my) => ({
      cx: COURT_PADDING + mx * scaleX,
      cy: COURT_PADDING + my * scaleY,
    }),
    [scaleX, scaleY]
  );

  const canvasToM = useCallback(
    (cx, cy) => ({
      mx: (cx - COURT_PADDING) / scaleX,
      my: (cy - COURT_PADDING) / scaleY,
    }),
    [scaleX, scaleY]
  );

  // ── Responsive resize ─────────────────────────────────────
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        // Maintain court aspect ratio (27.5 : 4 ≈ 6.875 : 1)
        const h = Math.max(160, w / 5.5);
        setCanvasSize({ w, h });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // ── Input event handlers ──────────────────────────────────
  const handlePointerDown = (e) => {
    // Prevent default to avoid selection/zoom on double tap is handled by css touch-action
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const cy = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    const { mx, my } = canvasToM(cx * (canvasSize.w / rect.width), cy * (canvasSize.h / rect.height));

    // Check if clicking on an existing ball to pick it up
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      const d = Math.sqrt((b.x - mx) ** 2 + (b.y - my) ** 2);
      if (d < BALL_RADIUS_M * 4) { // slightly larger hit area for touch
        if (onBallPickup) onBallPickup(i, b.team);
        return;
      }
    }

    // Check if clicking on pallino to pick it up
    if (pallino) {
      const d = Math.sqrt((pallino.x - mx) ** 2 + (pallino.y - my) ** 2);
      if (d < PALLINO_RADIUS_M * 6) { // slightly larger hit area
        if (onPallinoPickup) onPallinoPickup();
        return;
      }
    }

    // Clamp to court for placement
    if (mx < 0 || mx > COURT.lengthM || my < 0 || my > COURT.widthM) return;

    if (placementMode === 'pallino') {
      onPallinoPlace({ x: mx, y: my });
    } else if (placementMode === 'red' || placementMode === 'green') {
      onBallPlace({ x: mx, y: my, team: placementMode });
    }
  };

  const handlePointerMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    if (clientX === undefined || clientY === undefined) return;
    
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    const { mx, my } = canvasToM(cx * (canvasSize.w / rect.width), cy * (canvasSize.h / rect.height));
    setHoverPos({ x: mx, y: my });
  };

  // ── Rendering ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = canvasSize;
    canvas.width = w * 2; // HiDPI
    canvas.height = h * 2;
    ctx.scale(2, 2);

    // Clear
    ctx.clearRect(0, 0, w, h);

    // ── Background ──
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, w, h);

    // ── Court surface ──
    const courtLeft = COURT_PADDING;
    const courtTop = COURT_PADDING;
    const courtW = w - COURT_PADDING * 2;
    const courtH = h - COURT_PADDING * 2;

    // Court gradient
    const grad = ctx.createLinearGradient(courtLeft, courtTop, courtLeft, courtTop + courtH);
    grad.addColorStop(0, COLORS.courtGreen);
    grad.addColorStop(0.5, COLORS.courtDark);
    grad.addColorStop(1, COLORS.courtGreen);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(courtLeft, courtTop, courtW, courtH, 6);
    ctx.fill();

    // Grid lines
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let m = 0; m <= COURT.lengthM; m += 2.5) {
      const { cx } = mToCanvas(m, 0);
      ctx.beginPath();
      ctx.moveTo(cx, courtTop);
      ctx.lineTo(cx, courtTop + courtH);
      ctx.stroke();
    }
    for (let m = 0; m <= COURT.widthM; m += 1) {
      const { cy } = mToCanvas(0, m);
      ctx.beginPath();
      ctx.moveTo(courtLeft, cy);
      ctx.lineTo(courtLeft + courtW, cy);
      ctx.stroke();
    }

    // Boundary
    ctx.strokeStyle = COLORS.boundary;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(courtLeft, courtTop, courtW, courtH, 6);
    ctx.stroke();

    // Foul lines
    ctx.strokeStyle = COLORS.foulLine;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    const foulLeft = mToCanvas(FOUL_LINE_M, 0);
    ctx.beginPath();
    ctx.moveTo(foulLeft.cx, courtTop);
    ctx.lineTo(foulLeft.cx, courtTop + courtH);
    ctx.stroke();
    const foulRight = mToCanvas(COURT.lengthM - FOUL_LINE_M, 0);
    ctx.beginPath();
    ctx.moveTo(foulRight.cx, courtTop);
    ctx.lineTo(foulRight.cx, courtTop + courtH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    const center = mToCanvas(COURT.lengthM / 2, 0);
    ctx.beginPath();
    ctx.moveTo(center.cx, courtTop);
    ctx.lineTo(center.cx, courtTop + courtH);
    ctx.stroke();

    // ── Meter labels ──
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let m = 0; m <= COURT.lengthM; m += 5) {
      const { cx } = mToCanvas(m, 0);
      ctx.fillText(`${m}m`, cx, courtTop - 8);
    }

    // ── Probability cloud (draw BEFORE balls so balls are on top) ──
    if (analysis) {
      const { simulations, optimal } = analysis;

      // Draw all simulation endpoints as dots
      for (const sim of simulations) {
        const { cx, cy } = mToCanvas(sim.restX, sim.restY);
        const dist = sim.distToPallino;
        // Color by distance: closer = more yellow, further = more blue
        const t = Math.min(1, dist / 5);
        const r = Math.round(255 * (1 - t) + 30 * t);
        const g = Math.round(215 * (1 - t) + 60 * t);
        const b = Math.round(0 * (1 - t) + 180 * t);
        ctx.fillStyle = `rgba(${r},${g},${b},0.18)`;
        ctx.beginPath();
        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw optimal path
      if (optimal && optimal.pathPoints.length > 1) {
        ctx.strokeStyle = COLORS.optimalPath;
        ctx.lineWidth = 3;
        ctx.shadowColor = COLORS.optimalPath;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        const start = mToCanvas(optimal.pathPoints[0].x, optimal.pathPoints[0].y);
        ctx.moveTo(start.cx, start.cy);
        for (let i = 1; i < optimal.pathPoints.length; i++) {
          const p = mToCanvas(optimal.pathPoints[i].x, optimal.pathPoints[i].y);
          ctx.lineTo(p.cx, p.cy);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Optimal endpoint marker
        const end = mToCanvas(optimal.restX, optimal.restY);
        ctx.fillStyle = COLORS.optimalPath;
        ctx.beginPath();
        ctx.arc(end.cx, end.cy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFA000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Distance label
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          `${(optimal.distToPallino * 100).toFixed(0)} cm`,
          end.cx + 10,
          end.cy - 4
        );
      }
    }

    // ── Pallino ──
    if (pallino) {
      const { cx, cy } = mToCanvas(pallino.x, pallino.y);
      // Glow
      ctx.shadowColor = COLORS.pallino;
      ctx.shadowBlur = 14;
      ctx.fillStyle = COLORS.pallino;
      ctx.beginPath();
      ctx.arc(cx, cy, PALLINO_RADIUS_M * scaleX * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.pallinoStroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = '#0D1117';
      ctx.font = 'bold 8px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', cx, cy);
      ctx.textBaseline = 'alphabetic';
    }

    // ── Balls ──
    balls.forEach((ball, idx) => {
      const { cx, cy } = mToCanvas(ball.x, ball.y);
      const isRed = ball.team === 'red';
      const color = isRed ? COLORS.teamRed : COLORS.teamGreen;
      const stroke = isRed ? COLORS.teamRedStroke : COLORS.teamGreenStroke;
      const radius = BALL_RADIUS_M * scaleX * 1.5;

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Ball gradient
      const ballGrad = ctx.createRadialGradient(
        cx - radius * 0.3, cy - radius * 0.3, radius * 0.1,
        cx, cy, radius
      );
      ballGrad.addColorStop(0, isRed ? '#FF5252' : '#69F0AE');
      ballGrad.addColorStop(0.7, color);
      ballGrad.addColorStop(1, stroke);

      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Ball number
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(idx + 1), cx, cy);
      ctx.textBaseline = 'alphabetic';

      // Distance to pallino
      if (pallino) {
        const dist = Math.sqrt((ball.x - pallino.x) ** 2 + (ball.y - pallino.y) ** 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${(dist * 100).toFixed(0)}cm`, cx, cy + radius + 12);
      }
    });

    // ── Hover crosshair ──
    if (hoverPos && placementMode) {
      const { cx, cy } = mToCanvas(hoverPos.x, hoverPos.y);
      const inCourt =
        hoverPos.x >= 0 && hoverPos.x <= COURT.lengthM &&
        hoverPos.y >= 0 && hoverPos.y <= COURT.widthM;

      if (inCourt) {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, courtTop);
        ctx.lineTo(cx, courtTop + courtH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(courtLeft, cy);
        ctx.lineTo(courtLeft + courtW, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Coordinate label
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          `${hoverPos.x.toFixed(1)}m, ${hoverPos.y.toFixed(1)}m`,
          cx + 8,
          cy - 8
        );
      }
    }
  }, [canvasSize, pallino, balls, analysis, placementMode, hoverPos, mToCanvas, scaleX, scaleY]);

  // ── Cursor style ──
  const cursorStyle = placementMode ? 'crosshair' : 'default';

  return (
    <div ref={containerRef} className="canvas-container">
      <canvas
        ref={canvasRef}
        style={{
          width: canvasSize.w,
          height: canvasSize.h,
          cursor: cursorStyle,
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverPos(null)}
      />
    </div>
  );
}
