// Re-declared locally (no `server-only` runtime).
export type LpAgentPool = {
  pool: string;
  tvl: number;
  organic_score: number;
  top_holder: number;
  mint_freeze: boolean;
  token0_symbol: string;
  token1_symbol: string;
  [k: string]: unknown;
};

export type LpAgentTokenData = {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  isVerified?: boolean;
  organicScore?: number;
  organicScoreLabel?: string;
  [k: string]: unknown;
};

export type LpAgentPoolInfoResponse = {
  status: "success" | "error";
  data?: {
    tokenInfo: Array<{
      status: "success" | "error";
      data: LpAgentTokenData[];
    }>;
  };
};

export type LpAgentPosition = {
  status: "Open" | "Close" | string;
  pool: string;
  owner: string;
  inputValue: number;
  collectedFee: number;
  uncollectedFee?: string | number;
  pnl: {
    value: number;
    valueNative: number;
    percent: number;
    percentNative: number;
  };
  dpr?: number;
  [k: string]: unknown;
};

export type LpAgentOpeningResponse = {
  status: "success" | "error";
  count?: number;
  data: LpAgentPosition[];
};
