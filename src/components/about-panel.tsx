import { Activity, Coins, Layers, ShieldCheck } from "lucide-react";
import { OnThisDay } from "@/components/on-this-day";
import { XIcon } from "@/components/x-icon";

const WATCHES = [
  {
    icon: Activity,
    title: "Price",
    blurb: "Live tape and chart",
    href: "#markets",
  },
  {
    icon: Coins,
    title: "Issuance",
    blurb: "Supply, halving, difficulty",
    href: "#network",
  },
  {
    icon: Layers,
    title: "Mempool",
    blurb: "Fee pressure, next block",
    href: "#mempool",
  },
  {
    icon: ShieldCheck,
    title: "Sovereignty",
    blurb: "Nodes, signers, self-custody",
    href: "#resources",
  },
];

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
              Bitcoin-only desk that watches price and issuance.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-border/60 pt-6">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
            This desk watches
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {WATCHES.map((item) => (
              <li key={item.title}>
                <a
                  href={item.href}
                  className="group flex items-start gap-3 rounded-lg p-2 transition-colors duration-150 hover:bg-tab"
                >
                  <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-tab text-accent transition-colors duration-150 group-hover:bg-accent group-hover:text-white">
                    <item.icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-fg">
                      {item.title}
                    </span>
                    <span className="block text-xs text-muted">
                      {item.blurb}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </article>

        <OnThisDay />
      </div>
    </section>
  );
}
