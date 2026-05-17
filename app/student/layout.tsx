"use client";

import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import AuthGuard from "../../lib/AuthGuard";
import RoleDashboardShell, { type RoleNavItem } from "../../lib/RoleDashboardShell";

const navItems: RoleNavItem[] = [
  {
    href: "/student",
    label: "Dashboard",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" />,
  },
  {
    section: "Events",
    href: "/student/events",
    label: "Available Events",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v4m8-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z" />,
  },
  {
    href: "/student/registered-events",
    label: "My Registrations",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7 3v4m10-4v4M5 6h14v15H5V6Z" />,
  },
  {
    section: "Account",
    href: "/student/certificates",
    label: "My Certificates",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5 2a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />,
  },
  {
    href: "/student/profile",
    label: "Profile",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />,
  },
];

export default function StudentLayout({
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
    <AuthGuard requiredRole="student">
      <RoleDashboardShell
        title="Student Dashboard"
        roleLabel="Student"
        navItems={navItems}
        onLogout={handleLogout}
      >
        {children}
      </RoleDashboardShell>
    </AuthGuard>
  );
}
