import { createFileRoute } from "@tanstack/react-router";

// Proxy for the public mempool.space read endpoints. Some phones and
// privacy-focused browsers can't reach mempool.space directly (content
// blockers, network filtering), so the site fetches through its own origin.
// Only whitelisted read paths are forwarded; everything else 404s.

const UPSTREAM = "https://mempool.space/api";

function resolveUpstream(
  path: string,
  params: URLSearchParams,
): { url: string; cache: number } | null {
  if (path === "/blocks") return { url: `${UPSTREAM}/blocks`, cache: 60 };
  if (path === "/v1/fees/mempool-blocks")
    return { url: `${UPSTREAM}/v1/fees/mempool-blocks`, cache: 30 };
  if (path === "/mempool") return { url: `${UPSTREAM}/mempool`, cache: 30 };
  if (path === "/mempool/recent")
    return { url: `${UPSTREAM}/mempool/recent`, cache: 30 };
  const blockTxs = path.match(/^\/block\/([0-9a-fA-F]{64})\/txs$/);
  if (blockTxs) {
    const start = params.get("start_index");
    const qs = start && /^\d{1,6}$/.test(start) ? `?start_index=${start}` : "";
    // Block contents are immutable once mined — cache aggressively.
    return { url: `${UPSTREAM}/block/${blockTxs[1]}/txs${qs}`, cache: 86400 };
  }
  return null;
}

export const Route = createFileRoute("/api/mempool")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const target = resolveUpstream(url.searchParams.get("path") || "", url.searchParams);
        if (!target) {
          return Response.json({ ok: false, reason: "unknown endpoint" }, { status: 404 });
        }

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15_000);
        try {
          const res = await fetch(target.url, {
            signal: ctrl.signal,
            headers: {
              accept: "application/json",
              "user-agent": "antbit-desk/1.0 (+https://antbit-desk.vercel.app)",
            },
          });
          if (!res.ok) {
            return Response.json(
              { ok: false, reason: `upstream ${res.status}` },
              { status: 502 },
            );
          }
          const data = await res.json();
          return Response.json(data, {
            headers: {
              "cache-control": `public, s-maxage=${target.cache}, stale-while-revalidate=120`,
            },
          });
        } catch {
          return Response.json(
            { ok: false, reason: "upstream unreachable" },
            { status: 502 },
          );
        } finally {
          clearTimeout(timer);
        }
      },
    },
  },
});
