// LP Agent client — node-only port of app/src/lib/lpagent/client.ts (without
// the `server-only` import). Reads + the few POST endpoints we need server-side.
import { env } from "../env.ts";
import type {
  LpAgentPool,
  LpAgentPoolInfoResponse,
  LpAgentTokenData,
  LpAgentOpeningResponse,
  LpAgentPosition,
} from "./lpagent.types.ts";

async function lpaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${env.lpAgentBaseUrl}/open-api/v1${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "x-api-key": env.lpAgentApiKey,
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`LP Agent ${res.status} ${res.statusText} on ${path}`);
  }
  return (await res.json()) as T;
}

export async function poolInfoTokens(poolId: string): Promise<LpAgentTokenData[]> {
  const json = await lpaFetch<LpAgentPoolInfoResponse>(`/pools/${poolId}/info`);
  const groups = json.data?.tokenInfo ?? [];
  return groups
    .filter((g) => g.status === "success")
    .flatMap((g) => g.data ?? []);
}

export async function poolDiscoverOne(poolId: string): Promise<LpAgentPool | null> {
  const json = await lpaFetch<{ data?: LpAgentPool[] }>(`/pools/discover?pageSize=64`);
  return json.data?.find((p) => p.pool === poolId) ?? null;
}

/**
 * Top N pools by TVL, optionally filtered by protocol family. Used by the
 * spawn cron to pick a fresh pool for each daily arena.
 */
export async function topPoolsByTvl(
  limit = 8,
  opts: { protocol?: "meteora_dlmm" | "meteora_damm_v2" } = {},
): Promise<LpAgentPool[]> {
  const json = await lpaFetch<{ data?: LpAgentPool[] }>(
    `/pools/discover?pageSize=64`,
  );
  const all = json.data ?? [];
  const filtered = opts.protocol
    ? all.filter((p) => p.protocol === opts.protocol)
    : all;
  return filtered
    .slice()
    .sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0))
    .slice(0, limit);
}

export async function ownerOpeningPositions(
  owner: string,
): Promise<LpAgentPosition[]> {
  const json = await lpaFetch<LpAgentOpeningResponse>(
    `/lp-positions/opening?owner=${owner}&pageSize=50`,
  );
  return json.data ?? [];
}
