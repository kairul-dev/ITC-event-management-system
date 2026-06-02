"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadRole = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const { data: profile, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (!error && profile) {
        setRole(profile.role ?? null);
      }
    };

    loadRole();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 text-slate-900 shadow-sm backdrop-blur no-print">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 text-sm font-black text-slate-950">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-700 text-white">ITC</span>
          <span>Secure Document Verification</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <Link href="/" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700">Home</Link>

          {role === "admin" && (
            <>
              <Link href="/admin" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700">Admin</Link>
              <Link href="/admin/event" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700">Manage Events</Link>
              <Link href="/admin/users" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700">Users</Link>
            </>
          )}

          {role === "student" && (
            <Link href="/student" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700">Dashboard</Link>
          )}

          {role && (
            <button onClick={logout} className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-blue-700">
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
