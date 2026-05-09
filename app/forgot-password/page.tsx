"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSendReset = async () => {
    setError(null);
    if (!email || !email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const redirectTo = window.location.origin + "/reset-password"; // point to custom reset page
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) {
        setError(error.message);
        return;
      }
      setSent(true);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Forgot password</h1>
        <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send a password reset link.</p>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 p-3 rounded">{error}</div>
        )}

        {sent ? (
          <div className="text-sm text-green-700 bg-green-50 p-4 rounded">
            We've sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the instructions to reset your password.
            <div className="mt-3">
              <Link href="/login" className="text-indigo-600 hover:underline">Return to sign in</Link>
            </div>
          </div>
        ) : (
          <>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 mb-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="you@example.com"
              type="email"
            />

            <button
              onClick={handleSendReset}
              disabled={loading}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <div className="mt-4 text-center text-sm text-gray-600">
              Remembered your password?{' '}
              <Link href="/login" className="text-indigo-600 hover:underline">Sign in</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
