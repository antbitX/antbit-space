import { useEffect, useRef, useState } from "react";
import { NewsFeed } from "@/components/news-feed";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { XIcon } from "@/components/x-icon";

export function AboutPanel() {
  return (
    <section id="about" className="scroll-mt-24">
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <article className="rounded-xl bg-surface/90 p-6 shadow-[var(--shadow-border)] sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <img
                src="/avatar.jpg"
                alt="antbit astronaut"
                className="size-24 shrink-0 rounded-full object-cover outline outline-1 -outline-offset-1 outline-accent/50 sm:size-28"
              />
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-4xl font-medium tracking-tight text-fg sm:text-5xl">
                    antbit
                  </h1>
                  <a
                    href="https://x.com/antbit"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex size-11 items-center justify-center rounded-md bg-tab text-tab-fg transition-colors duration-150 hover:bg-accent"
                    aria-label="Open @antbit on X"
                  >
                    <XIcon className="size-4" />
                  </a>
                </div>
                <p className="text-lg text-muted">
                  <a
                    href="https://x.com/antbit"
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline"
                  >
                    @antbit
                  </a>
                  <span className="mx-2 text-subtle">·</span>
                  bitcoin only
                </p>
                <p className="max-w-xl text-sm leading-relaxed text-muted">
                  Bitcoin-only desk. Watching price and issuance.
                </p>
              </div>
            </div>
          </article>

          <div className="mt-6 rounded-xl bg-surface/90 p-6 shadow-[var(--shadow-border)] sm:p-8">
            <div className="flex items-center gap-2">
              <XIcon className="size-4 text-muted" />
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-fg">
                Recent on X
              </h2>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg">
              <XTimeline />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="news">
          <NewsFeed />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function XTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let interval: number | undefined;
    let timeout: number | undefined;

    const markFailed = () => {
      if (!cancelled) setFailed(true);
    };

    const hasRenderedFrame = () =>
      !!containerRef.current?.querySelector("iframe");

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.charset = "utf-8";
    script.onload = () => {
      try {
        const twttr = (
          window as unknown as {
            twttr?: { widgets?: { load: (el?: HTMLElement) => void } };
          }
        ).twttr;
        twttr?.widgets?.load(containerRef.current ?? undefined);
      } catch {
        /* widget init is best-effort; the render check below decides */
      }
      // Poll for the iframe X injects; if it never appears, show fallback.
      interval = window.setInterval(() => {
        if (hasRenderedFrame()) {
          if (interval !== undefined) window.clearInterval(interval);
          if (timeout !== undefined) window.clearTimeout(timeout);
        }
      }, 500);
      timeout = window.setTimeout(() => {
        if (interval !== undefined) window.clearInterval(interval);
        if (!hasRenderedFrame()) markFailed();
      }, 8000);
    };
    script.onerror = markFailed;
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      if (interval !== undefined) window.clearInterval(interval);
      if (timeout !== undefined) window.clearTimeout(timeout);
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  if (failed) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-black/25 p-5">
        <div className="flex items-center gap-2">
          <XIcon className="size-4 text-muted" />
          <p className="text-sm font-semibold text-fg">
            The X feed couldn&apos;t load
          </p>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          X is blocking the embedded timeline in this browser.
        </p>
        <a
          href="https://x.com/antbit"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-[#0c1116] transition-opacity duration-150 hover:opacity-85"
        >
          <XIcon className="size-4" />
          View @antbit on X
        </a>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <a
        className="twitter-timeline"
        data-dnt="true"
        data-theme="dark"
        data-chrome="noheader nofooter noborders transparent"
        data-tweet-limit="5"
        href="https://x.com/antbit?ref_src=twsrc%5Etfw"
      >
        Recent posts by @antbit on X
      </a>
    </div>
  );
}
