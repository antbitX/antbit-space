import { AboutPanel } from "@/components/about-panel";
import { InstallPanel } from "@/components/install-panel";
import { MarketSection } from "@/components/market-section";
import { MobileNewsPreview } from "@/components/mobile-news-preview";
import { ResourceColumns } from "@/components/resource-columns";
import { SiteShell } from "@/components/site-shell";
import { StatGrid } from "@/components/stat-grid";
import { StoresOfValue } from "@/components/stores-of-value";
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
      {/*
        Mobile gets a reorganized, app-like flow: price hero first, stores of
        value as a swipe row, compact install, headline preview — then the
        rest. Desktop keeps the original DOM order (About → Markets →
        Stats → Install → Resources); `md:order-none` resets the mobile
        ordering above the md breakpoint.
      */}
      <div className="order-6 md:order-none">
        <AboutPanel />
      </div>
      <div className="order-1 md:order-none">
        <MarketSection snapshot={snapshot} />
        {error && !snapshot ? (
          <p className="mt-4 rounded-lg bg-surface px-4 py-3 text-sm text-down shadow-[var(--shadow-border)]">
            {error}
          </p>
        ) : null}
      </div>
      <div className="order-2 md:hidden">
        <StoresOfValue />
      </div>
      <div className="order-5 md:order-none">
        <StatGrid snapshot={snapshot} />
      </div>
      <div className="order-3 md:order-none">
        <InstallPanel />
      </div>
      <div className="order-4 md:hidden">
        <MobileNewsPreview />
      </div>
      <div className="order-7 md:order-none">
        <ResourceColumns />
      </div>
    </SiteShell>
  );
}
