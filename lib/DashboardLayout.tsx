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
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 min-h-screen bg-white text-slate-950 flex flex-col border-r border-slate-200">
        <div className="px-6 py-5 text-2xl font-bold border-b border-slate-200 bg-white">
          {title}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 bg-white">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive(
                link.href
              )}`}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="px-4 py-4 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-lg">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-sm">
              <p className="font-semibold text-slate-950">
                {user?.email || "User"}
              </p>
              <p className="text-slate-500">{userRole}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
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

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-20 bg-white border-b px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Go back"
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-800">
              {pathname.split("/").pop()?.replace("-", " ")?.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
            </h1>
          </div>
        </header>

        <main className="p-8 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
