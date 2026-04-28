"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

export function HeroBackground() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 800], [0, 160]);
  const scale = useTransform(scrollY, [0, 800], [1, 1.08]);

  return (
    <motion.div
      aria-hidden
      style={reduce ? undefined : { y, scale }}
      initial={reduce ? false : { opacity: 0, scale: 1.04 }}
      animate={reduce ? undefined : { opacity: 0.92, scale: 1 }}
      transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 -z-10"
    >
      <Image
        src="/media/hero-night.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <motion.div
        className="absolute inset-0 bg-arena-emerald/10 mix-blend-screen"
        animate={
          reduce
            ? undefined
            : { opacity: [0.0, 0.18, 0.05, 0.14, 0.0] }
        }
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
