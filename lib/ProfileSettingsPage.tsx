"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type ProfileState = {
  name: string;
  email: string;
  matrix_number: string;
  avatar_url: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not load image file."));
      image.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Could not prepare image preview."));
          return;
        }

        canvas.width = size;
        canvas.height = size;
        const shortestSide = Math.min(image.width, image.height);
        const sourceX = (image.width - shortestSide) / 2;
        const sourceY = (image.height - shortestSide) / 2;

        context.drawImage(
          image,
          sourceX,
          sourceY,
          shortestSide,
          shortestSide,
          0,
          0,
          size,
          size
        );

        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileState>({
    name: "",
    email: "",
    matrix_number: "",
    avatar_url: "",
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadProfile();
  }, []);

  const showMessage = (value: string) => {
    setMessage(value);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setUser(user);
      setProfile({
        name: userData.name || "",
        email: userData.email || user.email || "",
        matrix_number: userData.matrix_number || "",
        avatar_url:
          typeof user.user_metadata?.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : "",
      });
    } catch (err: unknown) {
      console.error("Error loading profile:", err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setError("");
    setMessage("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const avatarUrl = await compressImage(file);
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl },
      });

      if (error) throw error;

      setProfile((current) => ({ ...current, avatar_url: avatarUrl }));
      window.dispatchEvent(
        new CustomEvent("profile-avatar-updated", {
          detail: { avatarUrl },
        })
      );
      showMessage("Profile picture updated successfully!");
    } catch (err: unknown) {
      console.error("Error updating profile picture:", err);
      setError("Failed to update profile picture: " + getErrorMessage(err, "Unknown error"));
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: "" },
      });

      if (error) throw error;

      setProfile((current) => ({ ...current, avatar_url: "" }));
      window.dispatchEvent(
        new CustomEvent("profile-avatar-updated", {
          detail: { avatarUrl: "" },
        })
      );
      showMessage("Profile picture removed.");
    } catch (err: unknown) {
      console.error("Error removing profile picture:", err);
      setError("Failed to remove profile picture: " + getErrorMessage(err, "Unknown error"));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!user) {
      setError("Please login first");
      return;
    }

    if (!profile.name.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ name: profile.name.trim() })
        .eq("id", user.id);

      if (error) throw error;

      showMessage("Profile updated successfully!");
    } catch (err: unknown) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile: " + getErrorMessage(err, "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setError("Please fill in all password fields");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      showMessage("Password changed successfully!");
      setPasswordData({
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: unknown) {
      console.error("Error changing password:", err);
      setError("Failed to change password: " + getErrorMessage(err, "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-96 place-items-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600" />
      </div>
    );
  }

  const initial = profile.name.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="w-full space-y-6">
      <section>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Profile Settings</h1>
        <p className="mt-2 text-base font-medium text-slate-500">Update your account details and profile picture.</p>
      </section>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto h-32 w-32 overflow-hidden rounded-full border-4 border-violet-100 bg-violet-50 shadow-sm">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-4xl font-black text-violet-700">
                {initial}
              </div>
            )}
          </div>
          <h2 className="mt-5 text-xl font-black text-slate-950">{profile.name || "User"}</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">{profile.email}</p>
          <div className="mt-6 flex flex-col gap-3">
            <label className="cursor-pointer rounded-lg bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700">
              {uploadingAvatar ? "Updating..." : "Upload New Picture"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingAvatar}
                onChange={handleAvatarChange}
              />
            </label>
            {profile.avatar_url && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar}
                className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Remove Picture
              </button>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Profile Information</h2>
            <form onSubmit={handleUpdateProfile} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500"
                  disabled
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Matrix Number</label>
                <input
                  type="text"
                  value={profile.matrix_number}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500"
                  disabled
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-violet-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Change Password</h2>
            <form onSubmit={handleChangePassword} className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(event) =>
                    setPasswordData({ ...passwordData, newPassword: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  minLength={6}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(event) =>
                    setPasswordData({ ...passwordData, confirmPassword: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  minLength={6}
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
