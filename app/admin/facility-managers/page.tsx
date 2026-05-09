"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type FacilityManager = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string | null;
};

export default function FacilityManagersPage() {
  const [facilityManagers, setFacilityManagers] = useState<FacilityManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loadFacilityManagers = async () => {
    setLoading(true);

    // Get all users with facility_manager role
    const { data, error } = await supabase
      .from("users")
      .select("id, email, created_at")
      .eq("role", "facility_manager")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setFacilityManagers(data as FacilityManager[]);
    } else if (error) {
      console.error("Error loading facility managers:", error);
      alert(`Error loading facility managers: ${error.message}`);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadFacilityManagers();
  }, []);

  const createFacilityManager = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      alert("Please enter the facility manager name.");
      return;
    }

    if (!email.trim()) {
      alert("Please enter an email address.");
      return;
    }

    if (!password || password.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existingUser) {
      alert("This email is already registered in the system.");
      return;
    }

    setSubmitting(true);

    try {
      // Call API to create facility manager
      const response = await fetch("/api/admin/create-facility-manager", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(`Error: ${result.error || "Failed to create facility manager"}`);
        setSubmitting(false);
        return;
      }

      alert(
        `Facility manager account created successfully!\n\nEmail: ${email}\n\nThey can now login at /login using the Staff tab.`
      );

      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      // Reload list
      await loadFacilityManagers();
    } catch (error) {
      console.error("Error creating facility manager:", error);
      alert("Failed to create facility manager. Please try again.");
    }

    setSubmitting(false);
  };

  const deleteFacilityManager = async (userId: string, userEmail: string) => {
    const confirmed = confirm(
      `Are you sure you want to delete the facility manager account for ${userEmail}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch("/api/admin/delete-facility-manager", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(`Error: ${result.error || "Failed to delete facility manager"}`);
        return;
      }

      alert("Facility manager account deleted successfully.");
      await loadFacilityManagers();
    } catch (error) {
      console.error("Error deleting facility manager:", error);
      alert("Failed to delete facility manager. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Manage Facility Managers</h1>
        <p className="text-gray-600 mt-2">Create and manage facility manager staff accounts.</p>
      </div>

      {/* Create New Facility Manager */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Facility Manager</h2>

        <form onSubmit={createFacilityManager} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Facility Manager Name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="facilitymanager@yourfaculty.edu"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Use a faculty staff email address
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Minimum 8 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 text-white font-medium py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Facility Manager Account"}
          </button>
        </form>
      </div>

      {/* Existing Facility Managers */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Existing Facility Managers ({facilityManagers.length})
        </h2>

        {facilityManagers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No facility managers created yet. Create one above to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Created
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Last Login
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {facilityManagers.map((manager) => (
                  <tr
                    key={manager.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{manager.email}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(manager.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {manager.last_sign_in_at
                        ? new Date(manager.last_sign_in_at).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteFacilityManager(manager.id, manager.email)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How It Works:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Create facility manager account with email and password</li>
          <li>• Share the email and password with the facility staff member</li>
          <li>• They login using the Staff tab on /login page</li>
          <li>• They can then manage facilities and availability at /facility-manager</li>
        </ul>
      </div>
    </div>
  );
}
