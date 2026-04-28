import { describe, expect, it } from "vitest";
import { FIXTURES } from "@/test/msw-server";
import {
  discoverPools,
  findPoolById,
  ownerHistoricalPositions,
  ownerOpenPositions,
  ownerOverview,
  ownerRevenue,
  poolInfoTokens,
  poolOnchainStats,
  poolPositions,
  poolTopLpers,
  positionLogs,
  tokenBalance,
  topPoolsByTvl,
  zapInBuild,
  zapInLand,
  zapOutBuild,
  zapOutLand,
  zapOutQuotes,
} from "./client";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw-server";

describe("LP Agent client — typed methods over MSW fixtures", () => {
  it("discoverPools returns the full payload array", async () => {
    const pools = await discoverPools({ pageSize: 8 });
    expect(pools.length).toBe(2);
    expect(pools[0].pool).toBe(FIXTURES.POOL);
    expect(pools[0].token0_symbol).toBe("USDC");
  });

  it("topPoolsByTvl filters out zero-TVL pools and sorts by TVL desc", async () => {
    const top = await topPoolsByTvl(8);
    expect(top.length).toBe(1);
    expect(top[0].tvl).toBe(1_000_000);
  });

  it("findPoolById returns the matching pool or null", async () => {
    const hit = await findPoolById(FIXTURES.POOL);
    expect(hit?.pool).toBe(FIXTURES.POOL);

    const miss = await findPoolById("does-not-exist");
    expect(miss).toBeNull();
  });

  it("poolInfoTokens flattens successful tokenInfo groups", async () => {
    const tokens = await poolInfoTokens(FIXTURES.POOL);
    expect(tokens.length).toBe(2);
    expect(tokens.find((t) => t.symbol === "USDC")?.organicScoreLabel).toBe(
      "high"
    );
    expect(tokens.every((t) => t.isVerified)).toBe(true);
  });

  it("poolOnchainStats returns the first poolStats entry", async () => {
    const stats = await poolOnchainStats(FIXTURES.POOL);
    expect(stats?.total_open_positions).toBe(7);
    expect(stats?.unique_owners).toBe(5);
  });

  it("poolTopLpers returns the data array", async () => {
    const lpers = await poolTopLpers(FIXTURES.POOL, { pageSize: 5 });
    expect(lpers.length).toBe(1);
    expect(lpers[0].apr).toBe(42);
    expect(lpers[0].owner).toBe(FIXTURES.OWNER);
  });

  it("ownerOverview returns the per-protocol records", async () => {
    const overview = await ownerOverview(FIXTURES.OWNER);
    expect(overview[0].total_pnl.ALL).toBe(100);
    expect(overview[0].avg_inflow["7D"]).toBeNull();
  });

  it("ownerOpenPositions returns the data array", async () => {
    const open = await ownerOpenPositions(FIXTURES.OWNER, { pageSize: 5 });
    expect(open.length).toBe(1);
    expect(open[0].status).toBe("Open");
  });

  it("ownerHistoricalPositions unwraps the nested data.data array", async () => {
    const hist = await ownerHistoricalPositions(FIXTURES.OWNER);
    expect(hist.length).toBe(1);
    expect(hist[0].status).toBe("Close");
  });

  it("ownerRevenue returns the time-series points", async () => {
    const rev = await ownerRevenue(FIXTURES.OWNER, "1M");
    expect(rev.length).toBe(3);
    expect(rev[0]).toMatchObject({ date: "2026-04-20", pnl: 5 });
  });

  it("zapInBuild posts to /pools/{id}/add-tx and returns serialized txs", async () => {
    server.use(
      http.post(
        "https://api.lpagent.io/open-api/v1/pools/:id/add-tx",
        async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            status: "success",
            data: {
              swapTxs: ["c3dhcA=="], // base64("swap")
              addLiquidityTxs: ["YWRk"], // base64("add")
              lastValidBlockHeight: 12345,
              echoedOwner: body.owner,
            },
          });
        }
      )
    );
    const out = await zapInBuild({
      poolId: FIXTURES.POOL,
      owner: FIXTURES.OWNER,
      inputSOL: 0.01,
      percentX: 0.5,
    });
    expect(out.status).toBe("success");
    expect(out.data?.swapTxs).toEqual(["c3dhcA=="]);
    expect(out.data?.lastValidBlockHeight).toBe(12345);
  });

  it("zapInLand posts to /pools/landing-add-tx with the signed txs", async () => {
    server.use(
      http.post(
        "https://api.lpagent.io/open-api/v1/pools/landing-add-tx",
        async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            status: "success",
            data: { signatures: ["sig1", "sig2"], received: body },
          });
        }
      )
    );
    const out = await zapInLand({
      addLiquidityTxsWithJito: ["c2lnbmVk"],
      lastValidBlockHeight: 12345,
    });
    expect(out.status).toBe("success");
    expect(out.data?.signatures).toEqual(["sig1", "sig2"]);
  });

  it("zapOutQuotes posts to /position/decrease-quotes", async () => {
    server.use(
      http.post(
        "https://api.lpagent.io/open-api/v1/position/decrease-quotes",
        async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            status: "success",
            data: { quotes: ["a", "b"], echoedBps: body.bps },
          });
        }
      )
    );
    const out = await zapOutQuotes({ id: "pos-1", bps: 5000 });
    expect(out.status).toBe("success");
    expect((out.data as { quotes: string[] }).quotes).toEqual(["a", "b"]);
  });

  it("zapOutBuild posts to /position/decrease-tx", async () => {
    server.use(
      http.post(
        "https://api.lpagent.io/open-api/v1/position/decrease-tx",
        () =>
          HttpResponse.json({
            status: "success",
            data: {
              closeTxs: ["Y2xvc2U="],
              swapTxs: ["c3dhcA=="],
              lastValidBlockHeight: 999,
            },
          })
      )
    );
    const out = await zapOutBuild({
      position_id: "pos-1",
      bps: 5000,
      owner: FIXTURES.OWNER,
      slippage_bps: 200,
    });
    expect(out.status).toBe("success");
    expect(out.data?.closeTxs).toEqual(["Y2xvc2U="]);
    expect(out.data?.lastValidBlockHeight).toBe(999);
  });

  it("poolPositions returns positions + pagination total + prices", async () => {
    const out = await poolPositions(FIXTURES.POOL, { pageSize: 5 });
    expect(out.positions.length).toBe(2);
    expect(out.total).toBe(1);
    expect(out.prices[FIXTURES.SOL]).toBe(100);
  });

  it("positionLogs returns the log array and requires position or owner", async () => {
    const logs = await positionLogs({ owner: FIXTURES.OWNER });
    expect(logs.length).toBe(2);
    expect(logs[0].action).toBe("open");
    await expect(positionLogs({})).rejects.toThrow(/position.*owner/);
  });

  it("tokenBalance returns the balance array for an owner", async () => {
    const balances = await tokenBalance(FIXTURES.OWNER);
    expect(balances.length).toBe(2);
    expect(balances.find((b) => b.symbol === "SOL")?.balance).toBe(1.5);
  });

  it("zapOutLand posts to /position/landing-decrease-tx", async () => {
    server.use(
      http.post(
        "https://api.lpagent.io/open-api/v1/position/landing-decrease-tx",
        () =>
          HttpResponse.json({
            status: "success",
            data: { signatures: ["s1"] },
          })
      )
    );
    const out = await zapOutLand({
      closeTxsWithJito: ["c2lnbmVk"],
      lastValidBlockHeight: 999,
    });
    expect(out.status).toBe("success");
    expect(out.data?.signatures).toEqual(["s1"]);
  });
});
