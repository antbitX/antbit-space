import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { getStoresOfValue, type StoreOfValue } from "@/lib/metals";
import { Skeleton } from "@/components/ui/skeleton";

function Spark({ data, up, id }: { data: number[]; up: boolean; id: string }) {
  const stroke = up ? "var(--color-up)" : "var(--color-down)";
  const points = data.map((price, i) => ({ i, price }));
  return (
    <div className="mt-2 h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="price"
            stroke={stroke}
            strokeWidth={1.75}
            fill={`url(#${id})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StoresOfValue() {
  const [rows, setRows] = useState<StoreOfValue[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStoresOfValue()
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="Stores of value" className="mt-2">
      <h2 className="font-display text-xl font-bold tracking-tight text-fg">
        Stores of value
      </h2>
      <p className="mt-1 text-sm text-muted">
        Gold, silver, platinum and crude, next to your bitcoin.
      </p>

      <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-4">
        {!rows
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="min-w-[230px] snap-start rounded-xl bg-surface/90 p-4 shadow-[var(--shadow-border)] md:min-w-0">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="mt-3 h-7 w-28" />
                <Skeleton className="mt-3 h-16 w-full" />
              </div>
            ))
          : rows.map((row) => {
              const up = row.changePct7d >= 0;
              const gid = `sov-${row.symbol}`;
              return (
                <div
                  key={row.symbol}
                  className="min-w-[230px] snap-start rounded-xl bg-surface/90 p-4 shadow-[var(--shadow-border)] md:min-w-0"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-sm font-bold text-fg">{row.name}</h3>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-subtle">
                      {row.unit}
                    </span>
                  </div>
                  <p className="mt-2 font-display text-2xl font-bold tracking-tight text-fg">
                    $
                    {row.price.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                      up ? "bg-up/10 text-up" : "bg-down/10 text-down"
                    }`}
                  >
                    {up ? "+" : ""}
                    {row.changePct7d.toFixed(1)}% · 7d
                  </span>
                  {row.spark.length > 1 ? (
                    <Spark data={row.spark} up={up} id={gid} />
                  ) : (
                    <p className="mt-2 text-xs text-subtle">Chart unavailable</p>
                  )}
                </div>
              );
            })}
      </div>
    </section>
  );
}
