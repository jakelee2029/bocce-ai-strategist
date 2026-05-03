import React, { useState, useCallback } from 'react';
import {
  Target,
  Circle,
  BarChart3,
  RotateCcw,
  Zap,
  Trophy,
  Info,
  Loader2,
} from 'lucide-react';
import BocceCanvas from './components/BocceCanvas.jsx';
import CoachTip from './components/CoachTip.jsx';
import { runMonteCarloAnalysis, generateCoachTip } from './engine/monteCarlo.js';

export default function App() {
  // ── State ──────────────────────────────────────────────────
  const [pallino, setPallino] = useState(null);
  const [balls, setBalls] = useState([]);
  const [placementMode, setPlacementMode] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [tips, setTips] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Place the Pallino to begin.');

  // ── Ball counts ────────────────────────────────────────────
  const redCount = balls.filter((b) => b.team === 'red').length;
  const greenCount = balls.filter((b) => b.team === 'green').length;

  // ── Handlers ───────────────────────────────────────────────
  const handlePallinoPlace = useCallback((pos) => {
    setPallino(pos);
    setPlacementMode(null);
    setAnalysis(null);
    setTips([]);
    setStatusMessage('Pallino placed! Now add Team balls or Analyze.');
  }, []);

  const handleBallPlace = useCallback(
    (ball) => {
      // New ball
      setBalls((prev) => [...prev, { x: ball.x, y: ball.y, team: ball.team }]);
      setPlacementMode(null);
      setStatusMessage(
        `${ball.team === 'red' ? 'Red' : 'Green'} ball placed. Add more or Analyze.`
      );
      setAnalysis(null);
      setTips([]);
    },
    []
  );

  const handleBallPickup = useCallback((index, team) => {
    setBalls((prev) => prev.filter((_, i) => i !== index));
    setPlacementMode(team);
    setAnalysis(null);
    setTips([]);
    setStatusMessage(`Picked up a ${team} ball. Tap anywhere to place it.`);
  }, []);

  const handlePallinoPickup = useCallback(() => {
    setPallino(null);
    setPlacementMode('pallino');
    setAnalysis(null);
    setTips([]);
    setStatusMessage('Picked up Pallino. Tap anywhere to place it.');
  }, []);

  const handleAnalyze = useCallback(() => {
    if (!pallino) {
      setStatusMessage('⚠️ Place the Pallino first!');
      return;
    }
    if (balls.length === 0) {
      setStatusMessage('⚠️ Place at least one ball first!');
      return;
    }

    setIsAnalyzing(true);
    setStatusMessage('Running 500 Monte Carlo simulations...');

    // Run in next tick to allow UI update
    setTimeout(() => {
      // Use the first ball as launch position, or default to far end
      const launchPos = { x: 1.5, y: 2.0 };
      const result = runMonteCarloAnalysis(launchPos, pallino, 500);
      const coachTips = generateCoachTip(result, pallino);

      setAnalysis(result);
      setTips(coachTips);
      setIsAnalyzing(false);
      setStatusMessage(
        `✅ Analysis complete! Best shot lands ${(result.optimal.distToPallino * 100).toFixed(0)} cm from pallino.`
      );
    }, 50);
  }, [pallino, balls]);

  const handleReset = useCallback(() => {
    setPallino(null);
    setBalls([]);
    setPlacementMode(null);
    setAnalysis(null);
    setTips([]);
    setIsAnalyzing(false);
    setStatusMessage('Place the Pallino to begin.');
  }, []);

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-title">
          <Trophy size={28} className="header-icon" />
          <div>
            <h1>Bocce AI Strategist</h1>
            <p className="header-subtitle">
              Unified Kinematic & Monte Carlo Analysis Engine
            </p>
          </div>
        </div>
        <div className="header-badge">
          <Zap size={14} />
          <span>v1.0</span>
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div className="toolbar">
        <div className="toolbar-group">
          <button
            className={`tool-btn pallino-btn ${placementMode === 'pallino' ? 'active' : ''}`}
            onClick={() => setPlacementMode('pallino')}
            title="Place Pallino"
          >
            <Target size={18} />
            <span>Pallino</span>
          </button>

          <div className="toolbar-divider" />

          <button
            className={`tool-btn red-btn ${placementMode === 'red' ? 'active' : ''}`}
            onClick={() => setPlacementMode('red')}
            disabled={redCount >= 4}
            title="Place Red Ball"
          >
            <Circle size={18} />
            <span>Red ({redCount}/4)</span>
          </button>

          <button
            className={`tool-btn green-btn ${placementMode === 'green' ? 'active' : ''}`}
            onClick={() => setPlacementMode('green')}
            disabled={greenCount >= 4}
            title="Place Green Ball"
          >
            <Circle size={18} />
            <span>Green ({greenCount}/4)</span>
          </button>
        </div>

        <div className="toolbar-group">
          <button
            className="tool-btn analyze-btn"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !pallino}
            title="Analyze Strategy (500 simulations)"
          >
            {isAnalyzing ? (
              <Loader2 size={18} className="spin" />
            ) : (
              <BarChart3 size={18} />
            )}
            <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Strategy'}</span>
          </button>

          <button
            className="tool-btn reset-btn"
            onClick={handleReset}
            title="Reset Court"
          >
            <RotateCcw size={18} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ── Status Bar ── */}
      <div className="status-bar">
        <Info size={14} />
        <span>{statusMessage}</span>
      </div>

      {/* ── Court Canvas ── */}
      <BocceCanvas
        pallino={pallino}
        balls={balls}
        analysis={analysis}
        placementMode={placementMode}
        onPallinoPlace={handlePallinoPlace}
        onBallPlace={handleBallPlace}
        onBallPickup={handleBallPickup}
        onPallinoPickup={handlePallinoPickup}
      />

      {/* ── Stats Panel ── */}
      {analysis && (
        <div className="stats-panel">
          <div className="stat-card">
            <span className="stat-label">Simulations</span>
            <span className="stat-value">{analysis.stats.totalSimulations}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Best Distance</span>
            <span className="stat-value highlight">
              {(analysis.optimal.distToPallino * 100).toFixed(0)} cm
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Avg Distance</span>
            <span className="stat-value">
              {(analysis.stats.avgDistToPallino * 100).toFixed(0)} cm
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Within 50 cm</span>
            <span className="stat-value">
              {((analysis.stats.within05m / analysis.stats.totalSimulations) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Within 1 m</span>
            <span className="stat-value">
              {((analysis.stats.within1m / analysis.stats.totalSimulations) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Optimal Power</span>
            <span className="stat-value">{analysis.stats.idealPower.toFixed(1)} m/s</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Optimal Angle</span>
            <span className="stat-value">{analysis.stats.idealAngleDeg.toFixed(1)}°</span>
          </div>
        </div>
      )}

      {/* ── Coach's Tip ── */}
      <CoachTip tips={tips} />

      {/* ── Footer ── */}
      <footer className="app-footer">
        <span>Bocce AI Strategist · μ = 0.05 · 500 Monte Carlo Simulations</span>
      </footer>
    </div>
  );
}
