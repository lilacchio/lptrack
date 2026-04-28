"use client";

import { useState } from "react";

export function TokenIcon({
  src,
  symbol,
  size = 32,
}: {
  src?: string;
  symbol: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const showFallback = !src || broken;

  if (showFallback) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-muted font-mono text-[10px] font-medium text-muted-foreground"
        style={{ width: size, height: size }}
        aria-label={symbol}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${symbol} logo`}
      width={size}
      height={size}
      className="rounded-full bg-muted object-cover"
      style={{ width: size, height: size }}
      onError={() => setBroken(true)}
    />
  );
}
