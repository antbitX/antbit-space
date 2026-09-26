import { LatestPosts } from "@/components/latest-posts";
import { XIcon } from "@/components/x-icon";

export function AboutPanel() {
  return (
    <section id="about" className="scroll-mt-24">
      <div className="grid gap-6 lg:grid-cols-2">
        <article className="flex flex-col justify-center rounded-xl bg-surface/90 p-6 shadow-[var(--shadow-border)] sm:p-8">
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

        <LatestPosts />
      </div>
    </section>
  );
}
