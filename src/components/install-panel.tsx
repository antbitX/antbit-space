import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isIos, isStandalone, registerServiceWorker, type InstallPrompt } from "@/lib/pwa";

export function InstallPanel() {
  const [ios] = useState(isIos);
  const [standalone, setStandalone] = useState(isStandalone);
  const [installReady, setInstallReady] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const promptRef = useRef<InstallPrompt | null>(null);

  useEffect(() => {
    void registerServiceWorker();
    setStandalone(isStandalone());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as InstallPrompt;
      setInstallReady(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => {
      setInstallReady(false);
      setStandalone(true);
      setStatus("Added to your Home Screen.");
    });
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (promptRef.current) {
      await promptRef.current.prompt();
      const choice = await promptRef.current.userChoice;
      if (choice.outcome === "accepted") setInstallReady(false);
      return;
    }
    if (ios) {
      setStatus("Safari: tap Share, then Add to Home Screen.");
      return;
    }
    setStatus("Open this site in Chrome or Edge, then use the browser menu → Install app.");
  }

  return (
    <section id="install" className="scroll-mt-24 space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Phone</p>
        <h2 className="mt-1 font-display text-2xl text-fg">Add to Home Screen</h2>
        <p className="mt-1 text-sm text-muted">Install the desk as an app.</p>
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Card className="bg-surface/90">
          <CardHeader>
            <CardTitle>Home Screen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {standalone ? (
              <p className="text-sm text-up">Running as the installed app.</p>
            ) : ios ? (
              <ol className="list-decimal space-y-2 pl-4 text-sm text-muted">
                <li>Tap the Share icon in Safari (square with an arrow).</li>
                <li>
                  Scroll and tap <span className="text-fg">Add to Home Screen</span>.
                </li>
                <li>
                  Open <span className="text-fg">antbit</span> from the Home Screen.
                </li>
              </ol>
            ) : (
              <p className="text-sm text-muted">
                Android Chrome / Edge: use the install banner, or the browser menu → Install app.
              </p>
            )}
            {!standalone ? (
              <Button type="button" onClick={() => void install()}>
                {installReady ? "Install antbit" : ios ? "How to add" : "Add to Home Screen"}
              </Button>
            ) : null}
            {status ? <p className="text-sm text-accent">{status}</p> : null}
          </CardContent>
        </Card>

        {/* Option D — stylized render of the desk as an installed app (desktop only). */}
        <Card className="hidden bg-surface/90 lg:block" aria-hidden="true">
          <CardHeader>
            <CardTitle>See it installed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-5">
              <div className="w-32 shrink-0 rounded-[1.6rem] border border-border bg-black p-1.5 shadow-[var(--shadow-border)]">
                <div className="flex h-64 flex-col overflow-hidden rounded-[1.2rem] bg-bg">
                  <div className="flex items-center justify-between px-3 pt-2.5">
                    <p className="text-[10px] font-extrabold tracking-tight text-fg">
                      antbit <span className="text-coin">desk</span>
                    </p>
                  </div>
                  <div className="px-3 pt-2">
                    <p className="font-mono text-lg font-bold tabular-nums text-fg">$117,240</p>
                    <p className="font-mono text-[10px] tabular-nums text-up">+2.4% · 24h</p>
                  </div>
                  <svg viewBox="0 0 100 36" className="mx-2 mt-1 h-12 w-[calc(100%-1rem)]" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <linearGradient id="install-spark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-coin)" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="var(--color-coin)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,30 L10,27 L20,28 L30,22 L40,24 L50,18 L60,20 L70,14 L80,16 L90,10 L100,12 L100,36 L0,36 Z"
                      fill="url(#install-spark)"
                    />
                    <path
                      d="M0,30 L10,27 L20,28 L30,22 L40,24 L50,18 L60,20 L70,14 L80,16 L90,10 L100,12"
                      fill="none"
                      stroke="var(--color-coin)"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <div className="space-y-1.5 px-3 pt-1.5">
                    {[92, 70, 84].map((w) => (
                      <div key={w} className="h-2 rounded-full bg-surface" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                  <div className="mt-auto grid grid-cols-4 border-t border-border px-1 pb-2 pt-1.5">
                    {["Home", "Markets", "News", "More"].map((label) => (
                      <p key={label} className="text-center text-[8px] text-muted">
                        {label}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-fg">The desk in your pocket</p>
                <p className="text-sm leading-relaxed text-muted">
                  Full-screen app, no browser chrome — price, charts, and headlines from your Home
                  Screen.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
