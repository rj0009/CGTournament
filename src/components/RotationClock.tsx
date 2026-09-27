import React, { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { getRotation, startRotation } from '../services/api';

// Station-rotation countdown — MANUALLY TRIGGERED. Tap START to begin a 15-min cycle;
// when it hits 0:00 the clock HOLDS on SWITCH! (with a loud horn blast) until someone
// taps START NEXT ROTATION. State lives on the server, so every TV and phone screen
// counts down to the same moment. Configurable for testing: ?cycle=5 (minutes) or ?cycle=30s.
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
  const [tick, setTick] = useState<number>(Date.now());
  const [rot, setRot] = useState<{ started_at: number | null; cycle_ms: number; offset: number } | null>(null);
  const [starting, setStarting] = useState<boolean>(false);
  const [hornJustFired, setHornJustFired] = useState<boolean>(false);
  const cycleMs = useRef<number>(readCycleMs());
  const prevRemain = useRef<number | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  const blastHorn = () => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      if (!audioCtx.current) audioCtx.current = new AC();
      const ctx = audioCtx.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const t0 = ctx.currentTime + 0.02;
      const master = ctx.createGain();
      master.gain.value = 1.0;                                   // LOUD
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 1.2;
      master.connect(lp); lp.connect(ctx.destination);
      const blasts: [number, number][] = [[0, 0.55], [0.75, 0.55], [1.5, 2.2]];  // short-short-long
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

  const poll = async () => {
    const r = await getRotation();
    if (r && (r as any).success) {
      setRot({
        started_at: r.started_at ?? null,
        cycle_ms: r.cycle_ms || 900000,
        offset: (r.server_now || Date.now()) - Date.now(),
      });
    }
  };

  useEffect(() => {
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 250);
    const unlock = () => { if (audioCtx.current?.state === 'suspended') audioCtx.current.resume().catch(() => {}); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => { clearInterval(id); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, []);

  const doStart = async () => {
    setStarting(true);
    try { await startRotation(cycleMs.current); } catch { /* keep UI usable */ }
    setStarting(false);
    poll();
  };

  const remain = rot && rot.started_at !== null
    ? rot.cycle_ms - (tick + rot.offset - rot.started_at)
    : null;

  if (remain !== null) {
    if (prevRemain.current !== null && prevRemain.current > 0 && remain <= 0) blastHorn();
    prevRemain.current = remain;
  }

  const idle = rot !== null && rot.started_at === null;
  const expired = remain !== null && remain <= 0;
  const under60 = remain !== null && remain > 0 && remain <= 60 * 1000;
  const disp = remain === null
    ? '--:--'
    : expired
      ? '00:00'
      : `${String(Math.floor(remain / 60000)).padStart(2, '0')}:${String(Math.floor((remain % 60000) / 1000)).padStart(2, '0')}`;

  return (
    <div className="text-center font-mono">
      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
        Station Rotation
      </div>
      <div
        className={`text-5xl font-black tabular-nums tracking-tight leading-none mt-1 ${
          expired
            ? 'text-red-500 animate-pulse'
            : idle
              ? 'text-zinc-400'
              : under60
                ? 'text-red-500 animate-pulse'
                : 'text-yellow-400'
        }`}
      >
        {expired ? 'SWITCH!' : idle ? 'READY' : disp}
      </div>
      <div className={`text-[10px] uppercase tracking-widest mt-1 ${
        hornJustFired ? 'text-yellow-400 font-black' : expired ? 'text-red-500 font-black animate-pulse' : 'text-zinc-500'
      }`}>
        {hornJustFired ? '🔊 HORN' : expired ? 'Start next rotation' : idle ? 'Waiting to start' : 'Next switch'}
      </div>
      {(idle || expired) && (
        <button
          onClick={doStart}
          disabled={starting}
          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black text-[11px] font-black uppercase tracking-widest rounded transition-colors"
        >
          <Play className="w-3.5 h-3.5 stroke-[3]" />
          {starting ? 'Starting…' : idle ? 'Start Rotation' : 'Start Next Rotation'}
        </button>
      )}
    </div>
  );
};
