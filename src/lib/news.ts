import { createServerFn } from "@tanstack/react-start";

export type Headline = {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string;
  publishedAt: number;
};

export type NewsSection = {
  category: string;
  blurb: string;
  headlines: Headline[];
};

const CATEGORY_FEEDS: { category: string; blurb: string; feeds: { source: string; url: string }[] }[] = [
  {
    category: "Bitcoin",
    blurb: "Bitcoin-only community desks. No CoinDesk. No ETF desks.",
    feeds: [
      { source: "Bitcoin Optech", url: "https://bitcoinops.org/feed.xml" },
      { source: "Stacker News", url: "https://stacker.news/~bitcoin/rss" },
      { source: "The Rage", url: "https://www.therage.co/rss/" },
      { source: "TFTC", url: "https://www.tftc.io/rss.xml" },
      { source: "The Bitcoin Manual", url: "https://thebitcoinmanual.com/feed/" },
      { source: "Jameson Lopp", url: "https://blog.lopp.net/rss/" },
      { source: "Delving Bitcoin", url: "https://delvingbitcoin.org/latest.rss" },
      { source: "Bitcoin Core", url: "https://bitcoincore.org/en/rss.xml" },
    ],
  },
  {
    category: "US Economics",
    blurb: "Policy and data from the Fed and the St. Louis Fed.",
    feeds: [
      { source: "Federal Reserve", url: "https://www.federalreserve.gov/feeds/press_all.xml" },
      { source: "FRED Blog", url: "https://fredblog.stlouisfed.org/feed/" },
    ],
  },
  {
    category: "Global Economics",
    blurb: "Central banks and development news beyond the US.",
    feeds: [
      { source: "Bank of England", url: "https://www.bankofengland.co.uk/rss/news" },
      { source: "UN News", url: "https://news.un.org/feed/subscribe/en/news/topic/economic-development/feed/rss.xml" },
    ],
  },
  {
    category: "AI related news",
    blurb: "Artificial intelligence, from lab to market.",
    feeds: [
      { source: "MIT Technology Review", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/" },
      { source: "The Decoder", url: "https://www.the-decoder.com/feed/" },
    ],
  },
];

const PER_CATEGORY = 8;
const CUTOFF_DAYS = 120;

function decode(value: string): string {
  let out = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  // Repeat until stable so double-encoded entities (e.g. &amp;apos;) fully decode.
  for (let pass = 0; pass < 3; pass++) {
    const next = out
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;|&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
      .replace(/&amp;/g, "&");
    if (next === out) break;
    out = next;
  }
  return out
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string {
  return decode(block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1] ?? "");
}

function attr(block: string, name: string, attrName: string): string {
  return (
    block.match(new RegExp(`<${name}[^>]+${attrName}="([^"]+)"`, "i"))?.[1] ??
    block.match(new RegExp(`<${name}[^>]+${attrName}='([^']+)'`, "i"))?.[1] ??
    ""
  );
}

function parseDate(value: string): number {
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

function parseFeed(xml: string, source: string): Headline[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  const headlines: Headline[] = [];
  for (const block of blocks.slice(0, 8)) {
    const title = tag(block, "title");
    const link =
      tag(block, "link") ||
      attr(block, "link", "href") ||
      tag(block, "id");
    const guid = tag(block, "guid") || tag(block, "id") || link;
    const summary = tag(block, "description") || tag(block, "summary") || tag(block, "content");
    const published =
      tag(block, "pubDate") ||
      tag(block, "published") ||
      tag(block, "updated") ||
      tag(block, "dc:date");
    if (!title || !link) continue;
    headlines.push({
      id: guid || `${source}:${title}`,
      title,
      url: link,
      source,
      summary: summary.slice(0, 220),
      publishedAt: parseDate(published) || Date.now(),
    });
  }
  return headlines;
}

async function fetchFeed(source: string, url: string): Promise<Headline[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent": "antbit-desk/1.0",
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) return [];
    return parseFeed(await res.text(), source);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function dedupeSort(headlines: Headline[]): Headline[] {
  const seen = new Set<string>();
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * CUTOFF_DAYS;
  return headlines
    .filter((item) => item.publishedAt >= cutoff)
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .filter((item) => {
      const key = item.title.toLowerCase();
      if (seen.has(item.id) || seen.has(key)) return false;
      seen.add(item.id);
      seen.add(key);
      return true;
    })
    .slice(0, PER_CATEGORY);
}

export const getNewsSections = createServerFn({ method: "GET" }).handler(
  async (): Promise<NewsSection[]> => {
    const sections = await Promise.all(
      CATEGORY_FEEDS.map(async ({ category, blurb, feeds }) => {
        const lists = await Promise.all(feeds.map((feed) => fetchFeed(feed.source, feed.url)));
        return { category, blurb, headlines: dedupeSort(lists.flat()) };
      }),
    );
    return sections;
  },
);
