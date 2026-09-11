type Quote = { symbol: string; name: string; price: number; change: number };

function indexQuotes(csv: string): Quote[] {
  const rows = csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(','));
  const build = (column: number, symbol: string, name: string) => {
    const values = rows
      .map((row) => Number(row[column]))
      .filter((value) => Number.isFinite(value) && value > 0);
    const price = values.at(-1) || 0;
    const previous = values.at(-2) || price;
    return {
      symbol,
      name,
      price,
      change: previous ? ((price - previous) / previous) * 100 : 0,
    };
  };
  return [build(1, 'S&P', 'S&P 500'), build(2, 'NASDAQ', 'NASDAQ Composite')];
}

export async function GET() {
  const quotes: Quote[] = [];
  try {
    const [fredResult, bitcoinResult] = await Promise.allSettled([
      fetch(
        'https://fred.stlouisfed.org/graph/fredgraph.csv?id=SP500,NASDAQCOM',
        { headers: { accept: 'text/csv' } },
      ),
      fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
        { headers: { accept: 'application/json' } },
      ),
    ]);
    if (fredResult.status === 'fulfilled' && fredResult.value.ok)
      quotes.push(
        ...indexQuotes(await fredResult.value.text()).filter(
          (quote) => quote.price > 0,
        ),
      );
    if (bitcoinResult.status === 'fulfilled' && bitcoinResult.value.ok) {
      const bitcoin = (
        (await bitcoinResult.value.json()) as {
          bitcoin?: { usd?: number; usd_24h_change?: number };
        }
      ).bitcoin;
      if (bitcoin?.usd)
        quotes.push({
          symbol: 'BTC',
          name: 'Bitcoin',
          price: bitcoin.usd,
          change: Number(bitcoin.usd_24h_change || 0),
        });
    }
  } catch {
    /* Return any provider that succeeded. */
  }
  return Response.json(
    { quotes },
    {
      status: quotes.length ? 200 : 502,
      headers: { 'cache-control': 'public, max-age=45, s-maxage=60' },
    },
  );
}
