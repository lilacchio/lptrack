"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Lenis 1.x integration. The original bug was caused by `<html>` having
// `h-full` (height: 100%), which capped the document at viewport height and
// silently broke scroll. With the height pattern now fixed in layout.tsx and
// the Lenis-required CSS rules in globals.css (`html.lenis, html.lenis body
// { height: auto }`), Lenis can drive smooth wheel events without fighting
// the native scroll container.
//
// `autoRaf: true` lets Lenis own its requestAnimationFrame loop — no manual
// raf bookkeeping in useEffect.
export function LenisProvider() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      autoRaf: true,
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  return null;
}
