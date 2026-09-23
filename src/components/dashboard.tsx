import { AboutPanel } from "@/components/about-panel";
import { InstallPanel } from "@/components/install-panel";
import { MarketSection } from "@/components/market-section";
import { ResourceColumns } from "@/components/resource-columns";
import { SiteShell } from "@/components/site-shell";
import { StatGrid } from "@/components/stat-grid";
import { getBitcoinSnapshot, type BitcoinSnapshot } from "@/lib/bitcoin";
import { useEffect, useState } from "react";

export function Dashboard({ initial }: { initial: BitcoinSnapshot | null }) {
  const [snapshot, setSnapshot] = useState<BitcoinSnapshot | null>(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      getBitcoinSnapshot()
        .then((next) => {
          if (cancelled) return;
          setSnapshot(next);
          setError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          if (!snapshot) {
            setError(err instanceof Error ? err.message : "Unable to load Bitcoin stats");
          }
        });
    };

    const id = window.setInterval(load, 30_000);
    if (!initial) load();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // snapshot intentionally omitted — only used as a stale-data guard
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    <SiteShell>
      <AboutPanel />
      {error && !snapshot ? (
        <p className="rounded-lg bg-surface px-4 py-3 text-sm text-down shadow-[var(--shadow-border)]">
          {error}
        </p>
      ) : null}
      <MarketSection snapshot={snapshot} />
      <StatGrid snapshot={snapshot} />
      <InstallPanel />
      <ResourceColumns />
    </SiteShell>
  );
}
