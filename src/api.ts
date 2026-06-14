import type {
  Activity,
  Event,
  HistoryPoint,
  OpenOrder,
  OrderBook,
  Position,
  TradingStatus,
} from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `请求失败 (${response.status})`);
  return data;
}

export const api = {
  events: (sort: string, tagId = "", offset = 0) =>
    request<Event[]>(
      `/api/events?sort=${encodeURIComponent(sort)}&tagId=${encodeURIComponent(tagId)}&offset=${offset}&limit=36`,
    ),
  search: (query: string) =>
    request<{ events?: Event[]; markets?: unknown[] }>(`/api/search?q=${encodeURIComponent(query)}`),
  event: (slug: string) => request<Event>(`/api/events/${encodeURIComponent(slug)}`),
  book: (tokenId: string) => request<OrderBook>(`/api/book/${tokenId}`),
  history: (tokenId: string, interval: string) =>
    request<{ history: HistoryPoint[] }>(`/api/history/${tokenId}?interval=${interval}`),
  positions: (address: string) => request<Position[]>(`/api/positions/${address}`),
  activity: (address: string) => request<Activity[]>(`/api/activity/${address}`),
  tradingStatus: () => request<TradingStatus>("/api/trading/status"),
  openOrders: () => request<OpenOrder[]>("/api/trading/orders"),
  placeOrder: (order: {
    tokenId: string;
    side: "BUY" | "SELL";
    orderType: "GTC" | "FOK" | "FAK";
    price: number;
    size: number;
  }) =>
    request<Record<string, unknown>>("/api/trading/orders", {
      method: "POST",
      body: JSON.stringify(order),
    }),
  cancelOrder: (orderId: string) =>
    request<Record<string, unknown>>(`/api/trading/orders/${encodeURIComponent(orderId)}`, {
      method: "DELETE",
    }),
};
