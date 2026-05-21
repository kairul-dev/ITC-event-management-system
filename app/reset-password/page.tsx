"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function parseParamsFromUrl(url: string) {
  try {
    const u = new URL(url);
    const params = Object.fromEntries(u.searchParams.entries());
    return params;
  } catch {
    return {};
  }
}

function parseHashParams(hash: string) {
  if (!hash) return {};
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  return Object.fromEntries(new URLSearchParams(trimmed));
}

export default function ResetPasswordPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const router = useRouter();

  useEffect(() => {
    // On mount, try to extract access_token & refresh_token from either query or hash
    const attempt = async () => {
      setLoading(true);
      setError(null);
      try {
        let params: Record<string, string> = {};
        // parse search params
        params = { ...params, ...parseParamsFromUrl(window.location.href) };
        // parse hash params (some providers put tokens in hash)
        params = { ...params, ...parseHashParams(window.location.hash) };

        const access_token = params.access_token || params.accessToken || params.access;
        const refresh_token = params.refresh_token || params.refreshToken || params.refresh;

        if (access_token) {
          // set session so we can call updateUser
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            console.error("setSession error", error);
            setError(error.message || "Invalid or expired reset link.");
            setAuthorized(false);
            setLoading(false);
            return;
          }
          if (data?.session) {
            setAuthorized(true);
            setLoading(false);
            return;
          }
        }

        // If no access token provided, maybe the redirect used query param 'type=recovery' and 'token' param
        const token = params.token || params.oobCode;
        if (token) {
          // try to set session using token via supabase.auth.setSession isn't possible; show instructions
          setError("Reset token found but could not set session automatically. Please request a new reset link.");
          setAuthorized(false);
          setLoading(false);
          return;
        }

        setError("No reset token found in URL. Please request a password reset.");
        setAuthorized(false);
      } catch (err: unknown) {
        console.error(err);
        setError(getErrorMessage(err, "Unable to initialize reset flow"));
      } finally {
        setLoading(false);
      }
    };

    attempt();
  }, []);

  const handleSavePassword = async () => {
    setError(null);
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.error(error);
        setError(error.message || "Unable to update password.");
        return;
      }

      // Successful password update - redirect to login
      router.push("/login");
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err, "Unable to update password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Reset password</h1>
        <p className="text-sm text-gray-500 mb-6">Set a new password for your account.</p>

        {loading && <div className="text-sm text-gray-600 mb-4">Initializing...</div>}
        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 p-3 rounded">{error}</div>}

        {!loading && !authorized && (
          <div className="text-sm text-gray-700">
            Unable to verify reset link. You can request a new reset link from the{' '}
            <Link href="/forgot-password" className="text-indigo-600 hover:underline">Forgot password</Link> page.
          </div>
        )}

        {!loading && authorized && (
          <>
            <label className="block text-sm font-medium text-gray-700">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 mb-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter new password"
            />

            <label className="block text-sm font-medium text-gray-700">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 mb-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Confirm new password"
            />

            <button
              onClick={handleSavePassword}
              disabled={loading}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save new password'}
            </button>

            <div className="mt-4 text-center text-sm text-gray-600">
              Return to{' '}
              <Link href="/login" className="text-indigo-600 hover:underline">Sign in</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
