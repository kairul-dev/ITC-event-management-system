"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useRouter } from "next/navigation";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error("AdminGuard: No session", sessionError);
          setLoading(false);
          router.replace("/login");
          return;
        }

        const { data: roleRows, error } = await supabase.rpc(
          "get_current_user_role"
        );

        const role =
          Array.isArray(roleRows) && roleRows.length > 0
            ? roleRows[0]?.role
            : null;

        if (error) {
          console.error("AdminGuard: Error fetching user role", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          setLoading(false);
          router.replace("/login");
          return;
        }

        if (!role || role !== "admin") {
          console.log("AdminGuard: User is not admin", role);
          setLoading(false);
          router.replace("/");
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("AdminGuard error:", error);
        setLoading(false);
        router.replace("/login");
      }
    };

    checkAdmin();
  }, [router]);

  if (loading) return <p>Checking admin access...</p>;

  return <>{children}</>;
}
