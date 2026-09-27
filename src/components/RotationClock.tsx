import React, { useEffect, useState } from 'react';

// 15-minute station-rotation countdown, synced to the wall clock (switches at :00/:15/:30/:45)
// so every TV / phone screen counts down to the SAME switch moment.
export const RotationClock: React.FC = () => {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const CYCLE = 15 * 60 * 1000;
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
        {switchNow ? 'Rotate stations now' : 'Next switch'}
      </div>
    </div>
  );
};
