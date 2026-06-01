"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import CommitteeGuard from "@/lib/CommitteeGuard";
import RoleDashboardShell, { type RoleNavItem } from "@/lib/RoleDashboardShell";

const navItems: RoleNavItem[] = [
  {
    href: "/committee",
    label: "Dashboard",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" />,
  },
  {
    section: "Operations",
    href: "/committee/event?mode=paperwork",
    label: "Create Events",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v4m8-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z" />,
  },
  {
    href: "/committee/approval-status",
    label: "Approval Status",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5m4-1v5l3 2" />,
  },
  {
    href: "/committee/event?mode=events#event-details",
    label: "Event Details",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />,
  },
  {
    href: "/committee/program-calendar",
    label: "Program Calendar",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v4m8-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Zm3 8h3m3 0h3M8 17h3" />,
  },
  {
    href: "/committee/certificates",
    label: "Certificate Drafts",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8M9 17l-2 4m8-4 2 4M7 4h10v4a5 5 0 0 1-10 0V4Zm-3 2h3v2a3 3 0 0 1-3-3V6Zm13 0h3v2a3 3 0 0 0 3-3V6Z" />,
  },
  {
    href: "/committee/feedback",
    label: "Feedback",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8M8 14h5m-8 7 4-4h8a4 4 0 0 0 4-4V7a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4h1v4Z" />,
  },
  {
    section: "Account",
    href: "/committee/profile",
    label: "Profile",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />,
  },
];

export default function CommitteeLayout({
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
    <CommitteeGuard>
      <RoleDashboardShell
        title="Club Committee Dashboard"
        roleLabel="Club Committee"
        navItems={navItems}
        onLogout={handleLogout}
      >
        {children}
      </RoleDashboardShell>
    </CommitteeGuard>
  );
}
