"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type EventRow = {
  id: string;
  title: string;
  status?: string | null;
  registrationCount: number;
  certificateCount: number;
};

type Student = {
  user_id: string;
  name: string;
  email: string;
  payment_status?: string | null;
  certificate_id?: string | null;
  certificate_no?: string | null;
  certificate_status?: string | null;
};

type RegistrationRow = {
  event_id: string;
  user_id: string;
  payment_status?: string | null;
};

type CertificateRow = {
  id: string;
  user_id: string;
  event_id: string;
  certificate_no: string;
  status?: string | null;
};

type UserRow = {
  id: string;
  name?: string | null;
  email?: string | null;
};

function generateCertificateNo() {
  return `CERT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export default function AdminCertificatesPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [issuingAll, setIssuingAll] = useState(false);
  const [issuingUserId, setIssuingUserId] = useState<string | null>(null);
  const [searchStudent, setSearchStudent] = useState("");

  const anchorCertificateOnSepolia = async (certificateId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { anchored: false, reason: "Please log in again to anchor the certificate on Sepolia." };
    }

    const response = await fetch("/api/certificates/anchor-sepolia", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ certificateId }),
    });

    return response.json().catch(() => ({
      anchored: false,
      reason: "Unable to read Sepolia anchor response.",
    }));
  };

  const loadEvents = async () => {
    setLoadingEvents(true);

    const [{ data: eventRows, error: eventsError }, { data: registrations }, { data: certificates }] =
      await Promise.all([
        supabase.from("events").select("id, title, status, created_at").order("created_at", { ascending: false }),
        supabase.from("event_registrations").select("event_id"),
        supabase.from("certificates").select("event_id"),
      ]);

    if (eventsError) {
      alert("Error loading events: " + eventsError.message);
      setEvents([]);
      setLoadingEvents(false);
      return;
    }

    const registrationCounts = new Map<string, number>();
    const certificateCounts = new Map<string, number>();

    ((registrations ?? []) as Pick<RegistrationRow, "event_id">[]).forEach((row) => {
      registrationCounts.set(row.event_id, (registrationCounts.get(row.event_id) ?? 0) + 1);
    });

    ((certificates ?? []) as Pick<CertificateRow, "event_id">[]).forEach((row) => {
      certificateCounts.set(row.event_id, (certificateCounts.get(row.event_id) ?? 0) + 1);
    });

    const nextEvents = ((eventRows ?? []) as Array<Pick<EventRow, "id" | "title" | "status">>).map((event) => ({
      id: event.id,
      title: event.title,
      status: event.status,
      registrationCount: registrationCounts.get(event.id) ?? 0,
      certificateCount: certificateCounts.get(event.id) ?? 0,
    }));

    setEvents(nextEvents);
    setLoadingEvents(false);

    if (!selectedEvent) {
      const firstWithStudents = nextEvents.find((event) => event.registrationCount > 0);
      if (firstWithStudents) setSelectedEvent(firstWithStudents.id);
    }
  };

  const loadStudents = async () => {
    if (!selectedEvent) {
      setStudents([]);
      return;
    }

    setLoadingStudents(true);

    const { data: registrations, error: registrationsError } = await supabase
      .from("event_registrations")
      .select("event_id, user_id, payment_status")
      .eq("event_id", selectedEvent)
      .order("registered_at", { ascending: false });

    if (registrationsError) {
      alert("Error loading event registrations: " + registrationsError.message);
      setStudents([]);
      setLoadingStudents(false);
      return;
    }

    const registrationRows = (registrations ?? []) as RegistrationRow[];
    const userIds = [...new Set(registrationRows.map((row) => row.user_id).filter(Boolean))];

    if (userIds.length === 0) {
      setStudents([]);
      setLoadingStudents(false);
      return;
    }

    const [{ data: users, error: usersError }, { data: certificates, error: certificatesError }] =
      await Promise.all([
        supabase.from("users").select("id, name, email").in("id", userIds),
        supabase.from("certificates").select("id, user_id, event_id, certificate_no, status").eq("event_id", selectedEvent),
      ]);

    if (usersError || certificatesError) {
      alert("Error loading certificate data: " + (usersError?.message || certificatesError?.message));
      setStudents([]);
      setLoadingStudents(false);
      return;
    }

    const usersById = new Map(((users ?? []) as UserRow[]).map((user) => [user.id, user]));
    const certsByUserId = new Map(
      ((certificates ?? []) as CertificateRow[]).map((certificate) => [certificate.user_id, certificate])
    );

    setStudents(
      registrationRows.map((registration) => {
        const user = usersById.get(registration.user_id);
        const certificate = certsByUserId.get(registration.user_id);

        return {
          user_id: registration.user_id,
          name: user?.name || "N/A",
          email: user?.email || "N/A",
          payment_status: registration.payment_status,
          certificate_id: certificate?.id,
          certificate_no: certificate?.certificate_no,
          certificate_status: certificate?.status || null,
        };
      })
    );

    setLoadingStudents(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      void loadEvents();
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadStudents();
    });
  }, [selectedEvent]);

  const issueCertificate = async (userId: string) => {
    if (!selectedEvent) return;
    const student = students.find((item) => item.user_id === userId);
    if (student?.payment_status !== "paid") {
      alert("Certificates can only be generated for paid registrations.");
      return;
    }

    setIssuingUserId(userId);
    const certificateNo = generateCertificateNo();

    const { data: certificate, error } = await supabase
      .from("certificates")
      .insert({
        user_id: userId,
        event_id: selectedEvent,
        certificate_no: certificateNo,
        issued_at: new Date().toISOString(),
        status: "approved",
      })
      .select("id")
      .single();

    setIssuingUserId(null);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("events").update({ status: "completed" }).eq("id", selectedEvent);

    const anchorResult = certificate?.id ? await anchorCertificateOnSepolia(certificate.id) : null;

    alert(
      anchorResult?.anchored
        ? `Certificate generated and anchored on Ethereum Sepolia.\nTransaction: ${anchorResult.txHash}`
        : `Certificate generated. It is now available to the student.\nSepolia anchor: ${anchorResult?.reason || "not available"}`,
    );
    await Promise.all([loadEvents(), loadStudents()]);
  };

  const issueAllCertificates = async () => {
    if (!selectedEvent) return alert("Select an event first.");

    const studentsWithoutCert = students.filter(
      (student) => student.payment_status === "paid" && !student.certificate_id
    );
    if (studentsWithoutCert.length === 0) {
      return alert("All students for this event already have certificates.");
    }

    if (!confirm(`Generate certificates for ${studentsWithoutCert.length} student(s)?`)) return;

    setIssuingAll(true);
    const now = new Date().toISOString();
    const rows = studentsWithoutCert.map((student) => ({
      user_id: student.user_id,
      event_id: selectedEvent,
      certificate_no: generateCertificateNo(),
      issued_at: now,
      status: "approved",
    }));

    const { data: createdCertificates, error } = await supabase
      .from("certificates")
      .insert(rows)
      .select("id");
    setIssuingAll(false);

    if (error) {
      alert("Error generating certificates: " + error.message);
      return;
    }

    await supabase.from("events").update({ status: "completed" }).eq("id", selectedEvent);

    const anchorResults = await Promise.all(
      (createdCertificates || []).map((certificate) => anchorCertificateOnSepolia(certificate.id)),
    );
    const anchoredCount = anchorResults.filter((result) => result?.anchored).length;
    const skippedReason = anchorResults.find((result) => !result?.anchored)?.reason;

    alert(
      `Generated ${rows.length} certificate(s). Students can view them now.\n` +
        `Sepolia anchored: ${anchoredCount}/${rows.length}` +
        (skippedReason ? `\nNote: ${skippedReason}` : ""),
    );
    await Promise.all([loadEvents(), loadStudents()]);
  };

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          student.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
          student.email.toLowerCase().includes(searchStudent.toLowerCase())
      ),
    [students, searchStudent]
  );

  const selectedEventRow = events.find((event) => event.id === selectedEvent);
  const approvedCount = students.filter((student) => student.certificate_status === "approved").length;
  const unpaidCount = students.filter((student) => student.payment_status !== "paid").length;
  const missingCount = students.filter(
    (student) => student.payment_status === "paid" && !student.certificate_id
  ).length;

  return (
    <div className="space-y-6 p-5">
      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Generate Certificates</h1>
            <p className="mt-1 text-sm text-gray-500">
              Choose an event with paid students, then generate certificates directly for students.
            </p>
          </div>
          <button
            onClick={loadEvents}
            disabled={loadingEvents}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">Select Event</label>
          <select
            value={selectedEvent}
            onChange={(event) => setSelectedEvent(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select Event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} - {event.registrationCount} student(s), {event.certificateCount} certificate(s)
              </option>
            ))}
          </select>
        </div>

        {selectedEventRow && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-semibold uppercase text-gray-500">Event Status</p>
              <p className="mt-1 text-sm font-bold text-gray-900">{selectedEventRow.status || "-"}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-semibold uppercase text-gray-500">Registered</p>
              <p className="mt-1 text-sm font-bold text-gray-900">{students.length}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-semibold uppercase text-gray-500">Unpaid</p>
              <p className="mt-1 text-sm font-bold text-red-700">{unpaidCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-semibold uppercase text-gray-500">Missing</p>
              <p className="mt-1 text-sm font-bold text-amber-700">{missingCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-semibold uppercase text-gray-500">Approved</p>
              <p className="mt-1 text-sm font-bold text-green-700">{approvedCount}</p>
            </div>
          </div>
        )}
      </div>

      {selectedEvent && (
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchStudent}
              onChange={(event) => setSearchStudent(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 md:max-w-md"
            />
            <button
              onClick={issueAllCertificates}
              disabled={issuingAll || missingCount === 0}
              className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white shadow hover:bg-green-700 disabled:opacity-50"
            >
              {issuingAll ? "Generating..." : `Generate Paid Missing (${missingCount})`}
            </button>
          </div>

          {loadingStudents && <p className="mt-6 text-gray-600">Loading students...</p>}

          {!loadingStudents && students.length === 0 && (
            <p className="mt-6 text-gray-600">No students registered for this event.</p>
          )}

          {!loadingStudents && students.length > 0 && filteredStudents.length === 0 && (
            <p className="mt-6 text-gray-600">No students match your search.</p>
          )}

          {filteredStudents.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Certificate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredStudents.map((student) => (
                    <tr key={student.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-500">{student.email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{student.payment_status || "unpaid"}</td>
                      <td className="px-6 py-4">
                        {student.certificate_id ? (
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{student.certificate_no}</p>
                            <p className="text-sm text-gray-500">{student.certificate_status || "pending"}</p>
                          </div>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                            Not generated
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {student.certificate_id ? (
                          student.certificate_status === "approved" ? (
                            <a
                              href={`/certificate/${student.certificate_id}`}
                              className="font-semibold text-indigo-600 hover:text-indigo-500"
                            >
                              View
                            </a>
                          ) : (
                            <a
                              href={`/certificate/${student.certificate_id}`}
                              className="font-semibold text-indigo-600 hover:text-indigo-500"
                            >
                              View
                            </a>
                          )
                        ) : student.payment_status !== "paid" ? (
                          <span className="font-semibold text-red-700">Payment required</span>
                        ) : (
                          <button
                            onClick={() => issueCertificate(student.user_id)}
                            disabled={issuingUserId === student.user_id}
                            className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {issuingUserId === student.user_id ? "Generating..." : "Generate"}
                          </button>
                        )}
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
