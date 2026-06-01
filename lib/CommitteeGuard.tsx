import RoleGuard from "./RoleGuard";

export default function CommitteeGuard({
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
