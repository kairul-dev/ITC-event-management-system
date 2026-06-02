"use client";

import { Suspense, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function RegisterContent() {
  const [name, setName] = useState("");
  const [matrixNumber, setMatrixNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const safeNextPath =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : null;

  const validate = () => {
    setError(null);
    if (!name.trim()) return "Please enter your full name.";
    if (!matrixNumber.trim()) return "Please enter your matrix number.";
    if (!email.trim()) return "Please enter your email.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const handleRegister = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Create auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.user) {
        setError("Failed to create user account.");
        return;
      }

      // Insert into users table
      const { error: insertError } = await supabase.from("users").insert({
        id: data.user.id,
        name: name.trim(),
        email: data.user.email,
        matrix_number: matrixNumber.trim().toUpperCase(),
        role: "student",
        status: "active",
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      // success
      router.push(
        safeNextPath
          ? `/login?role=student&next=${encodeURIComponent(safeNextPath)}`
          : "/login"
      );
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-blue-50 p-6">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-6 py-8 shadow-2xl shadow-slate-950/10">
        <div className="mb-6">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-blue-700 text-sm font-black text-white">
            ITC
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-700">Student Registration</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Create an account</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Register once to join ITC events, track payments, submit feedback, and access certificates.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>
        )}

        <label className="ds-label">Full name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="ds-input mb-3"
          placeholder="John Doe"
        />

        <label className="ds-label">Matrix Number</label>
        <input
          value={matrixNumber}
          onChange={(e) => setMatrixNumber(e.target.value)}
          className="ds-input mb-3"
          placeholder="A12345678"
        />

        <label className="ds-label">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="ds-input mb-3"
          placeholder="you@example.com"
          type="email"
        />

        <label className="ds-label">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="ds-input mb-4"
          placeholder="Choose a strong password"
          type="password"
        />

        <button
          onClick={handleRegister}
          disabled={loading}
          className="ds-btn-primary w-full"
        >
          {loading ? "Creating account..." : "Register"}
        </button>

        <div className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            href={
              safeNextPath
                ? `/login?role=student&next=${encodeURIComponent(safeNextPath)}`
                : "/login"
            }
            className="font-semibold text-blue-700 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function Register() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-50" />}>
      <RegisterContent />
    </Suspense>
  );
}
