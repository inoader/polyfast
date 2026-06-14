import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { Icon } from "./components/Icon";
import { MarketDetail } from "./components/MarketDetail";
import { MarketList } from "./components/MarketList";
import { Portfolio } from "./components/Portfolio";
import { cx, tags } from "./lib";
import type { Event, TradingStatus } from "./types";

type Page = "markets" | "portfolio";

export default function App() {
  const [page, setPage] = useState<Page>("markets");
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [sort, setSort] = useState("trending");
  const [tagId, setTagId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [tradingStatus, setTradingStatus] = useState<TradingStatus | null>(null);
  const searchSequence = useRef(0);

  useEffect(() => {
    api.tradingStatus().then(setTradingStatus).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (search.trim().length >= 2) return;
    setLoading(true);
    setError("");
    setOffset(0);
    api.events(sort, tagId).then(setEvents).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  }, [search, sort, tagId, refreshNonce]);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) return;
    const sequence = ++searchSequence.current;
    const timer = window.setTimeout(() => {
      setLoading(true);
      api.search(query).then((result) => {
        if (sequence === searchSequence.current) setEvents(result.events || []);
      }).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  async function loadMore() {
    const nextOffset = offset + 36;
    setLoading(true);
    try {
      const next = await api.events(sort, tagId, nextOffset);
      setEvents((current) => [...current, ...next.filter((event) => !current.some((item) => item.id === event.id))]);
      setOffset(nextOffset);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  if (selectedEvent) {
    return <MarketDetail initialEvent={selectedEvent} tradingStatus={tradingStatus} onClose={() => setSelectedEvent(null)} />;
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" type="button" onClick={() => { setPage("markets"); setSelectedEvent(null); }}>
          <span className="brand-mark"><i /><i /><i /></span>
          <span><b>POLY</b>FAST</span>
        </button>

        <label className="global-search">
          <Icon name="search" size={17} />
          <input value={search} onChange={(change) => setSearch(change.target.value)} placeholder="搜索事件、市场或关键词..." />
          {search && <button type="button" aria-label="清空搜索" onClick={() => setSearch("")}><Icon name="close" size={15} /></button>}
        </label>

        <nav>
          <button type="button" className={cx(page === "markets" && "active")} onClick={() => setPage("markets")}><Icon name="markets" /> 市场</button>
          <button type="button" className={cx(page === "portfolio" && "active")} onClick={() => setPage("portfolio")}><Icon name="wallet" /> 资产</button>
        </nav>
        <div className={cx("connection-pill", tradingStatus?.configured && "configured")}>
          <i /> {tradingStatus?.configured ? "交易已配置" : "只读模式"}
        </div>
      </header>

      {page === "portfolio" ? <Portfolio tradingStatus={tradingStatus} /> : (
        <main className="markets-page">
          <section className="page-intro">
            <div>
              <span className="eyebrow">实时预测市场</span>
              <h1>更快地找到<br /><em>有价值的概率。</em></h1>
              <p>直接读取 Polymarket 官方 API，无信息流、无动画负担、无多余请求。</p>
            </div>
            <div className="intro-metric">
              <span>当前列表</span>
              <strong>{events.length}</strong>
              <small>个活跃事件</small>
            </div>
          </section>

          <section className="market-controls">
            <div className="tag-list">
              {tags.map((tag) => <button type="button" className={cx(tagId === tag.id && "active")} onClick={() => setTagId(tag.id)} key={tag.label}>{tag.label}</button>)}
            </div>
            <div className="sort-controls">
              <select value={sort} onChange={(change) => setSort(change.target.value)}>
                <option value="trending">24h 热度</option>
                <option value="volume">总成交量</option>
                <option value="liquidity">流动性</option>
                <option value="ending">即将结束</option>
                <option value="newest">最新创建</option>
              </select>
              <button className="icon-button" type="button" title="刷新" onClick={() => { setEvents([]); setRefreshNonce((value) => value + 1); }}><Icon name="refresh" size={17} /></button>
            </div>
          </section>

          {error && <div className="inline-error">{error}</div>}
          <MarketList events={events} loading={loading} onOpen={setSelectedEvent} onLoadMore={loadMore} />
        </main>
      )}
    </div>
  );
}
