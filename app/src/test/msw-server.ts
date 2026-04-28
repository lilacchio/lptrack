import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const BASE = "https://api.lpagent.io/open-api/v1";

const POOL = "PoolxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxX";
const OWNER = "OwnerxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxX";
const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const discoverPayload = {
  status: "success",
  data: [
    {
      pool: POOL,
      tvl: 1_000_000,
      fee: 0.05,
      protocol: "meteora",
      chain: "SOL",
      token0: USDC,
      token1: SOL,
      vol_5m: 0,
      vol_1h: 0,
      vol_6h: 0,
      vol_24h: 50_000,
      base_price: 1,
      quote_price: 100,
      mcap: 0,
      usd_price: 100,
      fdv: 0,
      organic_score: 90,
      top_holder: 0,
      mint_freeze: false,
      price_5m_change: 0,
      price_1h_change: 0,
      price_6h_change: 0,
      price_24h_change: 1.5,
      bin_step: 8,
      liquidity_token0: 0,
      liquidity_token1: 0,
      created_at: "2026-01-01T00:00:00+0000",
      updated_at: "2026-01-02T00:00:00+0000",
      first_pool_created_at: "2026-01-01T00:00:00+0000",
      token0_symbol: "USDC",
      token0_name: "USD Coin",
      token0_decimals: 6,
      token1_symbol: "SOL",
      token1_name: "Wrapped SOL",
      token1_decimals: 9,
    },
    {
      pool: "PoolBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxX",
      tvl: 0, // filtered out by topPoolsByTvl
      fee: 0.3,
      protocol: "meteora",
      chain: "SOL",
      token0: SOL,
      token1: USDC,
      vol_5m: 0,
      vol_1h: 0,
      vol_6h: 0,
      vol_24h: 0,
      base_price: 100,
      quote_price: 1,
      mcap: 0,
      usd_price: 100,
      fdv: 0,
      organic_score: 0,
      top_holder: 0,
      mint_freeze: false,
      price_5m_change: 0,
      price_1h_change: 0,
      price_6h_change: 0,
      price_24h_change: 0,
      bin_step: 8,
      liquidity_token0: 0,
      liquidity_token1: 0,
      created_at: "2026-01-01T00:00:00+0000",
      updated_at: "2026-01-02T00:00:00+0000",
      first_pool_created_at: "2026-01-01T00:00:00+0000",
      token0_symbol: "SOL",
      token0_name: "Wrapped SOL",
      token0_decimals: 9,
      token1_symbol: "USDC",
      token1_name: "USD Coin",
      token1_decimals: 6,
    },
  ],
};

export const FIXTURES = { POOL, OWNER, SOL, USDC };

export const server = setupServer(
  http.get(`${BASE}/pools/discover`, ({ request }) => {
    const auth = request.headers.get("x-api-key");
    if (auth !== "test-key") return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(discoverPayload);
  }),
  http.get(`${BASE}/pools/:id/info`, () =>
    HttpResponse.json({
      status: "success",
      data: {
        type: "meteora",
        tokenInfo: [
          {
            status: "success",
            data: [
              {
                id: USDC,
                name: "USD Coin",
                symbol: "USDC",
                icon: "https://example.com/usdc.png",
                decimals: 6,
                isVerified: true,
                organicScore: 95,
                organicScoreLabel: "high",
                tags: ["verified", "stable"],
              },
              {
                id: SOL,
                name: "Wrapped SOL",
                symbol: "SOL",
                icon: "https://example.com/sol.png",
                decimals: 9,
                isVerified: true,
                organicScore: 99,
                organicScoreLabel: "high",
                tags: ["verified"],
              },
            ],
          },
          { status: "error", data: [] },
        ],
      },
    })
  ),
  http.get(`${BASE}/pools/:id/onchain-stats`, ({ params }) =>
    HttpResponse.json({
      status: "success",
      data: {
        poolStats: [
          {
            pool: params.id,
            total_open_positions: 7,
            unique_owners: 5,
            total_input_value: 12_345.67,
            total_input_native: 100,
          },
        ],
      },
    })
  ),
  http.get(`${BASE}/pools/:id/top-lpers`, () =>
    HttpResponse.json({
      status: "success",
      data: [
        {
          owner: OWNER,
          chain: "SOL",
          pool: POOL,
          protocol: "meteora",
          token0: USDC,
          token1: SOL,
          total_inflow: 1000,
          total_outflow: 950,
          total_fee: 30,
          total_pnl: 50,
          total_inflow_native: 10,
          total_outflow_native: 9.5,
          total_pnl_native: 0.5,
          total_fee_native: 0.3,
          total_lp: 3,
          win_lp: 2,
          win_lp_native: 2,
          total_pool: 1,
          win_rate: 0.66,
          win_rate_native: 0.66,
          apr: 42.0,
          roi: 0.05,
          roi_avg_inflow: 0.05,
          roi_avg_inflow_native: 0.05,
          avg_age_hour: 100,
          first_activity: "2026-01-01 00:00:00.000",
          last_activity: "2026-01-10 00:00:00.000",
        },
      ],
    })
  ),
  http.get(`${BASE}/lp-positions/overview`, () =>
    HttpResponse.json({
      status: "success",
      data: [
        {
          owner: OWNER,
          chain: "SOL",
          protocol: "meteora",
          total_inflow: 5000,
          total_outflow: 4900,
          total_reward: 0,
          total_inflow_native: 50,
          total_outflow_native: 49,
          avg_inflow: { ALL: 1000, "7D": null, "1M": null, "3M": null, "1Y": 1000, YTD: 1000 },
          total_fee: { ALL: 50, "7D": 0, "1M": 0, "3M": 0, "1Y": 50, YTD: 50 },
          total_pnl: { ALL: 100, "7D": 0, "1M": 0, "3M": 0, "1Y": 100, YTD: 100 },
        },
      ],
    })
  ),
  http.get(`${BASE}/lp-positions/opening`, () =>
    HttpResponse.json({
      status: "success",
      count: 1,
      data: [
        samplePosition("Open"),
      ],
    })
  ),
  http.get(`${BASE}/lp-positions/historical`, () =>
    HttpResponse.json({
      status: "success",
      data: { data: [samplePosition("Close")] },
    })
  ),
  http.get(`${BASE}/lp-positions/revenue/:owner`, () =>
    HttpResponse.json({
      status: "success",
      data: [
        { date: "2026-04-20", pnl: 5 },
        { date: "2026-04-21", pnl: -2 },
        { date: "2026-04-22", pnl: 7 },
      ],
    })
  ),
  http.get(`${BASE}/pools/:id/positions`, ({ request }) => {
    const url = new URL(request.url);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 10);
    return HttpResponse.json({
      status: "success",
      data: {
        pagination: { page: 1, pageSize, total: 1, totalPages: 1 },
        positions: [
          { ...samplePosition("Open"), positionId: "pos-A" },
          { ...samplePosition("Close"), positionId: "pos-B" },
        ],
        prices: { [SOL]: 100, [USDC]: 1 },
      },
    });
  }),
  http.get(`${BASE}/lp-positions/logs`, ({ request }) => {
    const url = new URL(request.url);
    const owner = url.searchParams.get("owner") ?? OWNER;
    return HttpResponse.json({
      status: "success",
      count: 2,
      data: [
        {
          owner,
          action: "open",
          amount0: "100",
          amount1: "1",
          decimal0: 6,
          decimal1: 9,
          price0: "1",
          price1: "100",
          timestamp: "2026-04-25T12:00:00Z",
          nativePrice: null,
          strategyType: "Spot",
          tickUpper: 100,
          tickLower: -100,
          bps: 10000,
          logo0: null,
          logo1: null,
        },
        {
          owner,
          action: "claim_fee",
          amount0: "0.5",
          amount1: "0.005",
          decimal0: 6,
          decimal1: 9,
          price0: "1",
          price1: "100",
          timestamp: "2026-04-25T13:00:00Z",
          nativePrice: null,
          strategyType: null,
          tickUpper: null,
          tickLower: null,
          bps: null,
          logo0: null,
          logo1: null,
        },
      ],
    });
  }),
  http.get(`${BASE}/token/balance`, ({ request }) => {
    const url = new URL(request.url);
    const owner = url.searchParams.get("owner");
    if (!owner) {
      return HttpResponse.json(
        { status: "error", message: "owner is required" },
        { status: 400 }
      );
    }
    return HttpResponse.json({
      status: "success",
      data: [
        {
          tokenAddress: SOL,
          balance: 1.5,
          rawBalance: "1500000000",
          symbol: "SOL",
          decimals: 9,
          logo: "https://example.com/sol.png",
          balanceInUsd: 150.75,
          price: 100.5,
        },
        {
          tokenAddress: USDC,
          balance: 200,
          rawBalance: "200000000",
          symbol: "USDC",
          decimals: 6,
          logo: "https://example.com/usdc.png",
          balanceInUsd: 200,
          price: 1,
        },
      ],
    });
  })
);

function samplePosition(status: "Open" | "Close") {
  return {
    status,
    strategyType: "SpotImBalanced",
    pairName: "USDC · SOL",
    pool: POOL,
    token0: USDC,
    token1: SOL,
    inputValue: 100,
    outputValue: "105",
    currentValue: "108",
    collectedFee: 1.5,
    uncollectedFee: "0",
    impermanentLoss: -0.5,
    inRange: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    pnl: { value: 8, valueNative: 0.08, percent: 8, percentNative: 8 },
    owner: OWNER,
  };
}
