"use client";

import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import Link from "next/link";
import AdminGuard from "../../lib/AdminGuard";

export default function AdminLayout({
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
    <AdminGuard>
      <div className="min-h-screen flex bg-gray-100">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col no-print">
          <div className="px-6 py-5 text-lg font-semibold border-b border-slate-800">
            ITC Secure Admin
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 text-sm">
            <Link
              href="/admin"
              className={`block px-4 py-2 rounded transition ${isActive("/admin")}`}
            >
              Dashboard
            </Link>
            <Link
              href="/admin/users"
              className={`block px-4 py-2 rounded transition ${isActive("/admin/users")}`}
            >
              Users
            </Link>
            <Link
              href="/admin/facility-managers"
              className={`block px-4 py-2 rounded transition ${isActive("/admin/facility-managers")}`}
            >
              Facility Managers
            </Link>
            <Link
              href="/admin/event"
              className={`block px-4 py-2 rounded transition ${isActive("/admin/event")}`}
            >
              Events
            </Link>
            <Link
              href="/admin/payments"
              className={`block px-4 py-2 rounded transition ${isActive("/admin/payments")}`}
            >
              Payments
            </Link>
            <Link
              href="/admin/report"
              className={`block px-4 py-2 rounded transition ${isActive("/admin/report")}`}
            >
              Event Report
            </Link>
            <Link
              href="/admin/certificates"
              className={`block px-4 py-2 rounded transition ${isActive("/admin/certificates")}`}
            >
              Certificates
            </Link>
            <Link
              href="/admin/profile"
              className={`block px-4 py-2 rounded transition ${isActive("/admin/profile")}`}
            >
              Profile
            </Link>
          </nav>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col">
          {/* Topbar */}
          <header className="h-16 bg-white border-b px-6 flex items-center justify-between no-print">
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
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Administrator</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 rounded text-white"
              >
                Logout
              </button>
            </div>
          </header>

          <main className="p-6 print:p-0 print:bg-white">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
