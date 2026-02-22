import { useEffect, useState, useRef } from 'react';

const DURATION_MS = 3200;   // Time to reach ~90%
const TARGET_PERCENT = 92;  // Cap so it doesn't look "stuck" at 100% before request ends
const SIZE = 120;           // Ring diameter in px
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Ease-out quadratic: fast start, gentle slowdown near target */
function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

interface SearchProgressBarProps {
  active: boolean;
}

export function SearchProgressBar({ active }: SearchProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      setProgress(0);
      return;
    }

    setProgress(0);
    startTimeRef.current = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const t = Math.min(elapsed / DURATION_MS, 1);
      const eased = easeOutQuad(t);
      setProgress(Math.min(eased * TARGET_PERCENT, TARGET_PERCENT));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  if (!active) return null;

  const stepLabels = [
    'Finding clinics in your area…',
    'Checking availability & ratings…',
    'Almost there…',
  ];
  const stepIndex = progress < 40 ? 0 : progress < 75 ? 1 : 2;
  const strokeDashoffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  return (
    <div className="rounded-xl bg-white p-8 shadow-lg border border-slate-200/80 max-w-md mx-auto">
      <div className="flex flex-col items-center gap-5">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg
            className="size-full -rotate-90"
            width={SIZE}
            height={SIZE}
            aria-hidden
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              className="text-slate-200"
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="url(#searchProgressGradient)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              className="transition-[stroke-dashoffset] duration-150 ease-out"
            />
            <defs>
              <linearGradient id="searchProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold tabular-nums text-slate-700">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
        <p className="text-center text-sm font-medium text-slate-600">
          {stepLabels[stepIndex]}
        </p>
      </div>
    </div>
  );
}
