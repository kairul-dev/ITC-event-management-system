"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";

export default function AuthGuard({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: "admin" | "student";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error("AuthGuard: No session", sessionError);
          setLoading(false);
          router.replace("/login");
          return;
        }

        if (requiredRole) {
          const { data: roleRows, error } = await supabase.rpc(
            "get_current_user_role"
          );

          const role =
            Array.isArray(roleRows) && roleRows.length > 0
              ? roleRows[0]?.role
              : null;

          if (error) {
            console.error("AuthGuard: Error fetching user role", error);
            setLoading(false);
            router.replace("/login");
            return;
          }

          if (!role || role !== requiredRole) {
            console.log("AuthGuard: Role mismatch", role, "required:", requiredRole);
            setLoading(false);
            router.replace("/");
            return;
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("AuthGuard error:", error);
        setLoading(false);
        router.replace("/login");
      }
    };

    checkUser();
  }, [router, requiredRole]);

  if (loading) return <p>Loading...</p>;

  return <>{children}</>;
}
