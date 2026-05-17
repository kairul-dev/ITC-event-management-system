"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type RoleNavItem = {
  href: string;
  label: string;
  section?: string;
  icon: React.ReactNode;
};

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

export default function RoleDashboardShell({
  title,
  roleLabel,
  navItems,
  children,
  onLogout,
}: {
  title: string;
  roleLabel: string;
  navItems: RoleNavItem[];
  children: React.ReactNode;
  onLogout: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentSearch, setCurrentSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentSearch(window.location.search);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  const isActive = (href: string) => {
    const [path, queryAndHash] = href.split("?");
    if (pathname !== path) return false;
    if (!queryAndHash) return true;

    const expectedParams = new URLSearchParams(queryAndHash.split("#")[0]);
    const currentParams = new URLSearchParams(currentSearch);
    for (const [key, value] of expectedParams.entries()) {
      if (currentParams.get(key) !== value) return false;
    }

    return true;
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 antialiased">
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-20 bg-slate-950/45 lg:hidden no-print"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-[#071b3a] text-white shadow-2xl transition-transform duration-200 lg:translate-x-0 no-print ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-6 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-amber-300/60 bg-gradient-to-br from-blue-700 to-slate-950 text-sm font-bold text-amber-300">
            ITC
          </div>
          <div className="leading-tight">
            <p className="text-lg font-extrabold tracking-tight">ITC EVENT</p>
            <p className="text-xs font-semibold uppercase text-slate-200">Management System</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-5 pt-3 text-sm">
          {navItems.map((item, index) => (
            <div key={`${item.href}-${item.label}`}>
              {item.section && (
                <p className={`${index === 1 ? "mt-2" : "mt-6"} mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-300`}>
                  {item.section}
                </p>
              )}
              <Link
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 font-semibold transition ${
                  isActive(item.href)
                    ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-950/30"
                    : "text-slate-100 hover:bg-white/10"
                }`}
              >
                <Icon>{item.icon}</Icon>
                <span>{item.label}</span>
              </Link>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-5">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
            title="Logout"
          >
            <Icon>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17l5-5-5-5M20 12H9m2 8H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6" />
            </Icon>
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 shadow-sm backdrop-blur no-print lg:px-7">
          <div className="flex items-center gap-5">
            <button
              onClick={() => setSidebarOpen((open) => !open)}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              aria-expanded={sidebarOpen}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              title="Go back"
              aria-label="Go back to previous page"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19 8 12l7-7" />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </button>
            <h1 className="text-lg font-bold text-slate-950">{title}</h1>
          </div>

          <div className="flex items-center gap-5">
            <button className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100" title="Notifications">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0" />
              </svg>
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">3</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-blue-100 text-sm font-extrabold text-slate-800">
                {roleLabel.charAt(0)}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-bold text-slate-950">{roleLabel}</p>
                <p className="text-xs font-medium text-slate-500">ITC Club</p>
              </div>
              <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 print:bg-white sm:px-6 lg:px-7">{children}</main>
      </div>
    </div>
  );
}
