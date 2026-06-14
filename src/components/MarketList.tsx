import { dateLabel, money, parseMarket, probability, tradeableMarkets } from "../lib";
import type { Event } from "../types";
import { Icon } from "./Icon";

function EventCard({ event, onOpen }: { event: Event; onOpen: (event: Event) => void }) {
  const markets = tradeableMarkets(event.markets).slice(0, 3).map(parseMarket);
  const leadingMarket = markets[0];
  const yesIndex = leadingMarket?.parsedOutcomes.findIndex((outcome) => outcome.toLowerCase() === "yes");
  const leadingPrice = leadingMarket?.parsedPrices[yesIndex >= 0 ? yesIndex : 0];

  return (
    <article className="event-card" onClick={() => onOpen(event)}>
      <div className="event-card__header">
        <img src={event.icon || event.image} alt="" loading="lazy" />
        <div>
          <h3>{event.title}</h3>
          <div className="event-card__meta">
            <span><Icon name="activity" size={14} /> {money(event.volume24hr)} 24h</span>
            <span><Icon name="clock" size={14} /> {dateLabel(event.endDate)}</span>
          </div>
        </div>
        {markets.length === 1 && <strong className="headline-price">{probability(leadingPrice)}</strong>}
      </div>

      <div className="event-card__markets">
        {markets.length === 0 ? (
          <div className="muted-row">当前没有可交易盘口</div>
        ) : (
          markets.map((market) => (
            <div className="mini-market" key={market.id}>
              <span>{market.groupItemTitle || market.question}</span>
              <div>
                {market.parsedOutcomes.slice(0, 2).map((outcome, index) => (
                  <button key={outcome} type="button" onClick={(click) => { click.stopPropagation(); onOpen(event); }}>
                    <small>{outcome}</small>
                    <b>{probability(market.parsedPrices[index])}</b>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <footer>
        <span>流动性 {money(event.liquidity)}</span>
        <span>总成交 {money(event.volume)}</span>
        <Icon name="chevron" size={16} />
      </footer>
    </article>
  );
}

export function MarketList({
  events,
  loading,
  onOpen,
  onLoadMore,
}: {
  events: Event[];
  loading: boolean;
  onOpen: (event: Event) => void;
  onLoadMore: () => void;
}) {
  if (loading && events.length === 0) {
    return <div className="card-grid">{Array.from({ length: 9 }, (_, index) => <div className="skeleton-card" key={index} />)}</div>;
  }

  if (events.length === 0) {
    return (
      <div className="empty-state">
        <Icon name="search" size={28} />
        <h3>没有找到市场</h3>
        <p>换一个关键词或分类试试。</p>
      </div>
    );
  }

  return (
    <>
      <div className="card-grid">
        {events.map((event) => <EventCard event={event} onOpen={onOpen} key={event.id} />)}
      </div>
      <button className="load-more" type="button" onClick={onLoadMore} disabled={loading}>
        {loading ? "载入中..." : "加载更多"}
      </button>
    </>
  );
}
