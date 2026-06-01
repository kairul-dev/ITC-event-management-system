import RoleGuard from "./RoleGuard";

export default function AuthGuard({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: "admin" | "student" | "committee" | "high_council" | "club_advisor";
}) {
  return (
    <RoleGuard
      allowedRoles={requiredRole ? [requiredRole] : ["admin", "committee", "high_council", "club_advisor", "student"]}
      loginRole={requiredRole}
    >
      {children}
    </RoleGuard>
  );
}
