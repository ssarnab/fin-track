"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useIdentity } from "@/lib/AuthProvider";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/report", label: "Report" },
  { href: "/accounts", label: "Accounts" },
  { href: "/balances", label: "Balances" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { identity, signOut } = useIdentity();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="no-print sticky top-0 z-30 border-b border-border bg-surface/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
        <Link href="/" className="mr-2 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-primary text-primary-fg font-semibold">
            ৳
          </span>
          <span className="hidden text-lg font-semibold tracking-tight text-fg sm:block">FinTrack</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-surface-2 text-fg"
                  : "text-muted hover:text-fg"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <ThemeToggle />

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1 transition-colors hover:bg-surface-2"
          >
            {identity?.photo ? (
              <Image
                src={identity.photo}
                alt={identity.name}
                width={26}
                height={26}
                className="rounded-full"
              />
            ) : (
              <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-surface-2 text-xs">
                {identity?.name?.[0] ?? "?"}
              </span>
            )}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-xl">
                <div className="border-b border-border px-3 py-2">
                  <p className="truncate text-sm font-medium text-fg">{identity?.name}</p>
                  <p className="truncate text-xs text-muted">{identity?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                  className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-surface-2"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
