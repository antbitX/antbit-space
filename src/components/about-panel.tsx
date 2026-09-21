import { useEffect } from "react";
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
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Live from{" "}
              <a
                href="https://x.com/antbit"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                @antbit
              </a>
              . If posts don&apos;t render here, X is blocking the embed —{" "}
              <a
                href="https://x.com/antbit"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                read them on the profile
              </a>
              .
            </p>
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
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.charset = "utf-8";
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  return (
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
  );
}
