"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { fetchArena, fetchEntry, type ArenaAccount } from "@/lib/chain/program";
import { buildEnterArenaTx } from "@/lib/chain/tx";
import type { LpAgentTokenData } from "@/lib/lpagent/types";

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

type StepStatus = "pending" | "ready" | "running" | "done" | "error";

export type EntryWizardClientProps = {
  pubkey: string;
  pool: {
    pool: string;
    protocol: string;
    tvl: number;
    token0_symbol: string;
    token1_symbol: string;
    token0: string;
    token1: string;
  };
  tokens: LpAgentTokenData[];
  theme: keyof typeof ACCENT_BG;
};

export function EntryWizardClient({
  pubkey,
  pool,
  theme,
}: EntryWizardClientProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signAllTransactions } = useWallet();
  const { setVisible } = useWalletModal();

  const [arena, setArena] = useState<ArenaAccount | null>(null);
  const [arenaLoading, setArenaLoading] = useState(true);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [step2Status, setStep2Status] = useState<StepStatus>("pending");
  const [step2Sig, setStep2Sig] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [step3Status, setStep3Status] = useState<StepStatus>("pending");
  const [step3Sigs, setStep3Sigs] = useState<string[]>([]);
  const [step3Error, setStep3Error] = useState<string | null>(null);

  const arenaPk = useMemo(() => {
    try {
      return new PublicKey(pubkey);
    } catch {
      return null;
    }
  }, [pubkey]);

  // Pre-flight wallet balance via the active RPC connection. LP Agent's
  // /token/balance is mainnet-only and returns 0 for devnet wallets, so we
  // can't use it here. Best-effort; failure is silent.
  useEffect(() => {
    if (!publicKey) {
      setSolBalance(null);
      return;
    }
    let cancelled = false;
    connection
      .getBalance(publicKey)
      .then((lamports) => {
        if (!cancelled) setSolBalance(lamports / 1e9);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [publicKey, connection]);

  useEffect(() => {
    if (!arenaPk) {
      setArenaLoading(false);
      return;
    }
    let cancelled = false;
    fetchArena(connection, arenaPk)
      .then((a) => {
        if (cancelled) return;
        setArena(a);
        setArenaLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setArenaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [arenaPk, connection]);

  // On mount (or wallet change): if an Entry PDA already exists for this
  // (arena, wallet) the user has already paid `enter_arena` in a previous
  // session — surface that as a completed Step 2 instead of asking them to
  // pay again. Best-effort; silent on failure.
  useEffect(() => {
    if (!arenaPk || !publicKey) return;
    let cancelled = false;
    fetchEntry(connection, arenaPk, publicKey)
      .then((entry) => {
        if (cancelled || !entry) return;
        setStep2Status((prev) => (prev === "pending" || prev === "ready" ? "done" : prev));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [arenaPk, publicKey, connection]);

  const handleEnterArena = useCallback(async () => {
    if (!publicKey || !arenaPk || !arena) return;
    setStep2Status("running");
    setStep2Error(null);
    try {
      const tx = await buildEnterArenaTx(connection, { publicKey }, arenaPk);

      // Pre-flight simulation: surfaces the program's real error message
      // even when the wallet adapter wraps it as "Unexpected error". We must
      // attach a recent blockhash + fee payer for simulation to run.
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      const sim = await connection.simulateTransaction(tx);
      if (sim.value.err) {
        const logs = sim.value.logs ?? [];
        console.error(
          "[wizard] enter_arena simulation failed:",
          sim.value.err,
          logs
        );
        throw new Error(
          `program rejected: ${JSON.stringify(sim.value.err)}` +
            (logs.length > 0 ? ` · last log: ${logs[logs.length - 1]}` : "")
        );
      }

      const sig = await sendTransaction(tx, connection);
      setStep2Sig(sig);
      setStep2Status("done");
    } catch (err) {
      console.error("[wizard] enter_arena failed:", err);
      setStep2Status("error");
      setStep2Error(formatTxError(err));
    }
  }, [publicKey, arenaPk, arena, connection, sendTransaction]);

  const handleZapIn = useCallback(async () => {
    if (!publicKey || !signAllTransactions) return;
    setStep3Status("running");
    setStep3Error(null);
    try {
      const buildRes = await fetch("/api/zap/in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          poolId: pool.pool,
          owner: publicKey.toBase58(),
          inputSOL: 0.01,
          percentX: 0.5,
          slippage_bps: 500,
          strategy: "Spot",
        }),
      });
      const buildJson = (await buildRes.json()) as {
        status: string;
        data?: {
          swapTxs?: string[];
          addLiquidityTxs?: string[];
          lastValidBlockHeight?: number;
        };
        message?: string;
      };
      if (buildJson.status !== "success" || !buildJson.data) {
        throw new Error(buildJson.message ?? "Zap-In build failed");
      }
      const swapTxs = (buildJson.data.swapTxs ?? []).map(deserializeTx);
      const addTxs = (buildJson.data.addLiquidityTxs ?? []).map(deserializeTx);
      const allTxs = [...swapTxs, ...addTxs];
      if (allTxs.length === 0) {
        throw new Error(
          "LP Agent couldn't build an add-liquidity tx for this pool right now (often happens on very-low-TVL pairs where the swap router can't quote). Your on-chain entry from Step 2 already counts — you're in the arena. You can add liquidity manually on Meteora, or enter a different arena.",
        );
      }
      const signed = await signAllTransactions(allTxs);
      const signedSwap = signed.slice(0, swapTxs.length).map(serializeTx);
      const signedAdd = signed.slice(swapTxs.length).map(serializeTx);

      const landRes = await fetch("/api/zap/in/land", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          swapTxsWithJito: signedSwap,
          addLiquidityTxsWithJito: signedAdd,
          lastValidBlockHeight: buildJson.data.lastValidBlockHeight ?? 0,
        }),
      });
      const landJson = (await landRes.json()) as {
        status: string;
        data?: { signatures?: string[] };
        message?: string;
      };
      if (landJson.status !== "success") {
        throw new Error(landJson.message ?? "Zap-In landing failed");
      }
      setStep3Sigs(landJson.data?.signatures ?? []);
      setStep3Status("done");
    } catch (err) {
      setStep3Status("error");
      setStep3Error(err instanceof Error ? err.message : "unknown");
    }
  }, [publicKey, signAllTransactions, pool.pool]);

  const entryFeeSol = arena
    ? (Number(arena.entryFeeLamports) / 1e9).toFixed(3)
    : null;

  const step1: StepStatus = "done";
  const step2Live = !arenaLoading && Boolean(arena);
  const step2Effective: StepStatus = step2Live
    ? step2Status === "pending"
      ? "ready"
      : step2Status
    : "pending";
  const step3Effective: StepStatus =
    step2Status === "done"
      ? step3Status === "pending"
        ? "ready"
        : step3Status
      : "pending";

  return (
    <ol
      data-testid="entry-wizard"
      className="flex flex-col gap-4"
    >
      <Step n={1} title="Confirm arena" status={step1} theme={theme}>
        <p className="text-sm text-muted-foreground">
          Commit a fixed buy-in to the on-chain pot, then your LP performance is
          scored every minute by LP Agent until the arena settles. Top three
          split the pot 50 / 30 / 20.
        </p>
      </Step>

      <Step n={2} title="Sign enter_arena" status={step2Effective} theme={theme}>
        {arenaLoading ? (
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            resolving on-chain arena…
          </p>
        ) : !arena ? (
          <NoArenaHint pubkey={pubkey} />
        ) : !publicKey ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Connect Phantom or Solflare to sign{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                enter_arena
              </code>
              . Entry fee:{" "}
              <strong className="text-foreground">{entryFeeSol} SOL</strong>.
            </p>
            <Button
              size="lg"
              data-testid="wizard-connect"
              onClick={() => setVisible(true)}
              className="self-start rounded-full px-7"
            >
              Connect wallet
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Signing as{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {publicKey.toBase58().slice(0, 4)}…
                {publicKey.toBase58().slice(-4)}
              </code>
              . Entry fee:{" "}
              <strong className="text-foreground">{entryFeeSol} SOL</strong>.
              {solBalance !== null && (
                <>
                  {" "}
                  Wallet:{" "}
                  <code
                    data-testid="wizard-balance"
                    className={`font-mono text-xs ${
                      entryFeeSol && solBalance < Number(entryFeeSol)
                        ? "text-destructive"
                        : "text-arena-emerald"
                    }`}
                  >
                    {solBalance.toFixed(3)} SOL
                  </code>
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                data-testid="wizard-enter"
                onClick={handleEnterArena}
                disabled={step2Status === "running" || step2Status === "done"}
                className="rounded-full px-7"
              >
                {step2Status === "running"
                  ? "Signing…"
                  : step2Status === "done"
                    ? "Entered ✓"
                    : `Sign & pay ${entryFeeSol} SOL`}
              </Button>
              {step2Sig && (
                <a
                  className={`font-mono text-xs ${ACCENT_TEXT[theme]} hover:underline`}
                  href={`https://explorer.solana.com/tx/${step2Sig}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                >
                  view tx ↗
                </a>
              )}
            </div>
            {step2Error && (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {step2Error}
              </p>
            )}
          </div>
        )}
      </Step>

      <Step n={3} title="Zap-In via LP Agent" status={step3Effective} theme={theme}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            We build the add-liquidity tx via{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              /pools/{"{id}"}/add-tx
            </code>
            , you sign once, and{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              /pools/landing-add-tx
            </code>{" "}
            lands it via Jito.
          </p>
          <Button
            size="lg"
            data-testid="wizard-zap"
            disabled={step3Effective !== "ready" && step3Effective !== "error"}
            onClick={handleZapIn}
            className="self-start rounded-full px-7"
          >
            {step3Status === "running"
              ? "Building + signing…"
              : step3Status === "done"
                ? "Zapped in ✓"
                : "Zap In · 0.01 SOL"}
          </Button>
          {step3Sigs.length > 0 && (
            <ul className="flex flex-col gap-1">
              {step3Sigs.map((s) => (
                <li key={s}>
                  <a
                    className={`font-mono text-xs ${ACCENT_TEXT[theme]} hover:underline`}
                    href={`https://solscan.io/tx/${s}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {s.slice(0, 8)}…{s.slice(-8)} ↗
                  </a>
                </li>
              ))}
            </ul>
          )}
          {step3Error && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {step3Error}
            </p>
          )}
        </div>
      </Step>
    </ol>
  );
}

function Step({
  n,
  title,
  status,
  theme,
  children,
}: {
  n: number;
  title: string;
  status: StepStatus;
  theme: keyof typeof ACCENT_BG;
  children: React.ReactNode;
}) {
  const isActive = status === "ready" || status === "running" || status === "done";
  const isDone = status === "done";
  const isError = status === "error";
  const isRunning = status === "running";

  return (
    <li>
      <article
        data-testid={`wizard-step-${n}`}
        className={`relative flex gap-5 overflow-hidden rounded-3xl border bg-card p-6 transition-all ${
          isActive
            ? "border-border shadow-sm"
            : "border-dashed border-border/60"
        } ${isDone ? `ring-1 ring-inset ${ACCENT_RING[theme]}` : ""}`}
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl transition-opacity ${
            isActive ? ACCENT_BG[theme] : "bg-muted"
          } ${isActive ? "opacity-15" : "opacity-0"}`}
        />

        <StepNumber n={n} status={status} theme={theme} />

        <div className="relative flex flex-1 flex-col gap-4">
          <header className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-xl font-medium tracking-tight">
                {title}
              </h3>
              <StepStatusPill status={status} theme={theme} />
            </div>
            <p
              className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
                isError
                  ? "text-destructive"
                  : isRunning
                    ? ACCENT_TEXT[theme]
                    : "text-muted-foreground"
              }`}
            >
              {status === "done"
                ? "complete"
                : status === "running"
                  ? "in progress"
                  : status === "ready"
                    ? "ready"
                    : status === "error"
                      ? "needs retry"
                      : "waiting"}
            </p>
          </header>
          <div>{children}</div>
        </div>
      </article>
    </li>
  );
}

function StepNumber({
  n,
  status,
  theme,
}: {
  n: number;
  status: StepStatus;
  theme: keyof typeof ACCENT_BG;
}) {
  const isDone = status === "done";
  const isRunning = status === "running";
  const isActive = status === "ready" || isDone || isRunning;
  return (
    <div
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
        isActive
          ? `${ACCENT_BG[theme]} text-white border-transparent`
          : "border-border bg-muted text-muted-foreground"
      }`}
    >
      {isDone ? (
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10l4 4 8-8" />
        </svg>
      ) : (
        <span className="font-mono text-sm tabular-nums">
          {String(n).padStart(2, "0")}
        </span>
      )}
      {isRunning && (
        <span className={`absolute inset-0 -z-10 animate-ping rounded-2xl ${ACCENT_BG[theme]} opacity-50`} />
      )}
    </div>
  );
}

function StepStatusPill({
  status,
  theme,
}: {
  status: StepStatus;
  theme: keyof typeof ACCENT_BG;
}) {
  const map: Record<StepStatus, { label: string; cls: string }> = {
    pending: { label: "waiting", cls: "border-border text-muted-foreground" },
    ready: { label: "ready", cls: `border-current ${ACCENT_TEXT[theme]}` },
    running: { label: "running", cls: `border-current ${ACCENT_TEXT[theme]}` },
    done: { label: "done", cls: "border-current text-arena-emerald" },
    error: { label: "error", cls: "border-current text-destructive" },
  };
  const m = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] ${m.cls}`}
    >
      {status === "running" && (
        <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${ACCENT_BG[theme]}`} />
      )}
      {m.label}
    </span>
  );
}

function NoArenaHint({ pubkey }: { pubkey: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        No on-chain arena exists at this address yet. The home grid currently
        shows raw LP Agent pool addresses; the wizard needs an{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          lp_arena
        </code>{" "}
        PDA.
      </p>
      <p className="text-sm text-muted-foreground">Spin one up from WSL:</p>
      <pre className="overflow-x-auto rounded-2xl border border-border bg-muted/30 px-4 py-3 font-mono text-xs">
        {`pnpm --filter scripts run create-long-arena
# then visit  /arena/<arena-PDA>/enter`}
      </pre>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        url pubkey · {pubkey.slice(0, 8)}…{pubkey.slice(-6)}
      </p>
    </div>
  );
}

/**
 * Pulls the most useful message out of a wallet-adapter / Solana RPC error.
 * `WalletSendTransactionError` wraps the underlying RPC error; the program
 * logs (when available) live on `err.logs` or `err.error.logs`.
 */
function formatTxError(err: unknown): string {
  if (!(err instanceof Error)) return "unknown error";
  const parts: string[] = [err.message || err.name || "unknown"];

  // wallet-adapter WalletError stores the original on `.error`
  const inner = (err as { error?: unknown }).error;
  if (inner instanceof Error && inner.message && inner.message !== err.message) {
    parts.push(`(${inner.message})`);
  }
  const cause = (err as { cause?: unknown }).cause;
  if (cause instanceof Error && cause.message && cause.message !== err.message) {
    parts.push(`(${cause.message})`);
  }
  const logs =
    (err as { logs?: string[] }).logs ??
    (err as { error?: { logs?: string[] } }).error?.logs ??
    (cause as { logs?: string[] } | undefined)?.logs;
  if (logs && logs.length > 0) {
    const lastLog = logs[logs.length - 1];
    parts.push(`· last log: ${lastLog}`);
  }
  return parts.join(" ");
}

// --- Tx serialization helpers (browser-safe, no Buffer dep) ---------------

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function deserializeTx(b64: string): Transaction | VersionedTransaction {
  const bytes = b64ToBytes(b64);
  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    return Transaction.from(bytes);
  }
}

function serializeTx(tx: Transaction | VersionedTransaction): string {
  if (tx instanceof VersionedTransaction) {
    return bytesToB64(tx.serialize());
  }
  return bytesToB64(
    tx.serialize({ requireAllSignatures: false, verifySignatures: false })
  );
}
