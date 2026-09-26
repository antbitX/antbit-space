import { LATEST_POSTS } from "@/data/latest-posts";
import { XIcon } from "@/components/x-icon";

export function LatestPosts() {
  return (
    <article className="rounded-xl bg-surface/90 p-6 shadow-[var(--shadow-border)] sm:p-8">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <XIcon className="size-4 text-muted" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-fg">
            Latest on X
          </h2>
        </div>
        <a
          href="https://x.com/antbit"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-accent hover:underline"
        >
          Follow →
        </a>
      </div>
      <div className="mt-4 space-y-3">
        {LATEST_POSTS.slice(0, 2).map((post) => (
          <a
            key={post.id}
            href={post.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-border bg-black/25 p-4 transition-colors duration-150 hover:border-accent/60"
          >
            <div className="flex items-center gap-2">
              <img
                src="/avatar.jpg"
                alt="antbit"
                className="size-7 rounded-full object-cover"
              />
              <p className="text-sm font-semibold text-fg">antbit</p>
              <p className="text-xs text-subtle">
                @antbit · {post.timeLabel}
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {post.text}
            </p>
            <p className="mt-2 text-xs font-medium text-accent">View on X →</p>
          </a>
        ))}
      </div>
    </article>
  );
}
