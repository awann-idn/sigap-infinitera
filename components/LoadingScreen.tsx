'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  finishLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: true,
  finishLoading: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState('MEMUAT SISTEM...');
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setReducedMotion(true);
      setIsLoading(false);
      return;
    }

    const start = performance.now();
    const duration = 700;
    let animationFrameId: number;

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const val = Math.round(eased * 100);

      setProgress(val);

      if (val >= 100) {
        setLabel('SIAP');
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            setIsLoading(false);
          }, 400);
        }, 100);
      } else {
        animationFrameId = requestAnimationFrame(tick);
      }
    }

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (reducedMotion) {
    return <LoadingContext.Provider value={{ isLoading: false, finishLoading: () => setIsLoading(false) }}>{children}</LoadingContext.Provider>;
  }

  return (
    <LoadingContext.Provider value={{ isLoading, finishLoading: () => setIsLoading(false) }}>
      {isLoading && (
        <div
          className={`loading-screen fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#EDEDED] transition-opacity duration-400 ease-in-out ${
            isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-live="polite"
        >
          {/* 000 - 100 Counter */}
          <div className="font-display text-[clamp(64px,15vw,160px)] font-bold tracking-[-0.06em] text-[#0F141A] leading-none select-none">
            {String(progress).padStart(3, '0')}
          </div>

          {/* Progress Bar */}
          <div className="w-[min(400px,80vw)] h-[2px] bg-[#D0D5DD] mt-8 overflow-hidden">
            <div
              className="h-full bg-[#0F141A] transition-[width] duration-16 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Label */}
          <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-[#8E95A3] mt-6">
            {label}
          </div>
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  );
}
