import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { cx, dateLabel, money, parseMarket, probability, tradeableMarkets } from "../lib";
import type { Event, HistoryPoint, OrderBook, TradingStatus } from "../types";
import { Icon } from "./Icon";
import { OrderBookView } from "./OrderBookView";
import { PriceChart } from "./PriceChart";

type DetailTab = "chart" | "book" | "rules";

export function MarketDetail({
  initialEvent,
  tradingStatus,
  onClose,
}: {
  initialEvent: Event;
  tradingStatus: TradingStatus | null;
  onClose: () => void;
}) {
  const [event, setEvent] = useState(initialEvent);
  const markets = useMemo(() => tradeableMarkets(event.markets).map(parseMarket), [event]);
  const [marketId, setMarketId] = useState(markets[0]?.id || "");
  const market = markets.find((item) => item.id === marketId) || markets[0];
  const [outcomeIndex, setOutcomeIndex] = useState(0);
  const tokenId = market?.tokenIds[outcomeIndex];
  const [tab, setTab] = useState<DetailTab>("chart");
  const [interval, setInterval] = useState("1w");
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [book, setBook] = useState<OrderBook | null>(null);
  const [bookError, setBookError] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"GTC" | "FOK">("GTC");
  const [price, setPrice] = useState("");
  const [size, setSize] = useState("10");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    api.event(initialEvent.slug).then(setEvent).catch(() => undefined);
  }, [initialEvent.slug]);

  useEffect(() => {
    setMarketId(markets[0]?.id || "");
  }, [markets]);

  useEffect(() => {
    setOutcomeIndex(0);
  }, [marketId]);

  useEffect(() => {
    if (!tokenId) return;
    setBook(null);
    setBookError("");
    setPrice(String(market?.parsedPrices[outcomeIndex] || ""));
    api.book(tokenId).then((nextBook) => {
      setBook(nextBook);
      const best = side === "BUY" ? nextBook.asks[0]?.price : nextBook.bids[0]?.price;
      setPrice(best || String(market?.parsedPrices[outcomeIndex] || ""));
    }).catch((error: Error) => {
      setBookError(error.message);
      setMessage(error.message);
    });
  }, [market?.parsedPrices, outcomeIndex, side, tokenId]);

  useEffect(() => {
    if (!tokenId) return;
    setHistory([]);
    setHistoryError("");
    api.history(tokenId, interval).then((data) => setHistory(data.history || [])).catch((error: Error) => {
      setHistory([]);
      setHistoryError(error.message);
    });
  }, [interval, tokenId]);

  useEffect(() => {
    setConfirmed(false);
    setMessage("");
  }, [marketId, outcomeIndex, orderType, price, side, size]);

  async function submitOrder() {
    if (!market || !tokenId) return;
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const result = await api.placeOrder({
        tokenId,
        side,
        orderType,
        price: Number(price),
        size: Number(size),
      });
      setMessage(`订单已提交：${String(result.orderID || result.orderId || result.status || "成功")}`);
      setConfirmed(false);
      setBook(await api.book(tokenId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交订单失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (!market) {
    return (
      <div className="detail-page">
        <button className="icon-button detail-back" aria-label="返回市场列表" type="button" onClick={onClose}><Icon name="back" /></button>
        <div className="empty-state"><h3>该事件当前没有可交易市场</h3></div>
      </div>
    );
  }

  const estimated = Number(price || 0) * Number(size || 0);
  const outcome = market.parsedOutcomes[outcomeIndex] || "Outcome";

  return (
    <div className="detail-page">
      <div className="detail-topbar">
        <button className="icon-button" aria-label="返回市场列表" type="button" onClick={onClose}><Icon name="back" /></button>
        <div className="detail-title">
          <img src={event.icon || event.image} alt="" />
          <div><span>市场详情</span><h1>{event.title}</h1></div>
        </div>
        <a className="subtle-button" href={`https://polymarket.com/event/${event.slug}`} target="_blank" rel="noreferrer">
          官方页面 <Icon name="external" size={15} />
        </a>
      </div>

      <div className="detail-layout">
        <main className="detail-main">
          {markets.length > 1 && (
            <div className="market-switcher">
              {markets.map((item) => (
                <button className={cx(item.id === market.id && "active")} type="button" onClick={() => setMarketId(item.id)} key={item.id}>
                  <span>{item.groupItemTitle || item.question}</span>
                  <b>{probability(item.parsedPrices[0])}</b>
                </button>
              ))}
            </div>
          )}

          <section className="market-hero">
            <div>
              <span className="eyebrow">当前市场 · 截止 {dateLabel(market.endDate || event.endDate)}</span>
              <h2>{market.question}</h2>
              <div className="hero-stats">
                <span><small>24h 成交</small><b>{money(market.volume24hr)}</b></span>
                <span><small>总成交</small><b>{money(market.volume)}</b></span>
                <span><small>流动性</small><b>{money(market.liquidity)}</b></span>
                <span><small>点差</small><b>{((market.spread || 0) * 100).toFixed(1)}¢</b></span>
              </div>
            </div>
            <div className="outcome-prices">
              {market.parsedOutcomes.map((label, index) => (
                <button type="button" className={cx(outcomeIndex === index && "active")} onClick={() => setOutcomeIndex(index)} key={label}>
                  <span>{label}</span><strong>{probability(market.parsedPrices[index])}</strong>
                </button>
              ))}
            </div>
          </section>

          <div className="detail-tabs">
            <button type="button" className={cx(tab === "chart" && "active")} onClick={() => setTab("chart")}><Icon name="chart" size={16} /> 走势</button>
            <button type="button" className={cx(tab === "book" && "active")} onClick={() => setTab("book")}><Icon name="book" size={16} /> 盘口</button>
            <button type="button" className={cx(tab === "rules" && "active")} onClick={() => setTab("rules")}>规则</button>
          </div>

          <section className="data-panel">
            {tab === "chart" && (
              <>
                <div className="panel-heading">
                  <div><span>{outcome} 价格</span><strong>{probability(market.parsedPrices[outcomeIndex])}</strong></div>
                  <div className="interval-picker">
                    {["1h", "6h", "1d", "1w", "1m", "max"].map((value) => (
                      <button type="button" className={cx(interval === value && "active")} onClick={() => setInterval(value)} key={value}>{value}</button>
                    ))}
                  </div>
                </div>
                {historyError ? <div className="chart-empty">{historyError}</div> : <PriceChart points={history} />}
              </>
            )}
            {tab === "book" && (bookError ? <div className="chart-empty">{bookError}</div> : <OrderBookView book={book} />)}
            {tab === "rules" && (
              <div className="rules-copy">
                <h3>判定规则</h3>
                <p>{market.description || event.description || "暂无规则说明。"}</p>
              </div>
            )}
          </section>
        </main>

        <aside className="trade-ticket">
          <div className="ticket-head">
            <div><span>交易</span><b>{outcome}</b></div>
            <div className="side-toggle">
              <button type="button" className={cx(side === "BUY" && "active")} onClick={() => setSide("BUY")}>买入</button>
              <button type="button" className={cx(side === "SELL" && "active", side === "SELL" && "sell")} onClick={() => setSide("SELL")}>卖出</button>
            </div>
          </div>

          <label className="field">
            <span>订单类型</span>
            <select value={orderType} onChange={(change) => setOrderType(change.target.value as "GTC" | "FOK")}>
              <option value="GTC">限价单 · GTC</option>
              <option value="FOK">立即全部成交 · FOK</option>
            </select>
          </label>
          <label className="field">
            <span>价格</span>
            <div className="input-with-unit"><input type="number" min="0.001" max="0.999" step={market.orderPriceMinTickSize || 0.01} value={price} onChange={(change) => setPrice(change.target.value)} /><b>USDC</b></div>
          </label>
          <label className="field">
            <span>份数</span>
            <div className="input-with-unit"><input type="number" min={market.orderMinSize || 1} step="1" value={size} onChange={(change) => setSize(change.target.value)} /><b>份</b></div>
          </label>
          <div className="quick-sizes">
            {[10, 25, 50, 100].map((value) => <button type="button" onClick={() => setSize(String(value))} key={value}>{value}</button>)}
          </div>

          <div className="ticket-summary">
            {side === "BUY" ? (
              <>
                <span><small>预计花费</small><b>{money(estimated, false)}</b></span>
                <span><small>若结果成立，兑付</small><b>{money(Number(size || 0), false)}</b></span>
                <span><small>潜在收益</small><b className="positive">{money(Number(size || 0) - estimated, false)}</b></span>
              </>
            ) : (
              <>
                <span><small>预计收入</small><b>{money(estimated, false)}</b></span>
                <span><small>卖出份数</small><b>{Number(size || 0).toFixed(1)}</b></span>
                <span><small>每份价格</small><b>{money(Number(price || 0), false)}</b></span>
              </>
            )}
          </div>

          <button
            type="button"
            className={cx("trade-submit", side === "SELL" && "sell", confirmed && "confirm")}
            disabled={!tradingStatus?.configured || submitting || !Number(price) || !Number(size)}
            onClick={submitOrder}
          >
            {submitting ? "提交中..." : !tradingStatus?.configured ? "交易未配置" : confirmed ? `确认${side === "BUY" ? "买入" : "卖出"} ${outcome}` : `${side === "BUY" ? "买入" : "卖出"} ${outcome}`}
          </button>
          {!tradingStatus?.configured && <p className="ticket-note">公开数据可直接使用。真实下单需在本机 <code>.env</code> 配置签名账户。</p>}
          {message && <p className={cx("ticket-message", message.includes("已提交") && "success")}>{message}</p>}
        </aside>
      </div>
    </div>
  );
}
