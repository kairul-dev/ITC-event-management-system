"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePathname, useRouter } from "next/navigation";

export default function HighCouncilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.replace("/login?role=high_council");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userData.user.id)
        .single();

      if (error || data?.role !== "high_council") {
        router.replace("/login?role=high_council");
        return;
      }

      setChecking(false);
    };

    checkAccess();
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const isActive = (path: string) => {
    return pathname === path ? "bg-slate-800" : "hover:bg-slate-800";
  };

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center bg-gray-100 text-sm text-gray-600">
        Checking high council access...
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="flex w-64 flex-col bg-slate-900 text-slate-100">
        <div className="border-b border-slate-800 px-6 py-5 text-lg font-semibold">
          ITC High Council
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6 text-sm">
          <Link href="/high-council" className={`block rounded px-4 py-2 transition ${isActive("/high-council")}`}>
            Dashboard
          </Link>
          <Link href="/high-council/events" className={`block rounded px-4 py-2 transition ${isActive("/high-council/events")}`}>
            Approve Events
          </Link>
          <Link href="/high-council/certificates" className={`block rounded px-4 py-2 transition ${isActive("/high-council/certificates")}`}>
            Approve Certificates
          </Link>
          <Link href="/high-council/profile" className={`block rounded px-4 py-2 transition ${isActive("/high-council/profile")}`}>
            Profile
          </Link>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded p-2 transition hover:bg-gray-200"
              title="Go back"
            >
              <svg className="h-5 w-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-medium text-gray-800">High Council Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">High Council</span>
            <button
              onClick={logout}
              className="rounded bg-red-600 px-4 py-2 text-sm text-white transition hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
