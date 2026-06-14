import type { OrderBook } from "../types";

function levelsWithDepth(levels: OrderBook["bids"]) {
  const max = Math.max(...levels.map((level) => Number(level.size)), 1);
  return levels.map((level) => ({ ...level, depth: `${Math.max(3, (Number(level.size) / max) * 100)}%` }));
}

export function OrderBookView({ book }: { book: OrderBook | null }) {
  if (!book) return <div className="orderbook-loading">正在载入盘口...</div>;
  const asks = levelsWithDepth(book.asks.slice(0, 8).reverse());
  const bids = levelsWithDepth(book.bids.slice(0, 8));
  const bestAsk = Number(book.asks[0]?.price || 0);
  const bestBid = Number(book.bids[0]?.price || 0);

  return (
    <div className="orderbook">
      <div className="orderbook__head"><span>价格</span><span>数量</span><span>金额</span></div>
      {asks.map((level, index) => (
        <div className="book-row ask" key={`a-${index}`}>
          <i style={{ width: level.depth }} />
          <b>{(Number(level.price) * 100).toFixed(1)}¢</b>
          <span>{Number(level.size).toFixed(1)}</span>
          <span>${(Number(level.price) * Number(level.size)).toFixed(0)}</span>
        </div>
      ))}
      <div className="spread-row">
        <span>点差</span>
        <b>{((bestAsk - bestBid) * 100).toFixed(1)}¢</b>
      </div>
      {bids.map((level, index) => (
        <div className="book-row bid" key={`b-${index}`}>
          <i style={{ width: level.depth }} />
          <b>{(Number(level.price) * 100).toFixed(1)}¢</b>
          <span>{Number(level.size).toFixed(1)}</span>
          <span>${(Number(level.price) * Number(level.size)).toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}
