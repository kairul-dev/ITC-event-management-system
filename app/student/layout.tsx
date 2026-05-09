"use client";

import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import Link from "next/link";
import AuthGuard from "../../lib/AuthGuard";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path ? "bg-slate-800" : "hover:bg-slate-800";
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <AuthGuard requiredRole="student">
      <div className="min-h-screen flex bg-gray-100">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col">
          <div className="px-6 py-5 text-lg font-semibold border-b border-slate-800">
            Student Portal
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 text-sm">
            <Link
              href="/student"
              className={`block px-4 py-2 rounded transition ${isActive("/student")}`}
            >
              Dashboard
            </Link>
            <div className="pt-4 pb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase px-4 mb-2">Events</p>
              <Link
                href="/student/events"
                className={`block px-4 py-2 rounded transition ${isActive("/student/events")}`}
              >
                Available Events
              </Link>
              <Link
                href="/student/registered-events"
                className={`block px-4 py-2 rounded transition ${isActive("/student/registered-events")}`}
              >
                My Events
              </Link>
            </div>
            <Link
              href="/student/certificates"
              className={`block px-4 py-2 rounded transition ${isActive("/student/certificates")}`}
            >
              My Certificates
            </Link>
            <Link
              href="/student/profile"
              className={`block px-4 py-2 rounded transition ${isActive("/student/profile")}`}
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
              <h1 className="text-lg font-medium text-gray-800">
                Student Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Student</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 rounded text-white"
              >
                Logout
              </button>
            </div>
          </header>

          <main className="p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
