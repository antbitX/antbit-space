import { createFileRoute } from "@tanstack/react-router";
import { getBitcoinSnapshot } from "@/lib/bitcoin";
import { getNewsSections, type NewsSection } from "@/lib/news";
import { getStoresOfValue, type StoreOfValue } from "@/lib/metals";

export const Route = createFileRoute("/api/weekly-brief")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Vercel Cron sends Authorization: Bearer <CRON_SECRET> when CRON_SECRET is set.
        const secret = process.env.CRON_SECRET;
        if (secret) {
          const url = new URL(request.url);
          const ok =
            request.headers.get("authorization") === `Bearer ${secret}` ||
            url.searchParams.get("secret") === secret;
          if (!ok) return new Response("unauthorized", { status: 401 });
        }

        const dryRun = new URL(request.url).searchParams.get("dry") === "1";

        const apiKey = process.env.BUTTONDOWN_API_KEY;
        if (!apiKey && !dryRun) {
          return Response.json(
            { ok: false, reason: "BUTTONDOWN_API_KEY is not set" },
            { status: 500 },
          );
        }

        const [sections, metals, btc] = await Promise.all([
          getNewsSections(),
          getStoresOfValue(),
          getBitcoinSnapshot().catch(() => null),
        ]);

        const { subject, html } = composeBrief(sections, metals, btc?.price ?? null);

        if (dryRun) {
          return new Response(html, {
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        }

        const res = await fetch("https://api.buttondown.com/v1/emails", {
          method: "POST",
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ subject, body: html, status: "about_to_send" }),
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          return Response.json(
            { ok: false, reason: `Buttondown ${res.status}: ${detail.slice(0, 200)}` },
            { status: 502 },
          );
        }

        return Response.json({ ok: true, subject });
      },
    },
  },
});

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtUsd(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function composeBrief(
  sections: NewsSection[],
  metals: StoreOfValue[],
  btcPrice: number | null,
): { subject: string; html: string } {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const topStories = sections
    .flatMap((s) => s.headlines.slice(0, 2).map((h) => ({ ...h, section: s.category })))
    .slice(0, 6);

  const deepRead =
    sections.find((s) => s.category === "Global Economics")?.headlines[0] ??
    topStories[0];

  const subjectBits = [
    btcPrice ? `BTC $${Math.round(btcPrice).toLocaleString("en-US")}` : null,
    metals[0] ? `gold $${fmtUsd(metals[0].price)}` : null,
  ].filter(Boolean);
  const subject = `The Weekly Desk — ${subjectBits.join(", ") || "the week in bitcoin and macro"}`;

  const storyRows = topStories
    .map(
      (s) => `
      <tr>
        <td style="padding:10px 0;border-top:1px solid #eee9da;">
          <a href="${esc(s.url)}" style="color:#1c1a15;font-weight:600;text-decoration:none;font-size:14px;">${esc(s.title)}</a>
          <div style="color:#8a8474;font-size:12px;margin-top:2px;">${esc(s.source)} · ${esc(s.section)}</div>
        </td>
      </tr>`,
    )
    .join("");

  const metalRows = [
    btcPrice
      ? `<tr><td style="padding:8px 4px;border-bottom:1px solid #f4f1ea;">Bitcoin</td><td style="padding:8px 4px;border-bottom:1px solid #f4f1ea;text-align:right;">$${Math.round(btcPrice).toLocaleString("en-US")}</td></tr>`
      : "",
    ...metals.map(
      (m) => `
      <tr>
        <td style="padding:8px 4px;border-bottom:1px solid #f4f1ea;">${esc(m.name)}</td>
        <td style="padding:8px 4px;border-bottom:1px solid #f4f1ea;text-align:right;">$${fmtUsd(m.price)}</td>
      </tr>`,
    ),
  ].join("");

  const html = `<!DOCTYPE html><html><body style="margin:0;background:#f4f1ea;font-family:-apple-system,'Segoe UI',sans-serif;color:#1c1a15;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#0b0b0c;color:#f3efe6;padding:26px 28px;">
      <div style="font-weight:800;font-size:15px;">antbit <span style="color:#c4a46a;">desk</span></div>
      <h1 style="font-size:24px;margin:12px 0 4px;">The Weekly Desk</h1>
      <p style="color:#a39c8b;font-size:13px;margin:0;">${esc(date)} · 4-minute read</p>
    </div>
    <div style="padding:24px 28px;">
      <p style="font-size:12px;font-weight:700;letter-spacing:1px;color:#9a7a3a;">TOP STORIES</p>
      <table style="width:100%;border-collapse:collapse;">${storyRows}</table>
      <p style="font-size:12px;font-weight:700;letter-spacing:1px;color:#9a7a3a;margin-top:24px;">STORES OF VALUE</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${metalRows}</table>
      ${
        deepRead
          ? `<p style="font-size:12px;font-weight:700;letter-spacing:1px;color:#9a7a3a;margin-top:24px;">DEEP READ</p>
      <div style="background:#f8f6f0;border:1px solid #e9e5d8;border-radius:12px;padding:16px;">
        <a href="${esc(deepRead.url)}" style="color:#1c1a15;font-weight:700;text-decoration:none;font-size:15px;">${esc(deepRead.title)}</a>
        <p style="font-size:13px;color:#4d493f;">${esc(deepRead.summary || "")}</p>
      </div>`
          : ""
      }
    </div>
    <div style="background:#f4f1ea;padding:16px 28px;font-size:12px;color:#8a8474;">
      You're reading The Weekly Desk, a Saturday brief from antbit desk.<br>
      <a href="https://antbit-desk.vercel.app/news" style="color:#0f6fdd;">antbit-desk.vercel.app/news</a>
    </div>
  </div></body></html>`;

  return { subject, html };
}
