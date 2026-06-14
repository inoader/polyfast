export type Market = {
  id: string;
  question: string;
  slug: string;
  description?: string;
  outcomes: string;
  outcomePrices: string;
  clobTokenIds: string;
  active: boolean;
  closed: boolean;
  acceptingOrders?: boolean;
  endDate?: string;
  liquidity?: string | number;
  volume?: string | number;
  volume24hr?: number;
  spread?: number;
  oneDayPriceChange?: number;
  lastTradePrice?: number;
  bestBid?: number;
  bestAsk?: number;
  orderPriceMinTickSize?: number;
  orderMinSize?: number;
  negRisk?: boolean;
  groupItemTitle?: string;
};

export type Event = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  endDate?: string;
  volume?: number;
  volume24hr?: number;
  liquidity?: number;
  commentCount?: number;
  markets: Market[];
};

export type BookLevel = { price: string; size: string };

export type OrderBook = {
  market: string;
  asset_id: string;
  timestamp: string;
  bids: BookLevel[];
  asks: BookLevel[];
  min_order_size: string;
  tick_size: string;
  neg_risk: boolean;
};

export type HistoryPoint = { t: number; p: number };

export type Position = {
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  totalBought: number;
  realizedPnl: number;
  curPrice: number;
  title: string;
  slug: string;
  icon?: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  endDate?: string;
};

export type Activity = {
  proxyWallet: string;
  timestamp: number;
  conditionId: string;
  type: string;
  size: number;
  usdcSize: number;
  transactionHash: string;
  price: number;
  asset: string;
  side: string;
  outcomeIndex: number;
  title: string;
  slug: string;
  icon?: string;
  eventSlug: string;
  outcome: string;
  name?: string;
};

export type TradingStatus = {
  configured: boolean;
  funderAddress?: string;
  signatureType: number;
  publicAddress?: string;
};

export type OpenOrder = {
  id?: string;
  orderID?: string;
  market?: string;
  asset_id?: string;
  side?: string;
  original_size?: string;
  size_matched?: string;
  price?: string;
  outcome?: string;
};

export type ParsedMarket = Market & {
  parsedOutcomes: string[];
  parsedPrices: number[];
  tokenIds: string[];
};
