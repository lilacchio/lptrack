export type LpAgentPool = {
  pool: string;
  tvl: number;
  fee: number;
  protocol: string;
  chain: string;
  token0: string;
  token1: string;
  vol_5m: number;
  vol_1h: number;
  vol_6h: number;
  vol_24h: number;
  base_price: number;
  quote_price: number;
  mcap: number;
  usd_price: number;
  fdv: number;
  organic_score: number;
  top_holder: number;
  mint_freeze: boolean;
  price_5m_change: number;
  price_1h_change: number;
  price_6h_change: number;
  price_24h_change: number;
  bin_step: number;
  liquidity_token0: number;
  liquidity_token1: number;
  created_at: string;
  updated_at: string;
  first_pool_created_at: string;
  token0_symbol: string;
  token0_name: string;
  token0_decimals: number;
  token1_symbol: string;
  token1_name: string;
  token1_decimals: number;
};

export type DiscoverResponse = {
  status: "success" | "error";
  data: LpAgentPool[];
};

export type LpAgentTopLper = {
  owner: string;
  chain: string;
  pool: string;
  protocol: string;
  token0: string;
  token1: string;
  total_inflow: number;
  total_outflow: number;
  total_fee: number;
  total_pnl: number;
  total_inflow_native: number;
  total_outflow_native: number;
  total_pnl_native: number;
  total_fee_native: number;
  total_lp: number;
  win_lp: number;
  win_lp_native: number;
  total_pool: number;
  win_rate: number;
  win_rate_native: number;
  apr: number;
  roi: number;
  roi_avg_inflow: number;
  roi_avg_inflow_native: number;
  avg_age_hour: number;
  first_activity: string;
  last_activity: string;
};

export type LpAgentTopLpersResponse = {
  status: "success" | "error";
  data: LpAgentTopLper[];
};

export type LpAgentOnchainStats = {
  pool: string;
  total_open_positions: number;
  unique_owners: number;
  total_input_value: number;
  total_input_native: number;
};

export type LpAgentOnchainStatsResponse = {
  status: "success" | "error";
  data: { poolStats: LpAgentOnchainStats[] };
};

export type LpAgentTokenData = {
  id: string;
  name: string;
  symbol: string;
  icon?: string;
  decimals: number;
  isVerified?: boolean;
  organicScore?: number;
  organicScoreLabel?: "high" | "medium" | "low" | string;
  tags?: string[];
  holderCount?: number;
  mcap?: number;
  usdPrice?: number;
};

export type LpAgentPoolInfo = {
  type: string;
  tokenInfo: Array<{
    status: "success" | "error";
    data: LpAgentTokenData[];
  }>;
};

export type LpAgentPoolInfoResponse = {
  status: "success" | "error";
  data: LpAgentPoolInfo;
};

type Bucketed = {
  ALL: number | null;
  "7D": number | null;
  "1M": number | null;
  "3M": number | null;
  "1Y": number | null;
  YTD: number | null;
};

export type LpAgentOwnerOverview = {
  owner: string;
  chain: string;
  protocol: string;
  total_inflow: number;
  total_outflow: number;
  total_reward: number;
  total_inflow_native: number;
  total_outflow_native: number;
  avg_inflow: Bucketed;
  total_fee: Bucketed;
  total_pnl: Bucketed;
};

export type LpAgentOverviewResponse = {
  status: "success" | "error";
  data: LpAgentOwnerOverview[];
};

export type LpAgentPosition = {
  status: "Open" | "Close" | string;
  strategyType: string;
  pairName: string;
  pool: string;
  token0: string;
  token1: string;
  inputValue: number;
  outputValue: string | number;
  currentValue: string | number;
  collectedFee: number;
  uncollectedFee?: string | number;
  impermanentLoss?: number;
  inRange?: boolean;
  createdAt: string;
  updatedAt: string;
  pnl: {
    value: number;
    valueNative: number;
    percent: number;
    percentNative: number;
  };
  owner: string;
  dpr?: number;
  ageHour?: string | number | null;
};

export type LpAgentOpeningResponse = {
  status: "success" | "error";
  count?: number;
  data: LpAgentPosition[];
};

export type LpAgentHistoricalResponse = {
  status: "success" | "error";
  data: { data: LpAgentPosition[] };
};

export type LpAgentRevenuePoint = {
  date: string;
  pnl?: number;
  fee?: number;
  inflow?: number;
  // LP Agent's exact shape varies by protocol; we keep the rest as unknown
  // and let the chart use whatever fields are present.
  [k: string]: unknown;
};

export type LpAgentRevenueResponse = {
  status: "success" | "error";
  data: LpAgentRevenuePoint[];
};

// --- Pool positions (DLMM/DAMM-v2) ----------------------------------------

export type LpAgentPoolPosition = {
  owner: string;
  status?: "Open" | "Close" | string;
  inputValue?: number;
  currentValue?: number | string;
  pnl?: { value?: number; percent?: number };
  [k: string]: unknown;
};

export type LpAgentPoolPositionsResponse = {
  status: "success" | "error";
  data?: {
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
    positions?: LpAgentPoolPosition[];
    positionState?: unknown[];
    activeBin?: unknown;
    prices?: Record<string, number>;
  };
  message?: string;
};

// --- Position logs (transaction history) ----------------------------------

export type LpAgentPositionLog = {
  owner: string;
  action: string; // e.g. "open", "close", "increase", "decrease", "claim_fee"
  amount0: string;
  amount1: string;
  decimal0: number;
  decimal1: number;
  price0: string;
  price1: string;
  timestamp: string;
  nativePrice?: string | null;
  strategyType?: string | null;
  tickUpper?: number | null;
  tickLower?: number | null;
  bps?: number | null;
  logo0?: string | null;
  logo1?: string | null;
};

export type LpAgentPositionLogsResponse = {
  status: "success" | "error";
  count?: number;
  data?: LpAgentPositionLog[];
  message?: string;
};

// --- Token balances --------------------------------------------------------

export type LpAgentTokenBalance = {
  tokenAddress: string;
  balance: number;
  rawBalance: string;
  symbol: string;
  decimals: number;
  logo?: string;
  balanceInUsd: number;
  price: number;
};

export type LpAgentTokenBalancesResponse = {
  status: "success" | "error";
  data?: LpAgentTokenBalance[];
  message?: string;
};
