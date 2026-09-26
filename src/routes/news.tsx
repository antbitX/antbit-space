import { createFileRoute } from "@tanstack/react-router";
import { NewsFeed } from "@/components/news-feed";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { SiteShell } from "@/components/site-shell";
import { StoresOfValue } from "@/components/stores-of-value";

export const Route = createFileRoute("/news")({
  component: NewsPage,
});

function NewsPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <SiteShell>
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-fg">
          News
        </h1>
        <p className="mt-1 text-sm text-muted">
          {today} · curated from the desk&apos;s feeds
        </p>
      </div>

      <StoresOfValue />

      <section id="headlines" className="scroll-mt-24">
        <NewsFeed />
      </section>

      <NewsletterSignup />
    </SiteShell>
  );
}
