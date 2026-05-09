"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
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

      if (error || !role) {
        router.replace("/login");
        return;
      }

      // ✅ HANDLE ALL ROLES
      if (role === "admin") {
        router.replace("/admin");
      } else if (role === "president") {
        router.replace("/president");
      } else {
        router.replace("/student");
      }
    };

    checkUser();
  }, [router]);

  return <p>Loading...</p>;
}
