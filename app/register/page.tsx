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
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Create an account</h1>
        <p className="text-sm text-gray-500 mb-6">Register as a student to access the portal.</p>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 p-3 rounded">{error}</div>
        )}

        <label className="block text-sm font-medium text-gray-700">Full name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 mb-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="John Doe"
        />

        <label className="block text-sm font-medium text-gray-700">Matrix Number</label>
        <input
          value={matrixNumber}
          onChange={(e) => setMatrixNumber(e.target.value)}
          className="mt-1 mb-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="A12345678"
        />

        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 mb-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="you@example.com"
          type="email"
        />

        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 mb-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Choose a strong password"
          type="password"
        />

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Register"}
        </button>

        <div className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href={
              safeNextPath
                ? `/login?role=student&next=${encodeURIComponent(safeNextPath)}`
                : "/login"
            }
            className="text-indigo-600 hover:underline"
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
