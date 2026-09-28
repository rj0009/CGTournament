import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { getRotation, startRotation, pauseRotation, resumeRotation } from '../services/api';

// Station-rotation countdown — MANUALLY TRIGGERED. Tap START to begin a 12-min cycle;
// when it hits 0:00 the clock HOLDS on SWITCH! (with a loud horn blast) until someone
// taps START NEXT ROTATION. State lives on the server, so every TV and phone screen
// counts down to the same moment. Configurable for testing: ?cycle=5 (minutes) or ?cycle=30s.
function readCycleMs(): number {
  try {
    const raw = new URLSearchParams(window.location.search).get('cycle');
    if (!raw) return 12 * 60 * 1000;
    if (/^\d+(\.\d+)?s$/i.test(raw)) return Math.max(1, parseFloat(raw) * 1000);
    if (/^\d+(\.\d+)?$/.test(raw)) return Math.max(1, parseFloat(raw) * 60 * 1000);
    return 12 * 60 * 1000;
  } catch { return 12 * 60 * 1000; }
}

export const RotationClock: React.FC = () => {
  const [tick, setTick] = useState<number>(Date.now());
  const [rot, setRot] = useState<{ started_at: number | null; cycle_ms: number; offset: number; paused: boolean } | null>(null);
  const [starting, setStarting] = useState<boolean>(false);
  const [hornJustFired, setHornJustFired] = useState<boolean>(false);
  const [cycleMs, setCycleMs] = useState<number>(readCycleMs());
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
        cycle_ms: r.cycle_ms || 720000,
        offset: (r.server_now || Date.now()) - Date.now(),
        paused: !!(r as any).paused,
      });
    }
  };

  useEffect(() => {
    poll();
    const id = setInterval(poll, 5000);   // countdown ticks locally; poll only syncs START/STOP events
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 250);
    const unlock = () => { if (audioCtx.current?.state === 'suspended') audioCtx.current.resume().catch(() => {}); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => { clearInterval(id); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, []);

  const doStart = async (ms?: number) => {
    setStarting(true);
    try { await startRotation(ms ?? cycleMs); } catch { /* keep UI usable */ }
    setStarting(false);
    poll();
  };

  // Configure timing: sets the length for the next START; if a rotation is already
  // running, restarts it immediately at the new length (all screens follow via poll).
  const applyDuration = (ms: number) => {
    setCycleMs(ms);
    if (rot && rot.started_at !== null && !rot.paused) doStart(ms);
  };

  const doPause = async () => { await pauseRotation(); poll(); };
  const doResume = async () => { await resumeRotation(); poll(); };

  const remain = rot && rot.started_at !== null
    ? Math.max(0, rot.cycle_ms - (tick + rot.offset - rot.started_at))
    : null;
  const isPaused = !!rot?.paused;

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
          isPaused
            ? 'text-zinc-300'
            : expired
              ? 'text-red-500 animate-pulse'
              : idle
                ? 'text-zinc-400'
                : under60
                  ? 'text-red-500 animate-pulse'
                  : 'text-yellow-400'
        }`}
      >
        {isPaused ? 'PAUSED' : expired ? 'SWITCH!' : idle ? 'READY' : disp}
      </div>
      <div className={`text-[10px] uppercase tracking-widest mt-1 ${
        hornJustFired ? 'text-yellow-400 font-black' : expired ? 'text-red-500 font-black animate-pulse' : 'text-zinc-500'
      }`}>
        {hornJustFired ? '🔊 HORN' : isPaused ? 'Timer paused' : expired ? 'Start next rotation' : idle ? 'Waiting to start' : 'Next switch'}
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-1.5">
        {rot && rot.started_at !== null && !isPaused && !idle && !expired && (
          <button
            onClick={doPause}
            disabled={starting}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-black uppercase tracking-widest rounded transition-colors"
          >
            <Pause className="w-3 h-3 stroke-[3]" /> Stop
          </button>
        )}
        {isPaused && (
          <button
            onClick={doResume}
            disabled={starting}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-400 hover:bg-yellow-300 text-black text-[10px] font-black uppercase tracking-widest rounded transition-colors"
          >
            <Play className="w-3 h-3 stroke-[3]" /> Resume
          </button>
        )}
        {rot && rot.started_at !== null && (isPaused || expired) && (
          <button
            onClick={() => doStart(rot.cycle_ms)}
            disabled={starting}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-black uppercase tracking-widest rounded transition-colors"
          >
            <RotateCcw className="w-3 h-3 stroke-[3]" /> Restart
          </button>
        )}
      </div>
      <div className="flex items-center justify-center gap-1 mt-1.5 flex-wrap">
        {[['12m', 720000], ['15m', 900000], ['10m', 600000], ['5m', 300000], ['1m', 60000], ['30s', 30000]].map(([lbl, ms]) => (
          <button
            key={String(ms)}
            onClick={() => applyDuration(ms as number)}
            className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border transition-colors ${
              cycleMs === ms
                ? 'bg-yellow-400 text-black border-yellow-400'
                : 'text-zinc-400 border-zinc-700 hover:border-yellow-400 hover:text-yellow-400'
            }`}
          >
            {lbl as string}
          </button>
        ))}
        <input
          type="text"
          placeholder="custom (e.g. 8 or 45s)"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const raw = (e.target as HTMLInputElement).value.trim();
              let ms: number | null = null;
              if (/^\d+(\.\d+)?s$/i.test(raw)) ms = parseFloat(raw) * 1000;
              else if (/^\d+(\.\d+)?$/.test(raw)) ms = parseFloat(raw) * 60 * 1000;
              if (ms && ms >= 1000) applyDuration(ms);
            }
          }}
          className="w-28 px-1.5 py-0.5 text-[9px] bg-zinc-900 border border-zinc-700 rounded text-zinc-300 placeholder:text-zinc-600 focus:border-yellow-400 focus:outline-none"
        />
      </div>
      {(idle || expired) && (
        <button
          onClick={() => doStart()}
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
