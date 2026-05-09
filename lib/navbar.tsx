"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadRole = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const { data: profile, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (!error && profile) {
        setRole(profile.role ?? null);
      }
    };

    loadRole();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav style={{ padding: 16, background: "#222", color: "#fff" }}>
      <Link href="/">Home</Link>{" | "}

      {role === "admin" && (
        <>
          <Link href="/admin">Admin</Link>{" | "}
          <Link href="/admin/event">Manage Events</Link>{" | "}
          <Link href="/admin/users">Users</Link>{" | "}
        </>
      )}

      {role === "student" && (
        <>
          <Link href="/student">Dashboard</Link>{" | "}
        </>
      )}

      <button onClick={logout} style={{ marginLeft: 20 }}>
        Logout
      </button>
    </nav>
  );
}
