"use client";

import RoleGuard from "@/lib/RoleGuard";

export default function AdminCertificatesOperationalRouteBlock({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["committee"]} loginRole="committee">
      {children}
    </RoleGuard>
  );
}
