# Polyfast

一个轻量、快速的自用 Polymarket Web 客户端。直接读取 Polymarket 官方 API，默认无需登录即可浏览市场、盘口、价格走势和任意地址的公开仓位。

## 功能

- 活跃事件浏览、搜索、分类与排序
- 多市场事件、Yes/No 概率、成交量和流动性
- CLOB 实时盘口与历史价格走势
- 按钱包地址查看公开仓位和活动
- 使用官方 `@polymarket/clob-client-v2` SDK 的可选真实下单与撤单
- 本机服务端持有签名配置，浏览器不接触私钥

## 启动

需要 Node.js 22 或更新版本。

```bash
npm install
npm run dev
```

打开 <http://127.0.0.1:5173>。公开数据功能无需配置环境变量。

生产构建：

```bash
npm run build
npm start
```

## 可选：启用交易

先复制 `.env.example` 为 `.env`，再按你的 Polymarket 钱包类型填写：

```dotenv
POLYMARKET_PRIVATE_KEY=0x...
POLYMARKET_FUNDER_ADDRESS=0x...
POLYMARKET_SIGNATURE_TYPE=0
POLYGON_RPC_URL=https://polygon-rpc.com
```

签名类型必须与账户匹配：

- `0`: 独立 EOA
- `1`: Polymarket Proxy
- `2`: Gnosis Safe
- `3`: Deposit Wallet / POLY_1271

服务只监听 `127.0.0.1`。不要将包含交易配置的实例直接暴露到公网，也不要提交 `.env`。下单按钮采用两步确认，真实下单前请检查价格、数量和钱包余额。

## 部署安全

当前交易接口没有应用内登录，任何能够连接服务的人都能使用服务器上的交易账户。因此启用交易时，服务器必须由网络层确保只有你能访问。

推荐使用 SSH 隧道、私有 VPN 或可信反向代理，并保持服务只监听 `127.0.0.1:8787`。不要将 `8787` 暴露到公网，也不要仅依赖难猜的域名或 URL。

同时将 `.env` 权限设为 `600`，不要提交或记录私钥。建议使用独立、低余额交易钱包，避免服务器失陷影响主要资产。

通用 SSH 隧道示例：

```bash
ssh -N -L 8787:127.0.0.1:8787 user@your-server
```

隧道保持运行时，在本机打开 <http://127.0.0.1:8787>。

## 官方 API

- [API 概览](https://docs.polymarket.com/api-reference/introduction)
- [市场发现](https://docs.polymarket.com/market-data/fetching-markets)
- [CLOB 盘口与价格](https://docs.polymarket.com/trading/orderbook)
- [交易认证](https://docs.polymarket.com/trading/overview)

客户端使用三个官方域名：

- `gamma-api.polymarket.com`: 事件、市场、标签与搜索
- `data-api.polymarket.com`: 公开仓位与活动
- `clob.polymarket.com`: 盘口、历史价格与交易

## License

[MIT](./LICENSE)
