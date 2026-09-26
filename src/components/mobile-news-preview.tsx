import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getNewsSections, type Headline } from "@/lib/news";

/** Mobile-only: top Bitcoin headlines on the homepage, linking to /news. */
export function MobileNewsPreview() {
  const [items, setItems] = useState<Headline[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getNewsSections()
      .then((sections) => {
        if (cancelled) return;
        const bitcoin = sections.find((s) => s.category === "Bitcoin");
        setItems(bitcoin?.headlines.slice(0, 4) ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="Latest headlines" className="space-y-4 md:hidden">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">News</p>
          <h2 className="mt-1 font-display text-2xl text-fg">Latest headlines</h2>
        </div>
        <a href="/news" className="shrink-0 text-sm font-medium text-accent">
          All news →
        </a>
      </div>

      <div className="overflow-hidden rounded-xl bg-surface/90 shadow-[var(--shadow-border)]">
        <img src="/news/bitcoin.webp" alt="" loading="lazy" className="h-24 w-full object-cover" />
        {!items ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-muted">No headlines right now.</p>
        ) : (
          <ul className="divide-y divide-border/80">
            {items.map((item) => (
              <li key={item.id}>
                <a href={item.url} target="_blank" rel="noreferrer" className="group flex items-center gap-3 p-4">
                  <img
                    src="/news/bitcoin.webp"
                    alt=""
                    loading="lazy"
                    className="size-12 shrink-0 rounded-lg object-cover"
                  />
                  <span className="block space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                      {item.source}
                    </p>
                    <p className="text-sm leading-snug text-fg transition-colors duration-150 group-hover:text-accent">
                      {item.title}
                    </p>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
