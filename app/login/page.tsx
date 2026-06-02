"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

type AccessRole = "student" | "committee" | "high_council" | "club_advisor" | "admin";

const roleCards: Array<{
  role: AccessRole;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    role: "admin",
    label: "Admin",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 3v5c0 4.2-2.7 7.8-7 9-4.3-1.2-7-4.8-7-9V6l7-3Zm0 6v4m0 3h.01" />
    ),
  },
  {
    role: "high_council",
    label: "High Council",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20h16M6 10h12M7 10v7m4-7v7m4-7v7m3-10H5l7-4 7 4Z" />
    ),
  },
  {
    role: "club_advisor",
    label: "Club Advisor",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0m-4-4 2 2 4-4" />
    ),
  },
  {
    role: "committee",
    label: "Club Committee",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m14-10a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm4 10v-1a4 4 0 0 0-3-3.8M18 6.2a4 4 0 0 1 0 7.6" />
    ),
  },
  {
    role: "student",
    label: "Student",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4 3 8l9 4 9-4-9-4Zm0 8v8m-5-5 5 3 5-3" />
    ),
  },
];

const featureHighlights = [
  {
    title: "Secure",
    description: "Blockchain-powered security ensures data integrity.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 3v5c0 4.2-2.7 7.8-7 9-4.3-1.2-7-4.8-7-9V6l7-3Zm-3 9 2 2 4-5" />
    ),
  },
  {
    title: "Reliable",
    description: "Tamper-proof certificates users can trust.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4h8l3 3v17l-5-2-4 2-4-2-5 2V7l3-3Zm2 8h6m-6 4h4" />
    ),
  },
  {
    title: "Easy to Use",
    description: "Simple and efficient system for every role.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" />
    ),
  },
];

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
  const [selectedRole, setSelectedRole] = useState<AccessRole>("admin");
  const accessRole = lockedRole || selectedRole;
  const [matrixNumber, setMatrixNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
      alert(result.error || "Username not found for this login role.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: result.email,
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
      router.replace("/club-committee");
    } else if (role === "high_council") {
      router.replace("/high-council");
    } else if (role === "club_advisor") {
      router.replace("/club-advisor");
    } else {
      router.replace(safeNextPath || "/student");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Link
        href="/"
        className="fixed left-4 top-4 z-20 inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/90 px-4 py-2 text-sm font-black text-slate-800 shadow-lg shadow-slate-950/10 backdrop-blur transition hover:bg-white sm:left-6 sm:top-6"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19 8 12l7-7" />
        </svg>
        Back to Home
      </Link>
      <div className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative isolate overflow-hidden bg-slate-950 px-6 py-8 text-white sm:px-10 lg:flex lg:flex-col lg:justify-between lg:rounded-r-[4rem] lg:px-12 xl:px-16">
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#020617_0%,#082f6f_48%,#0f172a_100%)]" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_20%,rgba(59,130,246,0.35),transparent_28%),radial-gradient(circle_at_70%_78%,rgba(37,99,235,0.28),transparent_35%)]" />
          <svg className="absolute bottom-0 right-0 -z-10 h-80 w-full opacity-45" viewBox="0 0 640 320" fill="none" aria-hidden="true">
            <path d="M12 285 120 224l96 42 118-126 88 56 126-142" stroke="#60a5fa" strokeWidth="1.5" />
            <path d="M42 248 180 282l92-78 104 36 176-92" stroke="#38bdf8" strokeWidth="1" opacity=".65" />
            {[12, 120, 216, 334, 422, 548, 42, 180, 272, 376, 552].map((x, index) => (
              <circle key={`${x}-${index}`} cx={x} cy={index < 6 ? [285, 224, 266, 140, 196, 54][index] : [248, 282, 204, 240, 148][index - 6]} r={index % 3 === 0 ? 5 : 3} fill="#60a5fa" />
            ))}
          </svg>

          <div>
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-16 place-items-center rounded-t-lg rounded-b-3xl border border-blue-300/50 bg-blue-900/80 shadow-lg shadow-blue-950/30">
                <div className="grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-white/10 text-xl font-black text-white">
                  ITC
                </div>
              </div>
              <div>
                <p className="text-3xl font-black tracking-tight">ITC CLUB</p>
                <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-blue-100">
                  Universiti Tun Hussein Onn Malaysia
                </p>
              </div>
            </div>

            <div className="mt-14 max-w-xl lg:mt-20">
              <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                ITC Secure Document Verification System
              </h1>
              <div className="mt-7 h-1 w-24 rounded-full bg-blue-500" />
              <p className="mt-7 text-lg leading-8 text-blue-50">
                A secure and trusted platform for managing, issuing, and verifying participation certificates using blockchain technology.
              </p>
            </div>

            <div className="mt-10 space-y-7">
              {featureHighlights.map((feature) => (
                <div key={feature.title} className="flex gap-5">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/20">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {feature.icon}
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-black">{feature.title}</h2>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-blue-100">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-12 text-xs font-medium text-blue-100/80">
            © 2026 ITC Club, UTHM. All rights reserved.
          </p>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-8 lg:px-10 xl:px-16">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/10 sm:p-8 lg:p-12">
            <div className="text-center">
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-blue-50 ring-8 ring-blue-50/70">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-blue-100 text-blue-700">
                  <svg className="h-9 w-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 10V7a4 4 0 0 0-8 0v3m-2 0h12v10H6V10Zm6 5v2" />
                  </svg>
                </div>
              </div>
              <h2 className="mt-8 text-3xl font-black tracking-tight text-slate-950">Welcome Back!</h2>
              <p className="mt-3 text-base font-medium text-slate-600">
                Please sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label htmlFor="matrixNumber" className="mb-2 block text-sm font-bold text-slate-900">
                  Username
                </label>
                <div className="relative">
                  <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />
                  </svg>
                  <input
                    id="matrixNumber"
                    type="text"
                    placeholder="Enter your username"
                    value={matrixNumber}
                    onChange={(e) => setMatrixNumber(e.target.value)}
                    required
                    className="h-14 w-full rounded-lg border border-slate-300 bg-white pl-12 pr-4 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-900">
                  Password
                </label>
                <div className="relative">
                  <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 10V7a4 4 0 0 0-8 0v3m-2 0h12v10H6V10Z" />
                  </svg>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 w-full rounded-lg border border-slate-300 bg-white pl-12 pr-12 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-blue-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M10.6 10.6A3 3 0 0 0 14 14m3.5 3.5A10.5 10.5 0 0 1 12 19C5.5 19 2 12 2 12a18.6 18.6 0 0 1 4.1-5.2M9.9 4.2A10.8 10.8 0 0 1 12 4c6.5 0 10 8 10 8a18.7 18.7 0 0 1-2.1 3.2" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-3 font-medium text-slate-700">
                  <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-blue-700 focus:ring-blue-500" />
                  Remember me
                </label>
                <Link href="/forgot-password" className="font-semibold text-blue-700 hover:text-blue-800">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-blue-700 text-base font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            {!lockedRole && (
              <div className="mt-8">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <p className="text-sm font-medium text-slate-500">or continue with</p>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                  {roleCards.map((item) => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => {
                        setSelectedRole(item.role);
                        setMatrixNumber("");
                        setPassword("");
                      }}
                      className={`min-h-24 rounded-lg border p-3 text-center transition hover:-translate-y-0.5 hover:shadow-md ${
                        accessRole === item.role
                          ? "border-blue-500 bg-blue-50 text-blue-800 shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                      }`}
                    >
                      <span className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-700">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {item.icon}
                        </svg>
                      </span>
                      <span className="mt-3 block text-sm font-bold">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 grid gap-3 md:grid-cols-2">
              <section className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-left">
                <p className="text-sm font-black text-slate-950">Don&apos;t have an account?</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                  Student accounts can self-register. Staff and committee accounts are created by Admin.
                </p>
                <Link href="/register" className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-blue-800">
                  Create Student Account
                </Link>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm">
                <p className="text-sm font-black text-slate-950">Need to verify a certificate?</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                  Public verification does not require login.
                </p>
                <Link href="/verify" className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-black text-blue-700 hover:bg-blue-50">
                  Verify Certificate
                </Link>
              </section>

              <p className="text-center text-xs font-semibold leading-5 text-slate-500 md:col-span-2">
                Admin, High Council, Club Advisor, and Club Committee accounts must be created by the system Admin.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LoginContent />
    </Suspense>
  );
}
