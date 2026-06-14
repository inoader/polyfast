import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ClobClient, OrderType, Side } from "@polymarket/clob-client-v2";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";

const app = express();
const port = Number(process.env.PORT || 8787);
const gammaApi = "https://gamma-api.polymarket.com";
const dataApi = "https://data-api.polymarket.com";
const clobApi = "https://clob.polymarket.com";
const polygonRpcUrl = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com";
const addressPattern = /^0x[a-fA-F0-9]{40}$/;
const tokenPattern = /^\d{10,80}$/;
const cache = new Map<string, { expiresAt: number; value: unknown }>();

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function stringParam(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberParam(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function cacheSet(key: string, value: unknown, ttl: number) {
  if (cache.size >= 1_000) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { expiresAt: Date.now() + ttl, value });
}

async function publicGet(url: URL, ttl = 15_000) {
  const key = url.toString();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json", "user-agent": "polyfast/0.1" },
        signal: AbortSignal.timeout(url.hostname === "clob.polymarket.com" ? 5_000 : 10_000),
      });
      const text = await response.text();
      if (!response.ok) {
        if (response.status >= 500 && attempt < 1) {
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 250 * (attempt + 1)));
          continue;
        }
        throw new ApiError(response.status, `Polymarket API: ${text.slice(0, 240)}`);
      }

      const value = text ? JSON.parse(text) : null;
      cacheSet(key, value, ttl);
      return value;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      lastError = error;
      if (attempt < 1) await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
    }
  }

  console.error(lastError);
  throw new ApiError(502, `暂时无法连接 ${url.hostname}，请稍后重试`);
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, now: Date.now() });
});

app.get("/api/events", async (request, response) => {
  const url = new URL("/events", gammaApi);
  const orderMap: Record<string, string> = {
    trending: "volume_24hr",
    volume: "volume",
    liquidity: "liquidity",
    ending: "end_date",
    newest: "start_date",
  };
  const sort = stringParam(request.query.sort, "trending");
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  url.searchParams.set("limit", String(numberParam(request.query.limit, 30, 1, 100)));
  url.searchParams.set("offset", String(numberParam(request.query.offset, 0, 0, 10_000)));
  url.searchParams.set("order", orderMap[sort] || orderMap.trending);
  url.searchParams.set("ascending", sort === "ending" ? "true" : "false");

  const tagId = stringParam(request.query.tagId);
  if (/^\d+$/.test(tagId)) {
    url.searchParams.set("tag_id", tagId);
    url.searchParams.set("related_tags", "true");
  }

  response.json(await publicGet(url));
});

app.get("/api/search", async (request, response) => {
  const query = stringParam(request.query.q).trim();
  if (query.length < 2) return response.json({ events: [], markets: [] });

  const url = new URL("/public-search", gammaApi);
  url.searchParams.set("q", query.slice(0, 100));
  url.searchParams.set("limit_per_type", "12");
  url.searchParams.set("events_status", "active");
  response.json(await publicGet(url, 30_000));
});

app.get("/api/events/:slug", async (request, response) => {
  const slug = request.params.slug;
  if (!/^[a-zA-Z0-9-]{1,180}$/.test(slug)) throw new ApiError(400, "无效的事件 slug");
  response.json(await publicGet(new URL(`/events/slug/${slug}`, gammaApi)));
});

app.get("/api/book/:tokenId", async (request, response) => {
  const tokenId = request.params.tokenId;
  if (!tokenPattern.test(tokenId)) throw new ApiError(400, "无效的 token id");
  const url = new URL("/book", clobApi);
  url.searchParams.set("token_id", tokenId);
  response.json(await publicGet(url, 3_000));
});

app.get("/api/history/:tokenId", async (request, response) => {
  const tokenId = request.params.tokenId;
  if (!tokenPattern.test(tokenId)) throw new ApiError(400, "无效的 token id");
  const intervals = new Set(["1h", "6h", "1d", "1w", "1m", "max"]);
  const interval = stringParam(request.query.interval, "1w");
  const url = new URL("/prices-history", clobApi);
  url.searchParams.set("market", tokenId);
  url.searchParams.set("interval", intervals.has(interval) ? interval : "1w");
  url.searchParams.set("fidelity", interval === "1h" ? "2" : interval === "6h" ? "10" : "60");
  response.json(await publicGet(url, 20_000));
});

app.get("/api/positions/:address", async (request, response) => {
  const address = request.params.address;
  if (!addressPattern.test(address)) throw new ApiError(400, "无效的钱包地址");
  const url = new URL("/positions", dataApi);
  url.searchParams.set("user", address);
  url.searchParams.set("sizeThreshold", "0.1");
  url.searchParams.set("limit", "200");
  url.searchParams.set("sortBy", "CURRENT");
  url.searchParams.set("sortDirection", "DESC");
  response.json(await publicGet(url, 10_000));
});

app.get("/api/activity/:address", async (request, response) => {
  const address = request.params.address;
  if (!addressPattern.test(address)) throw new ApiError(400, "无效的钱包地址");
  const url = new URL("/activity", dataApi);
  url.searchParams.set("user", address);
  url.searchParams.set("limit", "50");
  response.json(await publicGet(url, 10_000));
});

type TradingClient = InstanceType<typeof ClobClient>;
let tradingClientPromise: Promise<TradingClient> | null = null;

function tradingConfig() {
  const privateKey = process.env.POLYMARKET_PRIVATE_KEY;
  const funderAddress = process.env.POLYMARKET_FUNDER_ADDRESS;
  const signatureType = Number(process.env.POLYMARKET_SIGNATURE_TYPE || 0);
  return {
    configured: Boolean(privateKey && funderAddress),
    privateKey,
    funderAddress,
    signatureType,
    publicAddress: process.env.PUBLIC_WALLET_ADDRESS || funderAddress || "",
  };
}

async function getTradingClient() {
  const config = tradingConfig();
  if (!config.configured || !config.privateKey || !config.funderAddress) {
    throw new ApiError(503, "交易未配置。请先填写本机 .env。");
  }
  if (!addressPattern.test(config.funderAddress)) {
    throw new ApiError(500, "POLYMARKET_FUNDER_ADDRESS 格式无效");
  }

  tradingClientPromise ??= (async () => {
    const account = privateKeyToAccount(config.privateKey as `0x${string}`);
    const signer = createWalletClient({ account, chain: polygon, transport: http(polygonRpcUrl) });
    const temporary = new ClobClient({ host: clobApi, chain: 137, signer });
    const creds = await temporary.createOrDeriveApiKey();
    return new ClobClient({
      host: clobApi,
      chain: 137,
      signer,
      creds,
      signatureType: config.signatureType,
      funderAddress: config.funderAddress as `0x${string}`,
    });
  })();

  try {
    return await tradingClientPromise;
  } catch (error) {
    tradingClientPromise = null;
    throw error;
  }
}

app.get("/api/trading/status", (_request, response) => {
  const { configured, funderAddress, signatureType, publicAddress } = tradingConfig();
  response.json({ configured, funderAddress, signatureType, publicAddress });
});

app.get("/api/trading/orders", async (_request, response) => {
  const client = await getTradingClient();
  response.json(await client.getOpenOrders());
});

app.post("/api/trading/orders", async (request, response) => {
  const tokenId = stringParam(request.body.tokenId);
  const side = stringParam(request.body.side).toUpperCase();
  const orderType = stringParam(request.body.orderType, "GTC").toUpperCase();
  const price = Number(request.body.price);
  const size = Number(request.body.size);

  if (!tokenPattern.test(tokenId)) throw new ApiError(400, "无效的 token id");
  if (!["BUY", "SELL"].includes(side)) throw new ApiError(400, "无效的方向");
  if (!["GTC", "FOK", "FAK"].includes(orderType)) throw new ApiError(400, "无效的订单类型");
  if (!Number.isFinite(price) || price <= 0 || price >= 1) throw new ApiError(400, "价格必须在 0 和 1 之间");
  if (!Number.isFinite(size) || size <= 0) throw new ApiError(400, "数量必须大于 0");

  const client = await getTradingClient();
  const orderSide = side === "BUY" ? Side.BUY : Side.SELL;
  const result = orderType === "GTC"
    ? await client.createAndPostOrder({ tokenID: tokenId, price, size, side: orderSide }, undefined, OrderType.GTC)
    : await client.createAndPostMarketOrder(
      { tokenID: tokenId, price, amount: side === "BUY" ? price * size : size, side: orderSide },
      undefined,
      orderType === "FOK" ? OrderType.FOK : OrderType.FAK,
    );
  response.json(result);
});

app.delete("/api/trading/orders/:orderId", async (request, response) => {
  if (!/^[a-zA-Z0-9_-]{10,200}$/.test(request.params.orderId)) {
    throw new ApiError(400, "无效的订单 ID");
  }
  const client = await getTradingClient();
  response.json(await client.cancelOrder({ orderID: request.params.orderId }));
});

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distDir = resolve(rootDir, "dist");
if (process.env.NODE_ENV === "production" && existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("/{*path}", (_request, response) => response.sendFile(resolve(distDir, "index.html")));
}

app.use((error: unknown, _request: Request, response: Response, next: NextFunction) => {
  void next;
  const status = error instanceof ApiError ? error.status : 500;
  const message = error instanceof Error ? error.message : "未知服务端错误";
  if (!(error instanceof ApiError)) console.error(error);
  response.status(status).json({ error: message });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Polyfast API listening on http://127.0.0.1:${port}`);
});
