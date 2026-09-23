import { createFileRoute } from "@tanstack/react-router";
import { NewsFeed } from "@/components/news-feed";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/news")({
  component: NewsPage,
});

function NewsPage() {
  return (
    <SiteShell>
      <section id="news" className="scroll-mt-24">
        <NewsFeed />
      </section>
    </SiteShell>
  );
}
