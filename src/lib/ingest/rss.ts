/** Minimal RSS 2.0 parser — no external deps, just enough for security-news feeds. */

export interface RssItem {
  title: string;
  link: string;
  pubDate: string | null;
  description: string | null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/<[^>]+>/g, "") // strip any residual inline markup (e.g. in descriptions)
    .trim();
}

function tag(block: string, name: string): string | null {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
  const m = block.match(re);
  return m ? decodeEntities(m[1]) : null;
}

export function parseRss(xml: string, limit = 40): RssItem[] {
  const items: RssItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks.slice(0, limit)) {
    const title = tag(block, "title");
    const link = tag(block, "link") ?? tag(block, "guid");
    if (!title || !link) continue;
    items.push({
      title,
      link,
      pubDate: tag(block, "pubDate") ?? tag(block, "dc:date"),
      description: tag(block, "description"),
    });
  }
  return items;
}
