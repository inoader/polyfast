import type { Market, ParsedMarket } from "./types";

export const tags = [
  { label: "全部", id: "" },
  { label: "政治", id: "2" },
  { label: "体育", id: "1" },
  { label: "加密", id: "21" },
  { label: "科技", id: "1401" },
  { label: "财经", id: "120" },
  { label: "流行文化", id: "596" },
];

export function parseJsonArray(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function parseMarket(market: Market): ParsedMarket {
  return {
    ...market,
    parsedOutcomes: parseJsonArray(market.outcomes),
    parsedPrices: parseJsonArray(market.outcomePrices).map(Number),
    tokenIds: parseJsonArray(market.clobTokenIds),
  };
}

export function tradeableMarkets(markets: Market[]) {
  return markets.filter((market) => market.active && !market.closed && market.acceptingOrders !== false);
}

export function money(value: number | string | undefined, compact = true) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2,
  }).format(amount);
}

export function percent(value: number | undefined, signed = false) {
  const amount = Number(value || 0) * 100;
  return `${signed && amount > 0 ? "+" : ""}${amount.toFixed(Math.abs(amount) < 1 ? 1 : 0)}%`;
}

export function probability(value: number | undefined) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

export function shortAddress(value: string | undefined) {
  if (!value) return "";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function dateLabel(value: string | undefined) {
  if (!value) return "未设置";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: new Date(value).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  }).format(new Date(value));
}

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
