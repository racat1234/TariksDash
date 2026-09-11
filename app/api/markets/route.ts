import { env } from 'cloudflare:workers';

type Quote = { symbol: string; name: string; price: number; change: number };

async function finnhubQuote(key: string, symbol: string, name: string): Promise<Quote> {
  const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${encodeURIComponent(key)}`);
  if (!response.ok) throw new Error('Finnhub unavailable');
  const data = (await response.json()) as { c?: number; dp?: number };
  if (!data.c) throw new Error('Finnhub returned no quote');
  return { symbol, name, price: data.c, change: Number(data.dp || 0) };
}

async function stooqQuote(symbol: string, display: string, name: string): Promise<Quote> {
  const response = await fetch(`https://stooq.com/q/l/?s=${symbol.toLowerCase()}.us&f=sd2t2ohlcv&h&e=csv`);
  if (!response.ok) throw new Error('Stooq unavailable');
  const rows = (await response.text()).trim().split(/\r?\n/);
  const values = rows[1]?.split(',') || [];
  const open = Number(values[3]);
  const close = Number(values[6]);
  if (!close) throw new Error('Stooq returned no quote');
  return { symbol: display, name, price: close, change: open ? ((close - open) / open) * 100 : 0 };
}

async function bitcoinQuote(): Promise<Quote> {
  const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
  if (!response.ok) throw new Error('CoinGecko unavailable');
  const bitcoin = ((await response.json()) as { bitcoin?: { usd?: number; usd_24h_change?: number } }).bitcoin;
  if (!bitcoin?.usd) throw new Error('CoinGecko returned no quote');
  return { symbol: 'BTC', name: 'Bitcoin', price: bitcoin.usd, change: Number(bitcoin.usd_24h_change || 0) };
}

export async function GET() {
  const key = String((env as unknown as { FINNHUB_API_KEY?: string }).FINNHUB_API_KEY || '');
  const stockRequests = key
    ? [finnhubQuote(key, 'SPY', 'S&P 500 ETF'), finnhubQuote(key, 'QQQ', 'NASDAQ 100 ETF')]
    : [stooqQuote('spy', 'SPY', 'S&P 500 ETF'), stooqQuote('qqq', 'QQQ', 'NASDAQ 100 ETF')];
  const results = await Promise.allSettled([...stockRequests, bitcoinQuote()]);
  const quotes = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  return Response.json(
    { quotes, provider: key ? 'Finnhub + CoinGecko' : 'Stooq + CoinGecko', delayed: !key },
    { status: quotes.length ? 200 : 503, headers: { 'cache-control': 'public, max-age=45, s-maxage=60' } },
  );
}
