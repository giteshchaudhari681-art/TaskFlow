import React, { useRef, useEffect, useCallback } from 'react';

export interface UseCardTiltOptions {
 maxTilt?: number; // Maximum rotation in degrees (default: 2.5)
 perspective?: number; // Perspective distance in px (default: 1000)
 scale?: number; // Scale factor on hover (default: 1.01)
 disabled?: boolean;
}

/**
 * Custom React hook that applies hardware-accelerated 3D mouse tilt.
 *
 * Designed to be subtle, 60fps, and non-distracting:
 * - Automatically disabled on touch / mobile devices (pointer: coarse)
 * - Automatically disabled when prefers-reduced-motion is active
 * - Direct style updates via requestAnimationFrame to prevent React re-renders
 * - Smooth spring-like reset when the cursor leaves the card
 */
export function useCardTilt<T extends HTMLElement = HTMLDivElement>(
 options: UseCardTiltOptions = {}
) {
 const { maxTilt = 2.5, perspective = 1000, scale = 1.01, disabled = false } = options;
 const elementRef = useRef<T | null>(null);
 const rafIdRef = useRef<number | null>(null);

 const resetTransform = useCallback(() => {
  if (!elementRef.current) return;
  elementRef.current.style.transition =
   'transform 350ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 350ms cubic-bezier(0.16, 1, 0.3, 1), border-color 350ms cubic-bezier(0.16, 1, 0.3, 1)';
  elementRef.current.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) translateZ(0) scale3d(1, 1, 1)`;
 }, [perspective]);

 useEffect(() => {
  const el = elementRef.current;
  if (!el || disabled) return;

  // Detect touch device or reduced motion preference
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isTouch || isReducedMotion) {
   return;
  }

  const handlePointerMove = (e: PointerEvent) => {
   if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

   rafIdRef.current = requestAnimationFrame(() => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Calculate normalized cursor position from -1 to 1
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;

    // Constrain tilt to safe professional limits (max ±3.5 deg)
    const safeMax = Math.min(Math.max(maxTilt, 1), 3.5);
    const rotX = (-y * safeMax).toFixed(2);
    const rotY = (x * safeMax).toFixed(2);

    el.style.transition = 'transform 80ms ease-out';
    el.style.transform = `perspective(${perspective}px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(2px) scale3d(${scale}, ${scale}, ${scale})`;
   });
  };

  const handlePointerEnter = () => {
   if (!el) return;
   el.style.willChange = 'transform';
  };

  const handlePointerLeave = () => {
   if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
   resetTransform();
  };

  el.addEventListener('pointerenter', handlePointerEnter);
  el.addEventListener('pointermove', handlePointerMove);
  el.addEventListener('pointerleave', handlePointerLeave);

  return () => {
   if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
   el.removeEventListener('pointerenter', handlePointerEnter);
   el.removeEventListener('pointermove', handlePointerMove);
   el.removeEventListener('pointerleave', handlePointerLeave);
   el.style.willChange = 'auto';
  };
 }, [maxTilt, perspective, scale, disabled, resetTransform]);

 return elementRef;
}

export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
 maxTilt?: number;
 scale?: number;
 perspective?: number;
 disabled?: boolean;
}

/**
 * Reusable wrapper component that applies the 3D mouse tilt effect to its container.
 */
export const TiltCard: React.FC<TiltCardProps> = ({
 children,
 className = '',
 maxTilt = 0.8,
 scale = 1.002,
 perspective = 1200,
 disabled = false,
 ...rest
}) => {
 const tiltRef = useCardTilt<HTMLDivElement>({ maxTilt, scale, perspective, disabled });

 return (
  <div ref={tiltRef} className={`preserve-3d ${className}`} {...rest}>
   {children}
  </div>
 );
};
