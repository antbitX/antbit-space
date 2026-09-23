import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme";

/** Shared page shell: themed background, header, content column, footer. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <div className="relative min-h-screen text-fg">
        <div
          className="theme-banner theme-banner-photo pointer-events-none fixed inset-0 bg-cover bg-[position:72%_center] bg-no-repeat"
          aria-hidden="true"
        />
        <div
          className="theme-banner pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--color-bg)_92%,transparent)_0%,color-mix(in_oklab,var(--color-bg)_78%,transparent)_36%,color-mix(in_oklab,var(--color-bg)_38%,transparent)_100%)]"
          aria-hidden="true"
        />
        <div
          className="theme-banner pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-bg)_48%,transparent)_0%,transparent_26%,color-mix(in_oklab,var(--color-bg)_74%,transparent)_100%)]"
          aria-hidden="true"
        />

        <div className="relative">
          <SiteHeader />
          <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-8 sm:px-6 sm:py-12">
            {children}
          </main>
          <SiteFooter />
        </div>
      </div>
    </ThemeProvider>
  );
}
