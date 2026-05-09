"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type NotificationPreferences = {
  new_events: boolean;
  event_reminders: boolean;
  spots_filling_alerts: boolean;
};

export default function NotificationPreferencesComponent() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    new_events: true,
    event_reminders: true,
    spots_filling_alerts: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("event_notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading preferences:", error);
        return;
      }

      if (data) {
        setPreferences({
          new_events: data.new_events ?? true,
          event_reminders: data.event_reminders ?? true,
          spots_filling_alerts: data.spots_filling_alerts ?? true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Please login first");
        setSaving(false);
        return;
      }

      const { data: existing } = await supabase
        .from("event_notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        // Update
        const { error } = await supabase
          .from("event_notification_preferences")
          .update(preferences)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from("event_notification_preferences")
          .insert({
            user_id: user.id,
            ...preferences,
          });

        if (error) throw error;
      }

      setMessage("Preferences saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error saving preferences:", error);
      setMessage("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        📧 Notification Preferences
      </h2>

      <div className="space-y-4">
        {/* New Events */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <p className="font-medium text-gray-900">New Events</p>
            <p className="text-sm text-gray-600">
              Get notified when new events are posted
            </p>
          </div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.new_events}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  new_events: e.target.checked,
                })
              }
              className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
            />
          </label>
        </div>

        {/* Event Reminders */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <p className="font-medium text-gray-900">Event Reminders</p>
            <p className="text-sm text-gray-600">
              Receive reminders for events you're registered for
            </p>
          </div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.event_reminders}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  event_reminders: e.target.checked,
                })
              }
              className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
            />
          </label>
        </div>

        {/* Spots Filling Alert */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <p className="font-medium text-gray-900">Spots Filling Up</p>
            <p className="text-sm text-gray-600">
              Be alerted when event spots are running out
            </p>
          </div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.spots_filling_alerts}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  spots_filling_alerts: e.target.checked,
                })
              }
              className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
            />
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          {message && (
            <p
              className={`text-sm font-medium ${
                message.includes("success")
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}
        </div>
        <button
          onClick={savePreferences}
          disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
