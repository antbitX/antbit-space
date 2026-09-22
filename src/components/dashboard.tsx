import { AboutPanel } from "@/components/about-panel";
import { InstallPanel } from "@/components/install-panel";
import { MarketSection } from "@/components/market-section";
import { ResourceColumns } from "@/components/resource-columns";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatGrid } from "@/components/stat-grid";
import { ThemeProvider } from "@/components/theme";
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
    <ThemeProvider>
      <div className="relative min-h-screen text-fg">
        <div
          className="theme-banner pointer-events-none fixed inset-0 bg-[url('/banner.jpg')] bg-cover bg-[position:72%_center] bg-no-repeat"
          aria-hidden="true"
        />
        <div
          className="theme-banner pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--color-bg)_92%,transparent)_0%,color-mix(in_oklab,var(--color-bg)_78%,transparent)_36%,color-mix(in_oklab,var(--color-bg)_38%,transparent)_100%)]"
          aria-hidden="true"
        />
        <div
          className="theme-banner pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-bg)_48%,transparent)_0%,transparent_26%,color-mix(in_oklab,var(--color-bg)_74%,transparent)_100%)]"
          aria-hidden="true"
        />

        <div className="relative">
          <SiteHeader />
          <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-8 sm:px-6 sm:py-12">
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
          </main>
          <SiteFooter />
        </div>
      </div>
    </ThemeProvider>
  );
}
