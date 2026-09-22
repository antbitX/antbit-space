import { ArrowUpRight, Cpu, FileText, LayoutDashboard, Wallet, Waves } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const RESOURCES = [
  {
    title: "Hardware wallet",
    name: "SeedSigner",
    blurb: "Air-gapped, DIY signing device. The hardware of choice.",
    href: "https://seedsigner.com/",
    icon: Cpu,
  },
  {
    title: "Desktop wallet",
    name: "Sparrow",
    blurb: "Full-control desktop wallet for coins you actually own.",
    href: "https://www.sparrowwallet.com/",
    icon: Wallet,
  },
  {
    title: "Statistics",
    name: "Clark Moody",
    blurb: "The Bitcoin dashboard this desk reads for network truth.",
    href: "https://bitcoin.clarkmoody.com/dashboard/",
    icon: LayoutDashboard,
  },
  {
    title: "Mempool",
    name: "mempool.space",
    blurb: "Live mempool, blocks, and fee estimates.",
    href: "https://mempool.space/",
    icon: Waves,
  },
  {
    title: "Foundations",
    name: "Bitcoin Whitepaper",
    blurb: "Satoshi's 2008 paper. Nine pages that started everything.",
    href: "https://bitcoin.org/bitcoin.pdf",
    icon: FileText,
  },
];

export function ResourceColumns() {
  return (
    <section id="resources" className="scroll-mt-24 space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Resources</p>
        <h2 className="mt-1 font-display text-2xl text-fg">Information columns</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {RESOURCES.map((item) => (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="group block"
          >
            <Card className="h-full bg-surface/90 transition-[box-shadow] duration-150 group-hover:shadow-[var(--shadow-border-hover)]">
              <CardContent className="flex h-full flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-lg bg-tab text-tab-fg">
                    <item.icon className="size-5" />
                  </span>
                  <ArrowUpRight className="size-4 text-muted transition-colors group-hover:text-accent" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                    {item.title}
                  </p>
                  <p className="mt-1 font-display text-xl text-fg">{item.name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.blurb}</p>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}
