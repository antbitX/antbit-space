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

      <Card className="bg-surface/90 md:max-w-xl">
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
    </section>
  );
}
