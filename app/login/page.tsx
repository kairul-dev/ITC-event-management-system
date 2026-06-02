"use client";

import { Suspense, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type AccessRole = "student" | "committee" | "high_council" | "club_advisor" | "admin";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const nextPath = searchParams.get("next");
  const safeNextPath =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : null;
  const roleParam = searchParams.get("role");
  const lockedRole: AccessRole | null =
    roleParam === "admin" ||
        roleParam === "committee" ||
        roleParam === "high_council" ||
        roleParam === "club_advisor" ||
        roleParam === "student"
      ? roleParam
      : null;
  const [selectedRole, setSelectedRole] = useState<AccessRole>("student");
  const accessRole = lockedRole || selectedRole;
  const [matrixNumber, setMatrixNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const usesMatrixLogin = true;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let loginEmail: string | null = null;

    if (usesMatrixLogin) {
      const response = await fetch("/api/auth/matrix-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matrixNumber: matrixNumber.trim(),
          role: accessRole,
        }),
      });

      const result = (await response.json()) as {
        email?: string;
        error?: string;
      };

      if (!response.ok || !result.email) {
        alert(result.error || "Matrix number not found for this login role.");
        setLoading(false);
        return;
      }

      loginEmail = result.email;
    }

    if (!loginEmail) {
      alert("Login account not found.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("User data not found. Please contact administrator.");
      setLoading(false);
      return;
    }

    const { data: profile, error: userError } = await supabase
      .from("users")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (userError) {
      alert("Error fetching user data: " + userError.message);
      setLoading(false);
      return;
    }

    const role = profile?.role?.trim().toLowerCase();
    const status = profile?.status?.trim().toLowerCase() || "active";

    if (!role) {
      alert("User data not found. Please contact administrator.");
      setLoading(false);
      return;
    }

    if (status === "locked") {
      await supabase.auth.signOut();
      alert("This account is locked. Please contact the administrator.");
      setLoading(false);
      return;
    }

    setLoading(false);

    if (role === "admin") {
      router.replace("/admin");
    } else if (role === "committee") {
      router.replace("/committee");
    } else if (role === "high_council") {
      router.replace("/high-council");
    } else if (role === "club_advisor") {
      router.replace("/club-advisor");
    } else {
      router.replace(safeNextPath || "/student");
    }
  };

  const roleCards: Array<{
    role: AccessRole;
    label: string;
    description: string;
  }> = [
    {
      role: "student",
      label: "Student",
      description: "Use matrix number login",
    },
    {
      role: "committee",
      label: "Club Committee",
      description: "Create events and certificate drafts",
    },
    {
      role: "high_council",
      label: "High Council",
      description: "Review event paperwork",
    },
    {
      role: "club_advisor",
      label: "Club Advisor",
      description: "Review and approve submissions",
    },
    {
      role: "admin",
      label: "Admin",
      description: "Use matrix number login",
    },
  ];

  const headingRole =
    accessRole === "committee"
      ? "Club Committee"
      : accessRole === "high_council"
      ? "High Council"
      : accessRole === "club_advisor"
      ? "Club Advisor"
      : accessRole.charAt(0).toUpperCase() + accessRole.slice(1);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 via-white to-blue-50 px-4 py-8">

      <div className="w-full max-w-5xl mx-4 relative z-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-8 text-white shadow-2xl shadow-slate-950/20">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300 transition hover:text-blue-200"
            >
              ITC FSKTM UTHM
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Back to home
            </Link>
          </div>
          <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight">
            Sign in as {headingRole}.
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            {accessRole === "student"
              ? "Students use matrix number login. After signing in, registration uses your saved account details."
              : accessRole === "committee"
              ? "Club Committee users create events, upload participants, and submit certificate drafts for approval."
              : accessRole === "high_council"
              ? "High Council users review submitted event paperwork."
              : accessRole === "club_advisor"
              ? "Club advisors review submitted events and certificate drafts."
              : "This role uses matrix number login and opens its own management workspace."}
          </p>

          {!lockedRole && (
            <div className="mt-8 grid gap-3">
              {roleCards.map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => {
                    setSelectedRole(item.role);
                    setMatrixNumber("");
                    setPassword("");
                  }}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    accessRole === item.role
                      ? "border-blue-400 bg-white/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{item.label}</p>
                      <p className="mt-1 text-sm text-slate-300">{item.description}</p>
                    </div>
                    <span className="rounded-full bg-blue-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">
                      {item.role}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            {accessRole === "student"
              ? "Create your student account once, then register future events with one confirmation."
              : accessRole === "committee"
              ? "Use your matrix number to open the operational event and certificate workspace."
              : accessRole === "high_council"
              ? "Use your matrix number to open the High Council review workspace."
              : accessRole === "club_advisor"
              ? "Use your matrix number to open the advisor approval workspace."
              : "Staff access is separated from the student event browsing experience."}
          </div>
        </div>

        <div className="w-full relative z-10">
          <div className="space-y-6 rounded-lg border border-slate-200 bg-white/95 p-8 shadow-2xl shadow-slate-950/10 backdrop-blur">
            <div className="text-center space-y-2">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-blue-700 to-slate-900 shadow-lg shadow-blue-700/20">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-slate-950">
                {headingRole} Login
              </h2>
              <p className="text-slate-600">
                {usesMatrixLogin
                  ? "Enter your matrix number and password to continue"
                  : "Enter your account details to continue"}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {usesMatrixLogin ? (
                <div className="space-y-2">
                  <label htmlFor="matrixNumber" className="text-sm font-medium text-slate-700 block">
                    Matrix Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v10a2 2 0 002 2h5m0 0h5a2 2 0 002-2v-10a2 2 0 00-2-2h-5m0 0V5a2 2 0 012-2h3.28a1 1 0 00.948-.684l1.498-4.493a1 1 0 00-.502-1.21l-.306-.102A1 1 0 0015 2.5v5z" />
                      </svg>
                    </div>
                    <input
                      id="matrixNumber"
                      type="text"
                      placeholder="e.g., A12345678"
                      value={matrixNumber}
                      onChange={(e) => setMatrixNumber(e.target.value.toUpperCase())}
                      required
                    className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 transition duration-200 hover:bg-slate-50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700 block">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-12 transition duration-200 hover:bg-slate-50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center cursor-pointer group">
                  <input type="checkbox" className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="ml-2 text-slate-600 group-hover:text-slate-900 transition">Remember me</span>
                </label>
                <a href="/forgot-password" className="font-medium text-blue-700 transition hover:text-blue-600">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-700 py-3.5 font-semibold text-white shadow-lg shadow-blue-700/20 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  `Login as ${headingRole}`
                )}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-500">New to ITC Secure?</span>
              </div>
            </div>

            <div className="text-center">
              <a
                href={safeNextPath ? `/register?next=${encodeURIComponent(safeNextPath)}` : "/register"}
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700 transition duration-200 hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create new account
              </a>
            </div>
          </div>

          <div className="text-center text-sm text-slate-500">
            Protected by enterprise-grade security
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LoginContent />
    </Suspense>
  );
}
