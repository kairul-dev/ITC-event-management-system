import RoleGuard from "./RoleGuard";

export default function ApprovalGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["high_council", "club_advisor"]} loginRole="high_council">
      {children}
    </RoleGuard>
  );
}
