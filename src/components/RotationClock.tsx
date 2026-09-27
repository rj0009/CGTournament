import React, { useEffect, useRef, useState } from 'react';

// 15-minute station-rotation countdown, synced to the wall clock (:00/:15/:30/:45 by default)
// so every screen counts down to the SAME switch moment. Loud horn blast at each boundary.
// Configurable for testing: ?cycle=5 (minutes) or ?cycle=30s (seconds).
function readCycleMs(): number {
  try {
    const raw = new URLSearchParams(window.location.search).get('cycle');
    if (!raw) return 15 * 60 * 1000;
    if (/^\d+(\.\d+)?s$/i.test(raw)) return Math.max(1, parseFloat(raw) * 1000);
    if (/^\d+(\.\d+)?$/.test(raw)) return Math.max(1, parseFloat(raw) * 60 * 1000);
    return 15 * 60 * 1000;
  } catch { return 15 * 60 * 1000; }
}

export const RotationClock: React.FC = () => {
  const [now, setNow] = useState<number>(Date.now());
  const [hornJustFired, setHornJustFired] = useState<boolean>(false);
  const cycleMs = useRef<number>(readCycleMs());
  const lastCycleIdx = useRef<number>(-1);
  const audioCtx = useRef<AudioContext | null>(null);

  // Horn: synthesized multi-oscillator blast (no audio file needed). Autoplay-gated:
  // unlocked on the first tap/click/key anywhere; after that it fires at every boundary.
  const blastHorn = () => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      if (!audioCtx.current) audioCtx.current = new AC();
      const ctx = audioCtx.current;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); }
      const t0 = ctx.currentTime + 0.02;
      const master = ctx.createGain();
      master.gain.value = 1.0;                      // LOUD
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 1.2;
      master.connect(lp); lp.connect(ctx.destination);
      // two blasts: short-short-long (station change signal)
      const blasts = [[0, 0.55], [0.75, 0.55], [1.5, 2.2]];
      blasts.forEach(([start, dur]) => {
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0 + start);
        g.gain.exponentialRampToValueAtTime(0.9, t0 + start + 0.04);
        g.gain.setValueAtTime(0.9, t0 + start + dur - 0.12);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
        g.connect(master);
        [116, 174.6, 232].forEach((f, i) => {
          const o = ctx.createOscillator();
          o.type = i === 1 ? 'square' : 'sawtooth';
          o.frequency.value = f;
          const og = ctx.createGain(); og.gain.value = i === 0 ? 0.5 : 0.22;
          o.connect(og); og.connect(g);
          o.start(t0 + start); o.stop(t0 + start + dur + 0.02);
        });
      });
      setHornJustFired(true);
      setTimeout(() => setHornJustFired(false), 2500);
    } catch { /* audio unavailable — visual flash still fires */ }
  };

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    const unlock = () => { if (audioCtx.current?.state === 'suspended') audioCtx.current.resume().catch(() => {}); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => { clearInterval(id); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, []);

  const CYCLE = cycleMs.current;
  const cycleIdx = Math.floor(now / CYCLE);
  if (lastCycleIdx.current !== -1 && cycleIdx !== lastCycleIdx.current) blastHorn();
  lastCycleIdx.current = cycleIdx;

  const remain = CYCLE - (now % CYCLE);
  const mm = String(Math.floor(remain / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remain % 60000) / 1000)).padStart(2, '0');
  const under60 = remain <= 60 * 1000;
  const switchNow = remain <= 4000;

  return (
    <div className="text-center font-mono">
      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
        Station Rotation
      </div>
      <div
        className={`text-5xl font-black tabular-nums tracking-tight leading-none mt-1 ${
          switchNow
            ? 'text-white animate-pulse'
            : under60
              ? 'text-red-500 animate-pulse'
              : 'text-yellow-400'
        }`}
      >
        {switchNow ? 'SWITCH!' : `${mm}:${ss}`}
      </div>
      <div className={`text-[10px] uppercase tracking-widest mt-1 ${switchNow ? 'text-red-500 font-black animate-pulse' : 'text-zinc-500'}`}>
        {hornJustFired ? '🔊 HORN' : switchNow ? 'Rotate stations now' : 'Next switch'}
      </div>
    </div>
  );
};
