"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Facility = {
  id: string;
  name: string;
  location?: string;
};

type AvailabilityRecord = {
  id: string;
  facility_id: string;
  start_date: string;
  end_date: string;
  status: "available" | "unavailable" | "booked";
  booking_note?: string;
  created_at: string;
  facilities?: {
    name: string;
  };
};

type AvailabilityRow = Omit<AvailabilityRecord, "facilities"> & {
  facilities?: { name: string } | { name: string }[] | null;
};

export default function AvailabilityPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [availabilityRecords, setAvailabilityRecords] = useState<AvailabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedFacility, setSelectedFacility] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"available" | "unavailable" | "booked">("available");
  const [bookingNote, setBookingNote] = useState("");

  const loadData = async () => {
    setLoading(true);

    // Load facilities
    const { data: facilitiesData, error: facilitiesError } = await supabase
      .from("facilities")
      .select("id, name, location")
      .order("name", { ascending: true });

    if (!facilitiesError && facilitiesData) {
      setFacilities(facilitiesData as Facility[]);
      // Auto-select first facility
      if (facilitiesData.length > 0 && !selectedFacility) {
        setSelectedFacility(facilitiesData[0].id);
      }
    }

    // Load availability records
    const { data: availabilityData, error: availabilityError } = await supabase
      .from("facility_availability")
      .select(
        `
        id,
        facility_id,
        start_date,
        end_date,
        status,
        booking_note,
        created_at,
        facilities (
          name
        )
      `
      )
      .order("start_date", { ascending: false });

    if (!availabilityError && availabilityData) {
      const records = (availabilityData as AvailabilityRow[]).map((record) => ({
        ...record,
        facilities: Array.isArray(record.facilities)
          ? record.facilities[0]
          : record.facilities || undefined,
      }));

      setAvailabilityRecords(records);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const addAvailability = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFacility || !startDate || !endDate) {
      alert("Please fill in all required fields.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert("Start date must be before end date.");
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("facility_availability").insert({
      facility_id: selectedFacility,
      start_date: startDate,
      end_date: endDate,
      status,
      booking_note: bookingNote.trim() || null,
      created_by: user?.id,
    });

    setSubmitting(false);

    if (error) {
      alert(`Error adding availability: ${error.message}`);
      return;
    }

    // Reset form
    setStartDate("");
    setEndDate("");
    setStatus("available");
    setBookingNote("");

    await loadData();
  };

  const deleteAvailability = async (recordId: string) => {
    const confirmed = confirm("Delete this availability record?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("facility_availability")
      .delete()
      .eq("id", recordId);

    if (error) {
      alert(`Error deleting record: ${error.message}`);
      return;
    }

    await loadData();
  };

  const getStatusColor = (status: string) => {
    if (status === "available") return "bg-green-100 text-green-800";
    if (status === "unavailable") return "bg-red-100 text-red-800";
    if (status === "booked") return "bg-amber-100 text-amber-800";
    return "bg-gray-100 text-gray-800";
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
        <h1 className="text-3xl font-bold text-slate-900">Manage Availability</h1>
        <p className="text-gray-600 mt-2">
          Set which facilities are available, unavailable, or booked for specific date ranges.
        </p>
      </div>

      {/* Add Availability Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Availability Period</h2>

        {facilities.length === 0 ? (
          <p className="text-amber-600">
            No facilities found. Please create facilities first.
          </p>
        ) : (
          <form onSubmit={addAvailability} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Facility *
              </label>
              <select
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select a facility</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.location ? `(${f.location})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Date *
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  End Date *
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "available" | "unavailable" | "booked")}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="available">Available</option>
                <option value="unavailable">Unavailable (Maintenance/Closed)</option>
                <option value="booked">Booked (By Event)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Note
              </label>
              <input
                type="text"
                value={bookingNote}
                onChange={(e) => setBookingNote(e.target.value)}
                placeholder="e.g., Maintenance, Special Event, etc."
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white font-medium py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Availability Period"}
            </button>
          </form>
        )}
      </div>

      {/* Availability Records */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Availability Schedule ({availabilityRecords.length})
        </h2>

        {availabilityRecords.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No availability records yet. Add one above to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {availabilityRecords.map((record) => (
              <div
                key={record.id}
                className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium text-gray-900">
                      {record.facilities?.name || "Unknown Facility"}
                    </p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusColor(record.status)}`}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(record.start_date).toLocaleString()} →{" "}
                    {new Date(record.end_date).toLocaleString()}
                  </p>
                  {record.booking_note && (
                    <p className="text-sm text-gray-500 mt-1">Note: {record.booking_note}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteAvailability(record.id)}
                  className="ml-4 text-red-600 hover:text-red-700 font-medium text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
