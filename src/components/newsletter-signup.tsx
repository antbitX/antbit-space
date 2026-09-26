import { useState } from "react";
import { subscribeNewsletter } from "@/lib/newsletter";

type Status = "idle" | "sending" | "done" | "error";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setMessage("");
    try {
      const result = await subscribeNewsletter({ data: { email } });
      setStatus("done");
      setMessage(
        result.duplicate
          ? "You're already on the list — see you Saturday."
          : "You're in. First brief lands Saturday at 7am ET.",
      );
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Signup failed — please try again.");
    }
  }

  return (
    <section
      aria-label="The Weekly Desk newsletter"
      className="rounded-xl bg-surface/90 p-6 shadow-[var(--shadow-border)] sm:p-8"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-coin">Newsletter</p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-fg">
        The Weekly Desk
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        One email every Saturday at 7am ET. Bitcoin&apos;s week, the macro picture, and
        the one story worth your time — in under 4 minutes.
      </p>

      <ul className="mt-4 grid gap-2 text-sm text-fg sm:grid-cols-2">
        {[
          "BTC week in review: price, fees, hashrate",
          "Gold, silver & oil vs. bitcoin",
          "Top stories from the desk's feeds",
          "One deep read, hand-picked",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span aria-hidden className="font-bold text-up">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {status === "done" ? (
        <p className="mt-6 rounded-lg bg-up/10 px-4 py-3 text-sm font-medium text-up">
          {message}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 flex max-w-md gap-2">
          <label htmlFor="weekly-desk-email" className="sr-only">
            Email address
          </label>
          <input
            id="weekly-desk-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="shrink-0 rounded-lg bg-accent px-5 py-2.5 font-display text-sm font-bold text-white transition-opacity disabled:opacity-60"
          >
            {status === "sending" ? "Joining…" : "Subscribe"}
          </button>
        </form>
      )}

      {status === "error" ? (
        <p className="mt-3 text-sm text-down">{message}</p>
      ) : (
        <p className="mt-3 text-xs text-subtle">
          Free forever. Unsubscribe anytime. Your address is only used for the brief.
        </p>
      )}
    </section>
  );
}
