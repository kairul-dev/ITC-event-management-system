"use client";

import { supabase } from "@/lib/supabase";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import RoleDashboardShell, { type RoleNavItem } from "@/lib/RoleDashboardShell";

export default function PresidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.startsWith("/club-advisor") ? "/club-advisor" : "/president";
  const [checking, setChecking] = useState(true);

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
        section: "Account",
        href: `${basePath}/profile`,
        label: "Profile",
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />,
      },
    ],
    [basePath],
  );

  useEffect(() => {
    const checkAccess = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.replace("/login?role=club_advisor");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userData.user.id)
        .single();

      if (error || !["club_advisor", "president"].includes(data?.role || "")) {
        router.replace("/login?role=club_advisor");
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

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f8fc] text-sm text-slate-600">
        Checking club advisor access...
      </main>
    );
  }

  return (
    <RoleDashboardShell
      title="Club Advisor Dashboard"
      roleLabel="Club Advisor"
      navItems={navItems}
      onLogout={logout}
    >
      {children}
    </RoleDashboardShell>
  );
}
