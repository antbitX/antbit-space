import { useLocation } from "@tanstack/react-router";
import { ChartLine, Globe, Home, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/#about", label: "Home", icon: Home },
  { href: "/#markets", label: "Markets", icon: ChartLine },
  { href: "/news", label: "News", icon: Globe },
  { href: "/#resources", label: "More", icon: LayoutGrid },
];

/** App-style bottom navigation, mobile only. Desktop keeps the header nav. */
export function MobileTabBar() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-bg/90 backdrop-blur-md md:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isNews = href === "/news";
          const active = isNews ? pathname === "/news" : pathname === "/" && label === "Home";
          return (
            <a
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-coin" : "text-muted",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
