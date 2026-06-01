"use client";

import { supabase } from "@/lib/supabase";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import RoleDashboardShell, { type RoleNavItem } from "@/lib/RoleDashboardShell";
import ApprovalGuard from "@/lib/ApprovalGuard";

export default function LegacyApprovalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.startsWith("/club-advisor") ? "/club-advisor" : "/high-council";
  const isClubAdvisor = pathname.startsWith("/club-advisor");

  useEffect(() => {
    if (pathname.startsWith("/president")) {
      router.replace(pathname.replace(/^\/president/, "/high-council"));
    }
  }, [pathname, router]);

  const navItems = useMemo<RoleNavItem[]>(
    () => [
      {
        href: basePath,
        label: "Dashboard",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" />,
      },
      {
        section: "Approval",
        href: `${basePath}/events`,
        label: "Review Paperwork",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M9 13h6M9 17h6" />,
      },
      {
        href: `${basePath}/program-calendar`,
        label: "Program Calendar",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v4m8-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Zm3 8h3m3 0h3M8 17h3" />,
      },
      {
        href: `${basePath}/certificates`,
        label: "Approve Certificates",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8M9 17l-2 4m8-4 2 4M7 4h10v4a5 5 0 0 1-10 0V4Zm-3 2h3v2a3 3 0 0 1-3-3V6Zm13 0h3v2a3 3 0 0 0 3-3V6Z" />,
      },
      {
        section: "Account",
        href: `${basePath}/profile`,
        label: "Profile",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />,
      },
    ],
    [basePath],
  );

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <ApprovalGuard>
      <RoleDashboardShell
        title={isClubAdvisor ? "Club Advisor Dashboard" : "High Council Dashboard"}
        roleLabel={isClubAdvisor ? "Club Advisor" : "High Council"}
        navItems={navItems}
        onLogout={logout}
      >
        {children}
      </RoleDashboardShell>
    </ApprovalGuard>
  );
}
