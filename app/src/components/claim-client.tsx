"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import {
  fetchEntry,
  type EntryAccount,
} from "@/lib/chain/program";
import {
  buildClaimPayoutTx,
  buildClaimRefundTx,
} from "@/lib/chain/tx";
import type { ArenaLifecycle } from "@/lib/chain/arenas";

const ACCENT_BG: Record<string, string> = {
  emerald: "bg-arena-emerald",
  orange: "bg-arena-orange",
  sky: "bg-arena-sky",
  violet: "bg-arena-violet",
};

const ACCENT_TEXT: Record<string, string> = {
  emerald: "text-arena-emerald",
  orange: "text-arena-orange",
  sky: "text-arena-sky",
  violet: "text-arena-violet",
};

const ACCENT_RING: Record<string, string> = {
  emerald: "ring-arena-emerald/40",
  orange: "ring-arena-orange/40",
  sky: "ring-arena-sky/40",
  violet: "ring-arena-violet/40",
};

const RANK_LABEL: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
};

type Props = {
  arenaPubkey: string;
  arenaState: string;
  lifecycle: ArenaLifecycle;
  theme: keyof typeof ACCENT_BG;
  pair: string;
  entryFeeSol: string;
  endTsMs: number;
};

type ClaimStatus = "idle" | "running" | "done" | "error";

export function ClaimClient({
  arenaPubkey,
  arenaState,
  lifecycle,
  theme,
  pair,
  entryFeeSol,
  endTsMs,
}: Props) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();

  const [entry, setEntry] = useState<EntryAccount | null>(null);
  const [entryLoading, setEntryLoading] = useState(false);
  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [sig, setSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const arenaPk = useMemo(() => {
    try {
      return new PublicKey(arenaPubkey);
    } catch {
      return null;
    }
  }, [arenaPubkey]);

  // Pull the wallet's entry account whenever the wallet (re)connects.
  useEffect(() => {
    if (!publicKey || !arenaPk) {
      setEntry(null);
      return;
    }
    let cancelled = false;
    setEntryLoading(true);
    fetchEntry(connection, arenaPk, publicKey)
      .then((e) => {
        if (cancelled) return;
        setEntry(e);
        setEntryLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setEntry(null);
        setEntryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey, arenaPk, connection]);

  const isClaimable = useMemo(() => {
    if (!entry) return false;
    if (entry.payoutClaimed) return false;
    if (lifecycle === "settled") return entry.finalRank > 0;
    if (lifecycle === "cancelled") return true;
    return false;
  }, [entry, lifecycle]);

  const claimType = lifecycle === "cancelled" ? "refund" : "payout";

  const handleClaim = useCallback(async () => {
    if (!publicKey || !arenaPk) return;
    setStatus("running");
    setError(null);
    setSig(null);
    try {
      const tx =
        claimType === "refund"
          ? await buildClaimRefundTx(connection, { publicKey }, arenaPk)
          : await buildClaimPayoutTx(connection, { publicKey }, arenaPk);

      // Pre-flight simulation surfaces program errors directly.
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      const sim = await connection.simulateTransaction(tx);
      if (sim.value.err) {
        const logs = sim.value.logs ?? [];
        throw new Error(
          `program rejected: ${JSON.stringify(sim.value.err)}` +
            (logs.length > 0 ? ` · ${logs[logs.length - 1]}` : "")
        );
      }

      const signature = await sendTransaction(tx, connection);
      setSig(signature);
      setStatus("done");

      // Re-fetch entry so payoutClaimed flips.
      fetchEntry(connection, arenaPk, publicKey)
        .then((e) => setEntry(e))
        .catch(() => {});
    } catch (err) {
      console.error("[claim] failed:", err);
      setStatus("error");
      setError(formatErr(err));
    }
  }, [publicKey, arenaPk, connection, sendTransaction, claimType]);

  // ─── render ─────────────────────────────────────────────────────────────

  if (!publicKey) {
    return (
      <ConnectGate
        title="Connect to see your rank."
        body={`We'll look up your on-chain entry in this arena and surface your ${claimType === "refund" ? "refund" : "payout"} if you're eligible.`}
        onConnect={() => setVisible(true)}
      />
    );
  }

  // Arena not yet in a claimable state.
  if (lifecycle !== "settled" && lifecycle !== "cancelled") {
    return (
      <Panel theme={theme}>
        <Eyebrow>not yet</Eyebrow>
        <h2 className="font-display text-2xl font-medium tracking-tight">
          The bell hasn&rsquo;t rung.
        </h2>
        <p className="text-sm text-muted-foreground">
          {pair} is currently <strong>{lifecycle}</strong>. Settlement starts
          at{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {new Date(endTsMs).toUTCString()}
          </code>
          . Claims open the moment the oracle posts the final standings.
        </p>
      </Panel>
    );
  }

  if (entryLoading) {
    return (
      <Panel theme={theme}>
        <Eyebrow>checking…</Eyebrow>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          looking up your entry…
        </p>
      </Panel>
    );
  }

  if (!entry) {
    return (
      <Panel theme={theme}>
        <Eyebrow>no entry on record</Eyebrow>
        <h2 className="font-display text-2xl font-medium tracking-tight">
          You weren&rsquo;t in this arena.
        </h2>
        <p className="text-sm text-muted-foreground">
          The on-chain Entry PDA for{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
          </code>{" "}
          doesn&rsquo;t exist for this arena. Connect a different wallet, or
          head back to see who placed.
        </p>
      </Panel>
    );
  }

  // Settled arena, ranked but already claimed.
  if (entry.payoutClaimed) {
    return (
      <Panel theme={theme}>
        <Eyebrow>already claimed</Eyebrow>
        <h2 className="font-display text-2xl font-medium tracking-tight">
          You already pulled the{" "}
          <em className={`italic ${ACCENT_TEXT[theme]}`}>
            {claimType === "refund" ? "refund" : "payout"}
          </em>
          .
        </h2>
        <p className="text-sm text-muted-foreground">
          The Entry account&rsquo;s{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            payout_claimed
          </code>{" "}
          flag is{" "}
          <strong className="text-foreground">true</strong>. Nothing left to
          do here.
        </p>
        {entry.finalRank > 0 && (
          <RankCard rank={entry.finalRank} theme={theme} />
        )}
      </Panel>
    );
  }

  // Settled but didn't place — no payout, no refund (arena is Completed not Cancelled).
  if (lifecycle === "settled" && entry.finalRank === 0) {
    return (
      <Panel theme={theme}>
        <Eyebrow>didn&rsquo;t place</Eyebrow>
        <h2 className="font-display text-2xl font-medium tracking-tight">
          You finished outside the prize positions.
        </h2>
        <p className="text-sm text-muted-foreground">
          Your entry is still on-chain (rank{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            0
          </code>{" "}
          = unranked) but there&rsquo;s no pot to claim. Better luck next
          arena.
        </p>
      </Panel>
    );
  }

  // ─── claimable ──────────────────────────────────────────────────────────
  return (
    <Panel theme={theme}>
      <Eyebrow>
        {claimType === "refund" ? "refund eligible" : "payout eligible"}
      </Eyebrow>
      <h2 className="font-display text-3xl font-medium tracking-tight">
        {claimType === "refund" ? (
          <>
            Reclaim your{" "}
            <em className={`italic ${ACCENT_TEXT[theme]}`}>
              {entryFeeSol} SOL
            </em>
            .
          </>
        ) : (
          <>
            You finished{" "}
            <em className={`italic ${ACCENT_TEXT[theme]}`}>
              {RANK_LABEL[entry.finalRank] ?? `#${entry.finalRank}`}
            </em>
            .
          </>
        )}
      </h2>
      <p className="text-sm text-muted-foreground">
        {claimType === "refund"
          ? "The arena was cancelled before settlement, so the program returns your full buy-in. One signature."
          : `Top three split the pot 50/30/20 minus a 2% protocol fee. Click below to call claim_payout — the program will transfer your share to your wallet.`}
      </p>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          size="lg"
          onClick={handleClaim}
          disabled={status === "running" || status === "done" || !isClaimable}
          className="rounded-full px-7"
        >
          {status === "running"
            ? "Signing…"
            : status === "done"
              ? "Claimed ✓"
              : claimType === "refund"
                ? `Claim refund · ${entryFeeSol} SOL`
                : `Claim payout · rank ${entry.finalRank}`}
        </Button>
        {sig && (
          <a
            className={`font-mono text-xs ${ACCENT_TEXT[theme]} hover:underline`}
            href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
          >
            view tx ↗
          </a>
        )}
      </div>

      {error && (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <details className="mt-4 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          on-chain entry record
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
          <Row label="Entry index" value={entry.entrantIndex.toString()} />
          <Row
            label="Final rank"
            value={
              entry.finalRank === 0
                ? "0 · unranked"
                : `${entry.finalRank} · ${RANK_LABEL[entry.finalRank] ?? `#${entry.finalRank}`}`
            }
          />
          <Row
            label="Final score"
            value={(Number(entry.finalScore) / 1e6).toFixed(4)}
          />
          <Row
            label="Deposit"
            value={`${(Number(entry.depositLamports) / 1e9).toFixed(3)} SOL`}
          />
          <Row label="Arena state" value={arenaState} />
          <Row label="Claimed" value={entry.payoutClaimed ? "true" : "false"} />
        </dl>
      </details>
    </Panel>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────

function ConnectGate({
  title,
  body,
  onConnect,
}: {
  title: string;
  body: string;
  onConnect: () => void;
}) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-3xl border border-dashed border-border bg-card/40 p-8">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        wallet required
      </span>
      <h2 className="font-display text-2xl font-medium tracking-tight">
        {title}
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      <Button
        size="lg"
        data-testid="claim-connect"
        onClick={onConnect}
        className="rounded-full px-7"
      >
        Connect wallet
      </Button>
    </section>
  );
}

function Panel({
  theme,
  children,
}: {
  theme: keyof typeof ACCENT_BG;
  children: React.ReactNode;
}) {
  return (
    <article
      data-testid="claim-panel"
      className={`relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-border bg-card p-8 ring-1 ring-inset ${ACCENT_RING[theme]}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-15 blur-3xl ${ACCENT_BG[theme]}`}
      />
      <div className="relative flex flex-col gap-4">{children}</div>
    </article>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-mono uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </>
  );
}

function RankCard({
  rank,
  theme,
}: {
  rank: number;
  theme: keyof typeof ACCENT_BG;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border border-border bg-background/40 px-5 py-3`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${ACCENT_BG[theme]} text-white`}
      >
        <span className="font-mono text-sm tabular-nums">
          #{String(rank).padStart(2, "0")}
        </span>
      </span>
      <div className="flex flex-col">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          your final rank
        </span>
        <span className="text-base font-medium">
          {RANK_LABEL[rank] ?? `Rank ${rank}`}
        </span>
      </div>
    </div>
  );
}

function formatErr(err: unknown): string {
  if (!(err instanceof Error)) return "unknown error";
  const inner = (err as { error?: unknown }).error;
  const cause = (err as { cause?: unknown }).cause;
  const parts: string[] = [err.message || err.name];
  if (inner instanceof Error && inner.message && inner.message !== err.message) {
    parts.push(`(${inner.message})`);
  }
  if (cause instanceof Error && cause.message && cause.message !== err.message) {
    parts.push(`(${cause.message})`);
  }
  return parts.join(" ");
}
