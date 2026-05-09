"use client";

import Link from "next/link";

export default function FacilityManagerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Facility Manager Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage facilities and their availability schedules.</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/facility-manager/facilities"
          className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition"
        >
          <div className="text-2xl font-bold text-indigo-600 mb-2">📍</div>
          <h3 className="text-lg font-semibold text-gray-900">Manage Facilities</h3>
          <p className="text-gray-600 text-sm mt-2">Add, edit, or remove rooms/places in the faculty.</p>
        </Link>

        <Link
          href="/facility-manager/availability"
          className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg transition"
        >
          <div className="text-2xl font-bold text-green-600 mb-2">📅</div>
          <h3 className="text-lg font-semibold text-gray-900">Manage Availability</h3>
          <p className="text-gray-600 text-sm mt-2">Set room availability periods and block dates.</p>
        </Link>
      </div>

      {/* Information Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>1. First, create facilities (rooms) that can be booked for events</li>
          <li>2. Then set availability windows to indicate when each room is available or unavailable</li>
          <li>3. Admins will see available facilities when creating new events</li>
          <li>4. Once an event is assigned to a facility, it will be marked as booked</li>
        </ul>
      </div>
    </div>
  );
}
