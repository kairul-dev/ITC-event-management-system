"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function FacilityManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || data?.role !== "facility_manager") {
        router.push("/");
        return;
      }

      setIsAuthorized(true);
      setLoading(false);
    };

    checkRole();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/facility-manager" className="text-xl font-bold text-indigo-600">
              Facility Manager
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/facility-manager/facilities"
                className="text-gray-600 hover:text-indigo-600"
              >
                Facilities
              </Link>
              <Link
                href="/facility-manager/availability"
                className="text-gray-600 hover:text-indigo-600"
              >
                Availability
              </Link>
              <form
                action={async () => {
                  await supabase.auth.signOut();
                  router.push("/login");
                }}
              >
                <button
                  type="submit"
                  className="text-gray-600 hover:text-red-600"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
