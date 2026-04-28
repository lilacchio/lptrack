"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Button } from "@/components/ui/button";

function shortAddr(a: string): string {
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

export function ConnectButton() {
  const { publicKey, connected, disconnect, connecting } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [balance, setBalance] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    connection
      .getBalance(publicKey)
      .then((lamports) => {
        if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey, connection]);

  // Avoid SSR/CSR mismatch — wallet state is client-only.
  if (!mounted) {
    return (
      <Button
        size="default"
        variant="outline"
        disabled
        className="rounded-full px-5 font-medium"
      >
        Connect wallet
      </Button>
    );
  }

  if (!connected || !publicKey) {
    return (
      <Button
        size="default"
        data-testid="connect-button"
        onClick={() => setVisible(true)}
        disabled={connecting}
        className="rounded-full px-5 font-medium shadow-sm transition-all hover:shadow-md"
      >
        {connecting ? "Connecting…" : "Connect wallet"}
      </Button>
    );
  }

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-2 py-1 shadow-sm backdrop-blur"
      data-testid="connect-button-connected"
    >
      <span className="flex items-center gap-1.5 pl-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-arena-emerald" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-arena-emerald">
          devnet
        </span>
      </span>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {balance === null ? "…" : `${balance.toFixed(2)} SOL`}
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={disconnect}
        title="Click to disconnect"
        className="rounded-full font-mono text-xs"
      >
        {shortAddr(publicKey.toBase58())}
      </Button>
    </div>
  );
}
