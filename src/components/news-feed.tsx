import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getNewsSections, type NewsSection } from "@/lib/news";

const SECTION_ART: Record<string, string> = {
  Bitcoin: "/news/bitcoin.webp",
  "US Economics": "/news/us-economics.webp",
  "Global Economics": "/news/global-economics.webp",
  "AI related news": "/news/ai.webp",
};

const SHORT_LABELS: Record<string, string> = {
  Bitcoin: "Bitcoin",
  "US Economics": "US Econ",
  "Global Economics": "Global",
  "AI related news": "AI",
};

// Headlines refresh on this cadence while the page is visible.
const REFRESH_MS = 5 * 60 * 1000;

export function NewsFeed() {
  const [sections, setSections] = useState<NewsSection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  // Ticks every minute so the "Updated … ago" label stays honest.
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      if (document.hidden) return;
      getNewsSections()
        .then((next) => {
          if (cancelled) return;
          setSections(next);
          setUpdatedAt(Date.now());
          setError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          // Keep showing the last good batch on refresh failures.
          if (!sections) {
            setError(err instanceof Error ? err.message : "Unable to load headlines");
          }
        });
    };

    load();
    const timer = window.setInterval(load, REFRESH_MS);
    const onVisible = () => load();
    document.addEventListener("visibilitychange", onVisible);
    const ticker = window.setInterval(() => setTick((t) => t + 1), 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.clearInterval(ticker);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // `sections` intentionally read-only as a stale-data guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSection = sections?.[Math.min(active, sections.length - 1)];

  return (
    <article className="rounded-xl bg-surface/90 p-6 shadow-[var(--shadow-border)] sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted">
          Four desks, side by side — Bitcoin, US economics, global economics, and AI.
        </p>
        {updatedAt ? (
          <p className="text-xs text-subtle">
            Updated {formatRelative(updatedAt)} · refreshes automatically
          </p>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-down">{error}</p> : null}

      {sections && sections.length > 1 ? (
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 md:hidden" role="tablist" aria-label="News desks">
          {sections.map((section, i) => (
            <button
              key={section.category}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                i === active
                  ? "border-coin bg-coin text-black"
                  : "border-border text-muted",
              )}
            >
              {SHORT_LABELS[section.category] ?? section.category}
            </button>
          ))}
        </div>
      ) : null}

      {!sections && !error ? (
        <div className="mt-6 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, c) => (
            <div key={c} className="space-y-4">
              <Skeleton className="h-4 w-28" />
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2 h-4 w-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {sections ? (
        <>
          {/* Mobile: one desk at a time, switched by the tabs above. */}
          <div className="mt-6 md:hidden">
            {activeSection ? renderSection(activeSection) : null}
          </div>
          {/* Desktop: the classic four-column wall. */}
          <div className="mt-6 hidden gap-8 md:grid md:grid-cols-2 xl:grid-cols-4">
            {sections.map((section) => (
              <div key={section.category}>{renderSection(section)}</div>
            ))}
          </div>
        </>
      ) : null}
    </article>
  );
}

function renderSection(section: NewsSection) {
  return (
    <section aria-label={section.category}>
      {SECTION_ART[section.category] ? (
        <img
          src={SECTION_ART[section.category]}
          alt=""
          loading="lazy"
          className="h-28 w-full rounded-lg object-cover"
        />
      ) : null}
      <h3 className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-fg">
        {section.category}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted">{section.blurb}</p>

      {section.headlines.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No recent headlines in this desk.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border/80">
          {section.headlines.map((item) => (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3"
              >
                {SECTION_ART[section.category] ? (
                  <img
                    src={SECTION_ART[section.category]}
                    alt=""
                    loading="lazy"
                    className="size-14 shrink-0 rounded-lg object-cover"
                  />
                ) : null}
                <span className="block space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                    {item.source}
                    <span className="mx-1.5 text-subtle">·</span>
                    <time dateTime={new Date(item.publishedAt).toISOString()}>
                      {formatRelative(item.publishedAt)}
                    </time>
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
    </section>
  );
}

function formatRelative(ts: number): string {
  const delta = Date.now() - ts;
  const minutes = Math.round(delta / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(ts));
}
