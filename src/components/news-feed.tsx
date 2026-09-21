import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getNewsSections, type NewsSection } from "@/lib/news";

export function NewsFeed() {
  const [sections, setSections] = useState<NewsSection[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getNewsSections()
      .then((next) => {
        if (!cancelled) setSections(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load headlines");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <article className="rounded-xl bg-surface/90 p-6 shadow-[var(--shadow-border)] sm:p-8">
      <p className="text-sm text-muted">
        Four desks, side by side — Bitcoin, US economics, global economics, and AI.
      </p>

      {error ? <p className="mt-4 text-sm text-down">{error}</p> : null}

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
        <div className="mt-6 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => (
            <section key={section.category} aria-label={section.category}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-fg">
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
                        className="group block space-y-1"
                      >
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
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      ) : null}
    </article>
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
