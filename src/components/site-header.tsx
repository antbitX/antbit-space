import { useLocation } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/theme";

const SECTION_NAV = [
  { href: "/#about", label: "About" },
  { href: "/#markets", label: "Markets" },
  { href: "/#network", label: "Network" },
  { href: "/#install", label: "Install" },
  { href: "/#resources", label: "Resources" },
];

const NEWS_NAV = { href: "/news", label: "News" };

function NavLink({
  href,
  label,
  active,
  className,
}: {
  href: string;
  label: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-11 items-center rounded-md px-3 text-sm transition-colors duration-150 hover:text-fg ${
        active ? "text-fg" : "text-muted"
      } ${className ?? ""}`}
    >
      {label}
    </a>
  );
}

export function SiteHeader() {
  const { pathname } = useLocation();
  const onNews = pathname === "/news";

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="/#about" className="shrink-0 font-display text-lg font-extrabold tracking-tight text-fg">
          antbit <span className="text-coin">desk</span>
        </a>

        <div className="flex items-center gap-1">
          <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
            <NavLink href={NEWS_NAV.href} label={NEWS_NAV.label} active={onNews} />
            {SECTION_NAV.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>

          <ThemeToggle />
        </div>
      </div>

      <nav
        className="overflow-x-auto border-t border-border/60 md:hidden"
        aria-label="Sections"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-4">
          <NavLink
            href={NEWS_NAV.href}
            label={NEWS_NAV.label}
            active={onNews}
            className="h-10 shrink-0 px-2"
          />
          {SECTION_NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              className="h-10 shrink-0 px-2"
            />
          ))}
        </div>
      </nav>
    </header>
  );
}
