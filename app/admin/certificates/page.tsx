"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Event = {
  id: string;
  title: string;
};

type Student = {
  user_id: string;
  name: string;
  email: string;
};

export default function AdminCertificatesPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuingAll, setIssuingAll] = useState(false);
  const [searchStudent, setSearchStudent] = useState("");

  /* ===============================
     LOAD EVENTS
  =============================== */
  useEffect(() => {
    const loadEvents = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title")
        .order("created_at", { ascending: false });

      if (!error) {
        setEvents(data || []);
      }
    };

    loadEvents();
  }, []);

  /* ===============================
     LOAD STUDENTS FOR EVENT
  =============================== */
  useEffect(() => {
    if (!selectedEvent) {
      setStudents([]);
      return;
    }

    const loadStudents = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("event_registrations")
        .select(`
          user_id,
          users!fk_event_registrations_user (
            id,
            name,
            email
          )
        `)
        .eq("event_id", selectedEvent);

      if (error) {
        console.error("Error loading students:", error);
        setStudents([]);
      } else {
        const cleanStudents: Student[] = (data ?? [])
          .filter((row: any) => row.users)
          .map((row: any) => ({
            user_id: row.user_id,
            name: row.users.name || "N/A",
            email: row.users.email || "N/A",
          }));

        console.log("Loaded students:", cleanStudents);
        setStudents(cleanStudents);
      }

      setLoading(false);
    };

    loadStudents();
  }, [selectedEvent]);

  /* ===============================
     ISSUE CERTIFICATE
  =============================== */
  const issueCertificate = async (userId: string) => {
    const certificateNo = `CERT-${Date.now()}`;

    const { error } = await supabase.from("certificates").insert({
      user_id: userId,
      event_id: selectedEvent,
      certificate_no: certificateNo,
      issued_at: new Date().toISOString(),
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Certificate issued successfully");
    }
  };

  const issueAllCertificates = async () => {
    if (!selectedEvent) return alert("Select an event first.");
    if (students.length === 0) return alert("No students to issue certificates for.");

    if (!confirm(`Issue certificates for ${students.length} students? This will skip users who already have a certificate for this event.`)) return;

    setIssuingAll(true);
    try {
      const userIds = students.map((s) => s.user_id).filter(Boolean);

      // Fetch existing certificates for these users for this event
      const { data: existingCerts, error: existingError } = await supabase
        .from("certificates")
        .select("user_id")
        .eq("event_id", selectedEvent)
        .in("user_id", userIds);

      if (existingError) throw existingError;

      const already = new Set((existingCerts ?? []).map((c: any) => c.user_id));
      const toIssue = userIds.filter((id) => !already.has(id));

      if (toIssue.length === 0) {
        alert("All students already have certificates for this event.");
        return;
      }

      const now = new Date().toISOString();
      const rows = toIssue.map((uid) => ({
        user_id: uid,
        event_id: selectedEvent,
        certificate_no: `CERT-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        issued_at: now,
      }));

      const { error: insertError } = await supabase.from("certificates").insert(rows);
      if (insertError) throw insertError;

      alert(`Issued ${rows.length} certificates.`);
    } catch (err: any) {
      console.error(err);
      alert("Error issuing certificates: " + (err.message || err));
    } finally {
      setIssuingAll(false);
    }
  };

  /* ===============================
     UI
  =============================== */
  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      student.email.toLowerCase().includes(searchStudent.toLowerCase())
  );

  return (
    <div className="space-y-6" style={{ padding: 20 }}>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Issue Certificates</h1>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Event
          </label>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Select Event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>

        {selectedEvent && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Students
            </label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-6"
            />
          </div>
        )}
      </div>

      {selectedEvent && (
        <div className="bg-white rounded-lg shadow-md p-6">
          {loading && <p className="text-gray-600">Loading students...</p>}

          {!loading && students.length === 0 && selectedEvent && (
            <p className="text-gray-600">No students registered for this event</p>
          )}

          {!loading && students.length > 0 && filteredStudents.length === 0 && (
            <p className="text-gray-600">No students match your search</p>
          )}

          {students.length > 0 && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={issueAllCertificates}
                disabled={issuingAll}
                className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 disabled:opacity-50"
              >
                {issuingAll ? "Issuing..." : "Issue Certificates for All"}
              </button>
            </div>
          )}

          {filteredStudents.length > 0 && (
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
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => issueCertificate(student.user_id)}
                          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700 transition"
                        >
                          Issue Certificate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
