import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { getOnThisDay, type OnThisDay } from "@/lib/on-this-day";
import { Skeleton } from "@/components/ui/skeleton";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmtPrice(p: number) {
  return "$" + p.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtChange(pct: number) {
  if (!Number.isFinite(pct)) return "—";
  const sign = pct >= 0 ? "+" : "−";
  const abs = Math.abs(pct);
  if (abs >= 1000) return `${sign}${(abs / 100).toFixed(1)}× since`;
  return `${sign}${abs.toFixed(1)}% since`;
}

export function OnThisDay() {
  const [data, setData] = useState<OnThisDay | null | "error">(null);

  useEffect(() => {
    let cancelled = false;
    getOnThisDay()
      .then((next) => {
        if (!cancelled) setData(next ?? "error");
      })
      .catch(() => {
        if (!cancelled) setData("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <article className="rounded-xl bg-surface/90 p-6 shadow-[var(--shadow-border)] sm:p-8">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-muted" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-fg">
            On this day in Bitcoin
          </h2>
        </div>
        {data && data !== "error" && (
          <p className="text-xs font-medium text-subtle">
            {data.monthName} {data.day}
          </p>
        )}
      </div>

      {data === null ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : data === "error" ? (
        <p className="mt-4 text-sm text-subtle">History unavailable right now.</p>
      ) : (
        <>
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-subtle">
              BTC on {data.monthName} {data.day}
            </p>
            <ul className="mt-2 divide-y divide-border/60">
              {data.prices.map((row) => {
                const up = row.changePct >= 0;
                return (
                  <li key={row.year} className="flex items-baseline justify-between gap-2 py-2">
                    <span className="font-display text-sm font-bold text-fg">
                      {row.year}
                    </span>
                    <span className="text-sm tabular-nums text-muted">
                      {fmtPrice(row.price)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        up ? "bg-up/10 text-up" : "bg-down/10 text-down"
                      }`}
                    >
                      {fmtChange(row.changePct)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {data.event && (
            <div className="mt-4 rounded-lg border border-border bg-black/25 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-subtle">
                {data.event.exact
                  ? `${data.monthName} ${data.day}, ${data.event.year}`
                  : `Nearest in history · ${MONTHS[data.event.month - 1]} ${data.event.day}, ${data.event.year}`}
              </p>
              <p className="mt-1.5 text-sm font-semibold leading-snug text-fg">
                {data.event.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {data.event.detail}
              </p>
              {data.event.price != null && (
                <p className="mt-2.5 border-t border-border/60 pt-2 text-xs tabular-nums text-subtle">
                  BTC on {MONTHS[data.event.month - 1]} {data.event.day},{" "}
                  {data.event.year}:{" "}
                  <span className="font-semibold text-fg">
                    {fmtPrice(data.event.price)}
                  </span>
                </p>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}
