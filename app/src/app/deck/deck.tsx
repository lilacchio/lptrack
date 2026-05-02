"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SLIDES } from "./slides";

export function Deck() {
  const [index, setIndex] = useState(0);
  const total = SLIDES.length;

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.max(0, Math.min(total - 1, i + delta)));
    },
    [total]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.key === "ArrowRight" ||
        e.key === "ArrowDown" ||
        e.key === " " ||
        e.key === "PageDown"
      ) {
        e.preventDefault();
        go(+1);
      } else if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowUp" ||
        e.key === "PageUp"
      ) {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Home") {
        setIndex(0);
      } else if (e.key === "End") {
        setIndex(total - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, total]);

  // Disable Lenis smooth scroll & body scroll while deck is mounted —
  // each slide is a single viewport.
  useEffect(() => {
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevOverflow;
    };
  }, []);

  const Current = SLIDES[index];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background text-foreground">
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Current.Component />
          </motion.div>
        </AnimatePresence>
      </div>

      <DeckChrome
        index={index}
        total={total}
        onPrev={() => go(-1)}
        onNext={() => go(+1)}
        onJump={setIndex}
      />
    </div>
  );
}

function DeckChrome({
  index,
  total,
  onPrev,
  onNext,
  onJump,
}: {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (i: number) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 px-6 pb-5 sm:px-10 sm:pb-7">
      <div className="pointer-events-auto flex items-center justify-between gap-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        <span>lp-arena · sidetrack deck</span>
        <span>
          {String(index + 1).padStart(2, "0")} /{" "}
          {String(total).padStart(2, "0")}
        </span>
      </div>

      <div className="pointer-events-auto flex items-center gap-3">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="rounded-full border border-border/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition hover:border-foreground/40 hover:text-foreground disabled:opacity-30"
          aria-label="Previous slide"
        >
          ← prev
        </button>
        <div className="flex flex-1 items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => onJump(i)}
              className="group flex-1"
              aria-label={`Slide ${i + 1}`}
            >
              <div
                className={`h-[3px] w-full rounded-full transition-all ${
                  i === index
                    ? "bg-arena-emerald"
                    : i < index
                    ? "bg-foreground/40"
                    : "bg-border/60 group-hover:bg-border"
                }`}
              />
            </button>
          ))}
        </div>
        <button
          onClick={onNext}
          disabled={index === total - 1}
          className="rounded-full border border-border/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition hover:border-foreground/40 hover:text-foreground disabled:opacity-30"
          aria-label="Next slide"
        >
          next →
        </button>
      </div>
    </div>
  );
}
