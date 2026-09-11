type NewsItem = { title: string; link: string; publishedAt: string; source: string };

function decodeXml(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function tag(item: string, name: string) {
  return decodeXml(item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] || '');
}

function parseFeed(xml: string, fallbackSource: string): NewsItem[] {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0, 5).map((match) => {
    const item = match[1];
    return { title: tag(item, 'title'), link: tag(item, 'link'), publishedAt: tag(item, 'pubDate'), source: tag(item, 'source') || fallbackSource };
  }).filter((item) => item.title && item.link);
}

export async function GET() {
  const feeds = [
    { url: 'https://www.michiganpublic.org/index.rss', source: 'Michigan Public', scope: 'Michigan' },
    { url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml', source: 'BBC News', scope: 'United States' },
  ];
  for (const feed of feeds) {
    try {
      const response = await fetch(feed.url, { headers: { accept: 'application/rss+xml, application/xml, text/xml' } });
      if (!response.ok) continue;
      const items = parseFeed(await response.text(), feed.source);
      if (items.length) return Response.json({ items, scope: feed.scope }, { headers: { 'cache-control': 'public, max-age=300, s-maxage=900' } });
    } catch { /* Try the national fallback feed. */ }
  }
  return Response.json({ error: 'News is temporarily unavailable.' }, { status: 502 });
}
