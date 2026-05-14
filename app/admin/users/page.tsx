"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type User = {
  id: string;
  email: string;
  name: string;
  matrix_number?: string;
  role: string;
  created_at: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "student" | "president" | "high_council">("all");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setUsers(data as User[]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId);
    try {
      const { data, error } = await supabase
        .from("users")
        .update({ role: newRole })
        .eq("id", userId)
        .select("id, role");

      if (error) {
        alert("Error updating user role: " + error.message);
      } else if (!data || data.length === 0) {
        alert(
          "Role was not updated. This is usually an RLS policy issue. " +
            "Run migration: 20260411_admin_update_user_roles.sql"
        );
      } else {
        alert("User role updated successfully");
        await loadUsers();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error updating user role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const deleteUser = async (user: User) => {
    const confirmed = confirm(
      `Delete user ${user.email}? This will also remove related registrations and certificates.`
    );
    if (!confirmed) return;

    setDeletingUserId(user.id);
    try {
      const { error: registrationsError } = await supabase
        .from("event_registrations")
        .delete()
        .eq("user_id", user.id);

      if (registrationsError) {
        alert("Error deleting user registrations: " + registrationsError.message);
        return;
      }

      // If RLS blocks delete silently, rows can remain and later violate FK on users delete.
      const { count: remainingRegistrations, error: registrationsCountError } = await supabase
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (registrationsCountError) {
        alert("Unable to verify user registrations: " + registrationsCountError.message);
        return;
      }

      if ((remainingRegistrations ?? 0) > 0) {
        alert(
          "Cannot delete this user yet because related event registrations still exist. " +
            "Please update Supabase RLS/policies for deleting event_registrations, or enable ON DELETE CASCADE on the FK."
        );
        return;
      }

      const { error: certificatesError } = await supabase
        .from("certificates")
        .delete()
        .eq("user_id", user.id);

      if (certificatesError) {
        alert("Error deleting user certificates: " + certificatesError.message);
        return;
      }

      const { count: remainingCertificates, error: certificatesCountError } = await supabase
        .from("certificates")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (certificatesCountError) {
        alert("Unable to verify user certificates: " + certificatesCountError.message);
        return;
      }

      if ((remainingCertificates ?? 0) > 0) {
        alert(
          "Cannot delete this user yet because related certificates still exist. " +
            "Please update Supabase RLS/policies for deleting certificates, or enable ON DELETE CASCADE on the FK."
        );
        return;
      }

      const { error: userError } = await supabase
        .from("users")
        .delete()
        .eq("id", user.id);

      if (userError) {
        alert("Error deleting user: " + userError.message);
        return;
      }

      alert("User deleted successfully");
      await loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Error deleting user");
    } finally {
      setDeletingUserId(null);
    }
  };

  const filteredUsers = users.filter(
    (user) => {
      const matchesSearch =
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.matrix_number || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === "all" ? true : (user.role || "student") === roleFilter;

      return matchesSearch && matchesRole;
    }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-sm text-gray-500">
            View and manage user roles in the system.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
            <span className="text-sm text-gray-500">
              Total: {users.length} user{users.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="text"
            placeholder="Search users by name, email, or matric number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <select
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(e.target.value as "all" | "admin" | "student" | "president" | "high_council")
            }
            className="w-full md:w-56 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin Only</option>
            <option value="student">Student Only</option>
            <option value="president">President Only</option>
            <option value="high_council">High Council Only</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No users found.
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No users match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matric Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.matrix_number || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : user.role === "facility_manager"
                            ? "bg-emerald-100 text-emerald-800"
                            : user.role === "high_council"
                            ? "bg-amber-100 text-amber-800"
                            : user.role === "president"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.role || "student"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <select
                          value={user.role || "student"}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          disabled={updatingUserId === user.id || deletingUserId === user.id}
                          className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="student">Student</option>
                          <option value="admin">Admin</option>
                          <option value="facility_manager">Facility Manager</option>
                          <option value="president">President</option>
                          <option value="high_council">High Council</option>
                        </select>
                        <button
                          onClick={() => deleteUser(user)}
                          disabled={updatingUserId === user.id || deletingUserId === user.id}
                          className="px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingUserId === user.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
