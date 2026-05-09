"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

export default function PresidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const isActive = (path: string) => {
    return pathname === path ? "bg-slate-800" : "hover:bg-slate-800";
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-6 py-5 text-lg font-semibold border-b border-slate-800">
          ITC Secure President
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 text-sm">
          <Link
            href="/president"
            className={`block px-4 py-2 rounded transition ${isActive("/president")}`}
          >
            Dashboard
          </Link>
          <Link
            href="/president/events"
            className={`block px-4 py-2 rounded transition ${isActive("/president/events")}`}
          >
            Approve Events
          </Link>
          <Link
            href="/president/certificates"
            className={`block px-4 py-2 rounded transition ${isActive("/president/certificates")}`}
          >
            Approve Certificates
          </Link>
          <Link
            href="/president/profile"
            className={`block px-4 py-2 rounded transition ${isActive("/president/profile")}`}
          >
            Profile
          </Link>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-16 bg-white border-b px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-200 rounded transition"
              title="Go back"
            >
              <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-medium text-gray-800">President Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">President</span>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 rounded text-white transition"
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
