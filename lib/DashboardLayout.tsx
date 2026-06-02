"use client";

import { supabase } from "./supabase";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";

interface NavLink {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

interface DashboardLayoutProps {
  title: string;
  navLinks: NavLink[];
  userRole: string;
  children: React.ReactNode;
}

export default function DashboardLayout({
  title,
  navLinks,
  userRole,
  children,
}: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
  }, []);

  const isActive = (path: string) => {
    return pathname === path
      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
      : "text-slate-700 hover:bg-slate-100 hover:text-blue-700";
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-950 antialiased">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.08),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#f8fafc_42%,_#eef2ff_100%)]" />

      <aside className="fixed inset-y-0 left-0 z-30 flex h-[100dvh] w-64 flex-col border-r border-slate-800/80 bg-slate-950 text-slate-50 shadow-none">
        <div className="shrink-0 border-b border-white/10 px-5 py-4">
          <p className="text-xl font-black tracking-tight text-white">{title}</p>
          <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Dashboard Workspace</p>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition ${
                isActive(link.href)
                  ? "bg-white/10 text-white ring-1 ring-white/10"
                  : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto shrink-0 border-t border-white/10 px-3 py-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-white ring-1 ring-white/10">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-semibold text-white">{user?.email || "User"}</p>
              <p className="truncate text-slate-400">{userRole}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-200"
              title="Logout"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-5 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={handleBack}
              className="rounded-xl border border-slate-200 bg-white/90 p-2 text-slate-600 shadow-sm transition hover:bg-white"
              title="Go back"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black tracking-tight text-slate-950">
                {pathname.split("/").pop()?.replace("-", " ")?.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
              </h1>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{userRole}</p>
            </div>
          </div>
        </header>

        <main className="p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
