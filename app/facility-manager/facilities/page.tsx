"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Facility = {
  id: string;
  name: string;
  description?: string;
  capacity?: number;
  location?: string;
  created_at: string;
};

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [location, setLocation] = useState("");

  const loadFacilities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("facilities")
      .select("*")
      .order("name", { ascending: true });

    if (!error && data) {
      setFacilities(data as Facility[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFacilities();
  }, []);

  const addFacility = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Please enter a facility name.");
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("facilities").insert({
      name: name.trim(),
      description: description.trim() || null,
      capacity: capacity ? parseInt(capacity, 10) : null,
      location: location.trim() || null,
      created_by: user?.id,
    });

    setSubmitting(false);

    if (error) {
      alert(`Error creating facility: ${error.message}`);
      return;
    }

    // Reset form
    setName("");
    setDescription("");
    setCapacity("");
    setLocation("");

    await loadFacilities();
  };

  const deleteFacility = async (facilityId: string) => {
    const confirmed = confirm(
      "Delete this facility? This will also remove all availability records."
    );
    if (!confirmed) return;

    const { error } = await supabase.from("facilities").delete().eq("id", facilityId);

    if (error) {
      alert(`Error deleting facility: ${error.message}`);
      return;
    }

    await loadFacilities();
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
        <h1 className="text-3xl font-bold text-slate-900">Manage Facilities</h1>
        <p className="text-gray-600 mt-2">Add and manage all available rooms/places in the faculty.</p>
      </div>

      {/* Add New Facility Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Facility</h2>
        <form onSubmit={addFacility} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Facility Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Auditorium A, Multipurpose Hall"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Large auditorium with 500 capacity, equipped with projector"
              rows={3}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Capacity
              </label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g., 500"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Building A, Floor 2"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 text-white font-medium py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add Facility"}
          </button>
        </form>
      </div>

      {/* Facilities List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          All Facilities ({facilities.length})
        </h2>

        {facilities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No facilities added yet. Create one above to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Capacity
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Location
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Created
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((facility) => (
                  <tr key={facility.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{facility.name}</p>
                        {facility.description && (
                          <p className="text-gray-600 text-xs mt-1">{facility.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {facility.capacity ? `${facility.capacity} pax` : "—"}
                    </td>
                    <td className="py-3 px-4">{facility.location || "—"}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(facility.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteFacility(facility.id)}
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
    </div>
  );
}
