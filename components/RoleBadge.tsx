import type { UserRole } from "@/lib/userProfile";

type RoleBadgeProps = {
  role?: UserRole;
};

export default function RoleBadge({ role }: RoleBadgeProps) {
  if (!role) {
    return null;
  }

  const isAdmin = role === "admin";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
        isAdmin
          ? "bg-amber-100 text-amber-800"
          : "bg-blue-100 text-blue-800"
      }`}
    >
      {role}
    </span>
  );
}