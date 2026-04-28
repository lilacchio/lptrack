import "server-only";
import type {
  DiscoverResponse,
  LpAgentHistoricalResponse,
  LpAgentOnchainStats,
  LpAgentOnchainStatsResponse,
  LpAgentOpeningResponse,
  LpAgentOverviewResponse,
  LpAgentOwnerOverview,
  LpAgentPool,
  LpAgentPoolInfoResponse,
  LpAgentPoolPosition,
  LpAgentPoolPositionsResponse,
  LpAgentPosition,
  LpAgentPositionLog,
  LpAgentPositionLogsResponse,
  LpAgentRevenuePoint,
  LpAgentRevenueResponse,
  LpAgentTokenBalance,
  LpAgentTokenBalancesResponse,
  LpAgentTokenData,
  LpAgentTopLper,
  LpAgentTopLpersResponse,
} from "./types";

// Env is read on each call (not at module load) so test setup can inject
// values before the first request fires.
function lpagentEnv() {
  return {
    base: process.env.LPAGENT_BASE_URL ?? "https://api.lpagent.io",
    key: process.env.LPAGENT_API_KEY ?? "",
  };
}

async function lpagentFetch<T>(
  path: string,
  init?: RequestInit & { revalidate?: number }
): Promise<T> {
  const { base, key } = lpagentEnv();
  const url = `${base}/open-api/v1${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "x-api-key": key,
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
    next: { revalidate: init?.revalidate ?? 60 },
  });
  if (!res.ok) {
    throw new Error(`LP Agent ${res.status} ${res.statusText} on ${path}`);
  }
  return (await res.json()) as T;
}

export async function discoverPools(opts?: {
  pageSize?: number;
}): Promise<LpAgentPool[]> {
  const pageSize = opts?.pageSize ?? 32;
  const json = await lpagentFetch<DiscoverResponse>(
    `/pools/discover?pageSize=${pageSize}`
  );
  return json.data ?? [];
}

export async function topPoolsByTvl(limit = 8): Promise<LpAgentPool[]> {
  const pools = await discoverPools({ pageSize: 64 });
  return pools
    .filter((p) => p.tvl > 0 && p.token0_symbol && p.token1_symbol)
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, limit);
}

export async function findPoolById(id: string): Promise<LpAgentPool | null> {
  const pools = await discoverPools({ pageSize: 64 });
  return pools.find((p) => p.pool === id) ?? null;
}

export async function poolTopLpers(
  poolId: string,
  opts?: { pageSize?: number }
): Promise<LpAgentTopLper[]> {
  const pageSize = opts?.pageSize ?? 10;
  const json = await lpagentFetch<LpAgentTopLpersResponse>(
    `/pools/${poolId}/top-lpers?pageSize=${pageSize}`
  );
  return json.data ?? [];
}

export async function poolOnchainStats(
  poolId: string
): Promise<LpAgentOnchainStats | null> {
  const json = await lpagentFetch<LpAgentOnchainStatsResponse>(
    `/pools/${poolId}/onchain-stats`
  );
  return json.data?.poolStats?.[0] ?? null;
}

export async function poolInfoTokens(
  poolId: string
): Promise<LpAgentTokenData[]> {
  const json = await lpagentFetch<LpAgentPoolInfoResponse>(
    `/pools/${poolId}/info`
  );
  const groups = json.data?.tokenInfo ?? [];
  return groups
    .filter((g) => g.status === "success")
    .flatMap((g) => g.data ?? []);
}

export async function ownerOverview(
  owner: string
): Promise<LpAgentOwnerOverview[]> {
  const json = await lpagentFetch<LpAgentOverviewResponse>(
    `/lp-positions/overview?owner=${owner}`
  );
  return json.data ?? [];
}

export async function ownerOpenPositions(
  owner: string,
  opts?: { pageSize?: number }
): Promise<LpAgentPosition[]> {
  const pageSize = opts?.pageSize ?? 10;
  const json = await lpagentFetch<LpAgentOpeningResponse>(
    `/lp-positions/opening?owner=${owner}&pageSize=${pageSize}`
  );
  return json.data ?? [];
}

export async function ownerHistoricalPositions(
  owner: string,
  opts?: { pageSize?: number }
): Promise<LpAgentPosition[]> {
  const pageSize = opts?.pageSize ?? 10;
  const json = await lpagentFetch<LpAgentHistoricalResponse>(
    `/lp-positions/historical?owner=${owner}&pageSize=${pageSize}`
  );
  return json.data?.data ?? [];
}

export async function ownerRevenue(
  owner: string,
  range: "7D" | "1M" = "7D"
): Promise<LpAgentRevenuePoint[]> {
  const json = await lpagentFetch<LpAgentRevenueResponse>(
    `/lp-positions/revenue/${owner}?range=${range}`
  );
  return json.data ?? [];
}

export async function poolPositions(
  poolId: string,
  opts?: {
    pageSize?: number;
    page?: number;
    status?: "Open" | "Close";
    owner?: string;
  }
): Promise<{
  positions: LpAgentPoolPosition[];
  total: number;
  prices: Record<string, number>;
}> {
  const qs = new URLSearchParams();
  qs.set("pageSize", String(opts?.pageSize ?? 10));
  if (opts?.page) qs.set("page", String(opts.page));
  if (opts?.status) qs.set("status", opts.status);
  if (opts?.owner) qs.set("owner", opts.owner);
  const json = await lpagentFetch<LpAgentPoolPositionsResponse>(
    `/pools/${poolId}/positions?${qs.toString()}`
  );
  return {
    positions: json.data?.positions ?? [],
    total: json.data?.pagination?.total ?? 0,
    prices: json.data?.prices ?? {},
  };
}

export async function positionLogs(opts: {
  position?: string;
  owner?: string;
  chain?: string;
}): Promise<LpAgentPositionLog[]> {
  if (!opts.position && !opts.owner) {
    throw new Error("positionLogs requires `position` or `owner`");
  }
  const qs = new URLSearchParams();
  if (opts.position) qs.set("position", opts.position);
  if (opts.owner) qs.set("owner", opts.owner);
  qs.set("chain", opts.chain ?? "SOL");
  const json = await lpagentFetch<LpAgentPositionLogsResponse>(
    `/lp-positions/logs?${qs.toString()}`
  );
  return json.data ?? [];
}

export async function tokenBalance(
  owner: string,
  opts?: { ca?: string[] }
): Promise<LpAgentTokenBalance[]> {
  const qs = new URLSearchParams();
  qs.set("owner", owner);
  if (opts?.ca?.length) qs.set("ca", opts.ca.join(","));
  const json = await lpagentFetch<LpAgentTokenBalancesResponse>(
    `/token/balance?${qs.toString()}`,
    { revalidate: 15 } // wallet balances change fast; short ISR
  );
  return json.data ?? [];
}

// --- Zap-In (POST) ---------------------------------------------------------

export type ZapInRequest = {
  poolId: string;
  owner: string;
  inputSOL?: number;
  amountX?: number;
  amountY?: number;
  percentX?: number;
  fromBinId?: number;
  toBinId?: number;
  strategy?: string;
  slippage_bps?: number;
  provider?: string;
  mode?: string;
};

export type ZapInResponse = {
  status: "success" | "error";
  // LP Agent returns base64-serialized txs the wallet must sign + that we
  // then submit via the landing endpoint.
  data?: {
    swapTxs?: string[];
    addLiquidityTxs?: string[];
    lastValidBlockHeight?: number;
    [k: string]: unknown;
  };
  message?: string;
};

export async function zapInBuild(req: ZapInRequest): Promise<ZapInResponse> {
  const { poolId, ...body } = req;
  const { base, key } = lpagentEnv();
  const res = await fetch(`${base}/open-api/v1/pools/${poolId}/add-tx`, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      stratergy: body.strategy ?? "Spot", // Note: LP Agent's spelling.
      ...body,
    }),
    cache: "no-store",
  });
  return (await res.json()) as ZapInResponse;
}

export type ZapInLandRequest = {
  swapTxsWithJito?: string[];
  addLiquidityTxsWithJito: string[];
  lastValidBlockHeight: number;
  meta?: Record<string, unknown>;
};

export type ZapInLandResponse = {
  status: "success" | "error";
  data?: { signatures?: string[]; [k: string]: unknown };
  message?: string;
};

export async function zapInLand(
  req: ZapInLandRequest
): Promise<ZapInLandResponse> {
  const { base, key } = lpagentEnv();
  const res = await fetch(`${base}/open-api/v1/pools/landing-add-tx`, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(req),
    cache: "no-store",
  });
  return (await res.json()) as ZapInLandResponse;
}

// --- Zap-Out (POST) --------------------------------------------------------

export type ZapOutQuotesRequest = { id: string; bps: number };
export type ZapOutQuotesResponse = {
  status: "success" | "error";
  data?: unknown;
  message?: string;
};

export async function zapOutQuotes(
  req: ZapOutQuotesRequest
): Promise<ZapOutQuotesResponse> {
  const { base, key } = lpagentEnv();
  const res = await fetch(`${base}/open-api/v1/position/decrease-quotes`, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(req),
    cache: "no-store",
  });
  return (await res.json()) as ZapOutQuotesResponse;
}

export type ZapOutBuildRequest = {
  position_id: string;
  bps: number;
  owner: string;
  slippage_bps: number;
  output?: string;
  provider?: string;
  type?: string;
  fromBinId?: number;
  toBinId?: number;
};
export type ZapOutBuildResponse = {
  status: "success" | "error";
  data?: {
    closeTxs?: string[];
    swapTxs?: string[];
    lastValidBlockHeight?: number;
    [k: string]: unknown;
  };
  message?: string;
};

export async function zapOutBuild(
  req: ZapOutBuildRequest
): Promise<ZapOutBuildResponse> {
  const { base, key } = lpagentEnv();
  const res = await fetch(`${base}/open-api/v1/position/decrease-tx`, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(req),
    cache: "no-store",
  });
  return (await res.json()) as ZapOutBuildResponse;
}

export type ZapOutLandRequest = {
  lastValidBlockHeight: number;
  closeTxsWithJito: string[];
  swapTxsWithJito?: string[];
};
export type ZapOutLandResponse = {
  status: "success" | "error";
  data?: { signatures?: string[]; [k: string]: unknown };
  message?: string;
};

export async function zapOutLand(
  req: ZapOutLandRequest
): Promise<ZapOutLandResponse> {
  const { base, key } = lpagentEnv();
  const res = await fetch(
    `${base}/open-api/v1/position/landing-decrease-tx`,
    {
      method: "POST",
      headers: {
        "x-api-key": key,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(req),
      cache: "no-store",
    }
  );
  return (await res.json()) as ZapOutLandResponse;
}
