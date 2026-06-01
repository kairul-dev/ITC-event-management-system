"use client";

import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import AdminGuard from "../../lib/AdminGuard";
import RoleDashboardShell, { type RoleNavItem } from "../../lib/RoleDashboardShell";

const navItems: RoleNavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" />
    ),
  },
  {
    section: "System Records",
    href: "/admin/payments",
    label: "Card Payments",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m8-11a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm10 11v-1a4 4 0 0 0-3-3.87m-2-9.9a4 4 0 0 1 0 7.75" />
    ),
  },
  {
    section: "System",
    href: "/admin/users",
    label: "Users",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m8-11a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm6 2v6m3-3h-6" />
    ),
  },
  {
    href: "/admin/profile",
    label: "Settings",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />
    ),
  },
  {
    section: "Reports",
    href: "/admin/report",
    label: "Reports",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20V9m5 11V4m5 16v-7m5 7V7M3 20h18" />
    ),
  },
  {
    href: "/admin/program-calendar",
    label: "Program Calendar",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v4m8-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Zm3 8h3m3 0h3M8 17h3" />
    ),
  },
  {
    href: "/admin/feedback",
    label: "Feedback",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8M8 14h5m-8 7 4-4h8a4 4 0 0 0 4-4V7a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4h1v4Z" />
    ),
  },
  {
    section: "Account",
    href: "/admin/profile",
    label: "Profile",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />
    ),
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <AdminGuard>
      <RoleDashboardShell
        title="Admin Dashboard"
        roleLabel="Admin"
        navItems={navItems}
        onLogout={handleLogout}
      >
        {children}
      </RoleDashboardShell>
    </AdminGuard>
  );
}
