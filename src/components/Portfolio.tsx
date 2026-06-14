import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { cx, money, percent, probability, shortAddress } from "../lib";
import type { Activity, OpenOrder, Position, TradingStatus } from "../types";
import { Icon } from "./Icon";

type PortfolioTab = "positions" | "activity" | "orders";

export function Portfolio({ tradingStatus }: { tradingStatus: TradingStatus | null }) {
  const [address, setAddress] = useState(() => localStorage.getItem("polyfast-address") || tradingStatus?.publicAddress || "");
  const [input, setInput] = useState(address);
  const [positions, setPositions] = useState<Position[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [orders, setOrders] = useState<OpenOrder[]>([]);
  const [tab, setTab] = useState<PortfolioTab>("positions");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totals = useMemo(() => positions.reduce(
    (result, position) => ({
      current: result.current + Number(position.currentValue || 0),
      invested: result.invested + Number(position.initialValue || 0),
      pnl: result.pnl + Number(position.cashPnl || 0),
    }),
    { current: 0, invested: 0, pnl: 0 },
  ), [positions]);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setError("");
    Promise.all([
      api.positions(address),
      api.activity(address),
      tradingStatus?.configured ? api.openOrders().catch(() => []) : Promise.resolve([]),
    ]).then(([nextPositions, nextActivity, nextOrders]) => {
      setPositions(nextPositions);
      setActivity(nextActivity);
      setOrders(nextOrders);
    }).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  }, [address, tradingStatus?.configured]);

  function applyAddress() {
    const value = input.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
      setError("请输入有效的 Polygon 钱包地址");
      return;
    }
    localStorage.setItem("polyfast-address", value);
    setAddress(value);
  }

  async function cancel(orderId: string) {
    try {
      await api.cancelOrder(orderId);
      setOrders((current) => current.filter((order) => (order.id || order.orderID) !== orderId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "撤单失败");
    }
  }

  return (
    <div className="portfolio-page">
      <section className="portfolio-hero">
        <div>
          <span className="eyebrow">公开链上资产</span>
          <h1>资产与交易记录</h1>
          <p>输入任意钱包地址即可查看其公开仓位；私钥不会被请求。</p>
        </div>
        <div className="address-input">
          <input value={input} onChange={(change) => setInput(change.target.value)} placeholder="0x 钱包地址" onKeyDown={(event) => event.key === "Enter" && applyAddress()} />
          <button type="button" onClick={applyAddress}>查看</button>
        </div>
      </section>

      {address ? (
        <>
          <section className="portfolio-summary">
            <div><span>仓位总值</span><strong>{money(totals.current, false)}</strong><small>{shortAddress(address)}</small></div>
            <div><span>投入成本</span><strong>{money(totals.invested, false)}</strong><small>{positions.length} 个仓位</small></div>
            <div><span>未实现盈亏</span><strong className={cx(totals.pnl >= 0 ? "positive" : "negative")}>{money(totals.pnl, false)}</strong><small>{totals.invested ? percent(totals.pnl / totals.invested, true) : "0%"}</small></div>
          </section>

          <div className="portfolio-tabs">
            <button type="button" className={cx(tab === "positions" && "active")} onClick={() => setTab("positions")}>当前仓位 <b>{positions.length}</b></button>
            <button type="button" className={cx(tab === "activity" && "active")} onClick={() => setTab("activity")}>最近活动</button>
            <button type="button" className={cx(tab === "orders" && "active")} onClick={() => setTab("orders")}>挂单 <b>{orders.length}</b></button>
          </div>

          {error && <div className="inline-error">{error}</div>}
          {loading ? <div className="table-loading">正在载入资产数据...</div> : (
            <section className="portfolio-table">
              {tab === "positions" && (
                positions.length ? positions.map((position) => (
                  <a href={`https://polymarket.com/event/${position.eventSlug}`} target="_blank" rel="noreferrer" className="position-row" key={position.asset}>
                    <img src={position.icon} alt="" />
                    <div className="position-title"><b>{position.title}</b><span>{position.outcome} · {Number(position.size).toFixed(1)} 份</span></div>
                    <div><span>均价</span><b>{probability(position.avgPrice)}</b></div>
                    <div><span>现价</span><b>{probability(position.curPrice)}</b></div>
                    <div><span>当前价值</span><b>{money(position.currentValue, false)}</b></div>
                    <div><span>盈亏</span><b className={cx(position.cashPnl >= 0 ? "positive" : "negative")}>{money(position.cashPnl, false)} · {percent(position.percentPnl / 100, true)}</b></div>
                    <Icon name="external" size={15} />
                  </a>
                )) : <Empty label="该地址没有当前仓位" />
              )}

              {tab === "activity" && (
                activity.length ? activity.map((item, index) => (
                  <a href={`https://polygonscan.com/tx/${item.transactionHash}`} target="_blank" rel="noreferrer" className="activity-row" key={`${item.transactionHash}-${index}`}>
                    <div className={cx("activity-badge", item.side === "SELL" && "sell")}>{item.type === "TRADE" ? item.side : item.type}</div>
                    <div><b>{item.title}</b><span>{item.outcome} · {new Date(item.timestamp * 1000).toLocaleString("zh-CN")}</span></div>
                    <div><b>{Number(item.size || 0).toFixed(1)} 份 @ {probability(item.price)}</b><span>{money(item.usdcSize, false)}</span></div>
                    <Icon name="external" size={15} />
                  </a>
                )) : <Empty label="该地址没有最近活动" />
              )}

              {tab === "orders" && (
                !tradingStatus?.configured ? <Empty label="本机未配置交易账户，无法读取挂单" /> : orders.length ? orders.map((order) => {
                  const id = order.id || order.orderID || "";
                  const remaining = Number(order.original_size || 0) - Number(order.size_matched || 0);
                  return (
                    <div className="order-row" key={id}>
                      <div className={cx("activity-badge", order.side === "SELL" && "sell")}>{order.side}</div>
                      <div><b>{order.outcome || shortAddress(order.asset_id)}</b><span>{shortAddress(order.market)}</span></div>
                      <div><b>{remaining.toFixed(1)} 份 @ {probability(Number(order.price || 0))}</b><span>未成交</span></div>
                      <button type="button" onClick={() => cancel(id)}>撤单</button>
                    </div>
                  );
                }) : <Empty label="当前没有挂单" />
              )}
            </section>
          )}
        </>
      ) : (
        <div className="empty-state portfolio-empty"><Icon name="wallet" size={30} /><h3>输入地址开始查看</h3><p>Data API 的仓位和活动数据均为公开数据。</p></div>
      )}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="table-empty">{label}</div>;
}
