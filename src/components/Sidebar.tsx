"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, type ReactNode, type SVGProps } from "react";
import { useIdentity } from "@/lib/AuthProvider";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/routine", label: "Routine", icon: CheckSquareIcon },
  { href: "/dashboard", label: "Dashboard", icon: GridIcon },
  { href: "/report", label: "Report", icon: ChartIcon },
  { href: "/accounts", label: "Accounts", icon: LayersIcon },
  { href: "/balances", label: "Balances", icon: ScaleIcon },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-1">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-fg font-bold shadow-(--shadow)">
        ৳
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-fg">FinTrack</span>
    </Link>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-primary/15 text-primary"
                : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <item.icon
              className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                active ? "text-primary" : "text-muted group-hover:text-fg"
              }`}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu() {
  const { identity, signOut } = useIdentity();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2"
      >
        {identity?.photo ? (
          <Image src={identity.photo} alt={identity.name} width={28} height={28} className="rounded-full" />
        ) : (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-medium text-fg">
            {identity?.name?.[0] ?? "?"}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{identity?.name}</span>
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-20 mb-2 w-full min-w-56 rounded-xl border border-border bg-surface p-2 shadow-(--shadow-lg)">
            <div className="border-b border-border px-3 py-2">
              <p className="truncate text-sm font-medium text-fg">{identity?.name}</p>
              <p className="truncate text-xs text-muted">{identity?.email}</p>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/10"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <Brand />
        <ThemeToggle />
      </div>
      <NavLinks pathname={pathname} onNavigate={onNavigate} />
      <div className="mt-auto border-t border-border pt-3">
        <UserMenu />
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      {/* Solid bg, not blurred — a blurred sticky header repaints every
          scroll frame and is a real source of jank on mid-range phones. */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <Brand />
        <button
          onClick={() => setMobileOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface-2 text-fg"
          aria-label="Open menu"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border bg-surface shadow-(--shadow-lg)">
            <SidebarBody pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-bg-elev md:block">
        <SidebarBody pathname={pathname} />
      </aside>
    </>
  );
}

function iconProps(props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", ...props };
}
function HomeIcon(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <svg {...iconProps(props)}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}
function GridIcon(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <svg {...iconProps(props)}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function ChartIcon(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 20V10M12 20V4M20 20v-6" />
    </svg>
  );
}
function CheckSquareIcon(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <svg {...iconProps(props)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}
function LayersIcon(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <svg {...iconProps(props)}>
      <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" />
      <path d="m3.5 12 8.5 4.5 8.5-4.5" />
      <path d="m3.5 16.5 8.5 4.5 8.5-4.5" />
    </svg>
  );
}
function ScaleIcon(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 3v18M7 21h10" />
      <path d="M12 5 5 8l3.5 7a4 4 0 0 0 7 0L19 8Z" />
    </svg>
  );
}
function MenuIcon(props: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <svg {...iconProps(props)}>
      <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
    </svg>
  );
}
