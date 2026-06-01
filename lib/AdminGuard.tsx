import RoleGuard from "./RoleGuard";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["admin"]} loginRole="admin">
      {children}
    </RoleGuard>
  );
}
