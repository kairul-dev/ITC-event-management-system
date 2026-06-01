"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";

type RoleGuardProps = {
  children: React.ReactNode;
  allowedRoles: string[];
  loginRole?: string;
};

const dashboardByRole: Record<string, string> = {
  admin: "/admin",
  committee: "/committee",
  high_council: "/high-council",
  club_advisor: "/club-advisor",
  student: "/student",
};

export default function RoleGuard({
  children,
  allowedRoles,
  loginRole,
}: RoleGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const allowedRoleKey = allowedRoles.join("|");

  useEffect(() => {
    const allowed = allowedRoleKey.split("|").filter(Boolean);
    const checkAccess = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace(`/login${loginRole ? `?role=${loginRole}` : ""}`);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("role, status")
        .eq("id", session.user.id)
        .single();

      const role = typeof data?.role === "string" ? data.role.trim().toLowerCase() : "";
      const status = typeof data?.status === "string" ? data.status.trim().toLowerCase() : "active";

      if (error || !role || status === "locked") {
        await supabase.auth.signOut();
        router.replace(`/login${loginRole ? `?role=${loginRole}` : ""}`);
        return;
      }

      if (!allowed.includes(role)) {
        router.replace(dashboardByRole[role] || "/");
        return;
      }

      setLoading(false);
    };

    void checkAccess();
  }, [allowedRoleKey, loginRole, router]);

  if (loading) {
    return <p>Checking access...</p>;
  }

  return <>{children}</>;
}
