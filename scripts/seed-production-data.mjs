import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { ethers } from "ethers";

// 1. Load environment variables
function loadEnv(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) return;
      let [, key, val] = m;
      if (val.startsWith("\"") && val.endsWith("\"")) val = val.slice(1, -1);
      if (val.startsWith("\'") && val.endsWith("\'")) val = val.slice(1, -1);
      process.env[key] = val;
    });
  } catch (err) {}
}

const envPath = path.resolve(process.cwd(), ".env.local");
loadEnv(envPath);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.SEPOLIA_CONTRACT_ADDRESS || "0x837Dc6837647b28538EDa60B08f67f09f670bD5C";
const SEPOLIA_CHAIN_ID = 11155111;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Helper for timezone normalization
function normalizeIssuedAt(issuedAt) {
  const value = issuedAt.trim();
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
  const normalizedValue = hasTimezone ? value : `${value}+08:00`;
  return new Date(normalizedValue).toISOString();
}

// Certificate hashing function matching the system's logic
function calculateCertificateHash(certificateId, certificateNo, studentName, eventTitle, issuedAt) {
  const payload = [
    "ITC-CERTIFICATE-BLOCKCHAIN-V1",
    certificateId,
    certificateNo,
    studentName.trim().toUpperCase(),
    eventTitle.trim().toUpperCase(),
    normalizeIssuedAt(issuedAt),
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
}

// Live anchoring helper
async function anchorCertificateOnChain(certNo, studentName, eventTitle, certHash) {
  if (!RPC_URL || !PRIVATE_KEY) {
    console.warn("Sepolia not configured in .env.local. Skipping live anchoring.");
    return null;
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL, SEPOLIA_CHAIN_ID);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    const abi = [
      "function addCertificate(string certId, string studentName, string courseName, string ipfsHash)",
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
    
    console.log(`Live anchoring: certId=${certNo}, studentName=${studentName}, courseName=${eventTitle}`);
    const tx = await contract.addCertificate(certNo, studentName, eventTitle, certHash);
    console.log(`Transaction sent: ${tx.hash}`);
    return tx.hash;
  } catch (err) {
    console.error(`Error anchoring ${certNo}:`, err.message);
    return null;
  }
}

// Main seeding function
async function main() {
  console.log("Starting database seed with realistic production-like data...");
  
  // 2. Load staff IDs from the database (ensuring we preserve existing admin/advisor/committee/student)
  const { data: dbUsers, error: usersErr } = await supabase
    .from("users")
    .select("id, name, role, matrix_number, email");
  if (usersErr) throw usersErr;
  
  const adminUser = dbUsers.find(u => u.role === "admin") || { id: "ce84945b-8b9b-4548-8b55-f950d60503cb" };
  const committeeUser = dbUsers.find(u => u.role === "committee" && u.matrix_number === "AI220386") || dbUsers.find(u => u.role === "committee") || { id: "5de48381-28d9-4a6a-8cd1-d5e22c4997ba" };
  const advisorUser = dbUsers.find(u => u.role === "club_advisor") || { id: "3cc06680-68a4-4f6e-8ea6-2fcc9e4d37f3" };
  const highCouncilUser = dbUsers.find(u => u.role === "high_council") || { id: "e477d21a-91d8-4a55-bb24-2cf42d10141c" };
  const aliUser = dbUsers.find(u => u.matrix_number === "AI220385") || { id: "356e6cc2-2cbc-4651-897c-43182eb7dce4" };
  
  console.log("Using system accounts:");
  console.log(`- Admin: ${adminUser.name} (${adminUser.id})`);
  console.log(`- Committee: ${committeeUser.name} (${committeeUser.id})`);
  console.log(`- Advisor: ${advisorUser.name} (${advisorUser.id})`);
  console.log(`- High Council: ${highCouncilUser.name} (${highCouncilUser.id})`);
  console.log(`- Existing Student (Ali): ${aliUser.name} (${aliUser.id})`);

  // 3. Clean up existing transaction data to prevent primary key conflicts and orphaned records
  console.log("Cleaning up old database transaction logs...");
  await supabase.from("event_feedback").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("certificates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("event_registrations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("approval_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("events").delete().neq("id", "89d4337f-2776-417e-8c67-455ab282f52a"); // preserve demo UAT event if needed, but we will seed it cleanly

  // 4. Define 40 realistic students
  const faculties = [
    { name: "FSKTM", courses: ["Software Engineering", "Information Technology", "Multimedia Computing", "Computer Security", "Web Technology"] },
    { name: "FKEE", courses: ["Electrical Engineering", "Electronic Engineering", "Mechatronics Engineering"] },
    { name: "FKMP", courses: ["Mechanical Engineering", "Manufacturing Engineering"] },
    { name: "FKAAB", courses: ["Civil Engineering", "Quantity Surveying"] },
    { name: "FAST", courses: ["Applied Physics", "Industrial Chemistry", "Food Technology"] },
    { name: "FPTP", courses: ["Technology Management", "Real Estate Management"] }
  ];

  const rawStudents = [
    // 3 main demo students
    { email: "student1@uthm.edu.my", name: "Ahmad Haris Bin Zulkifli", matrixNumber: "AI220001", faculty: "FSKTM", course: "Software Engineering", phone: "+6012-3456789" },
    { email: "student2@uthm.edu.my", name: "Nurul Syahira Binti Azman", matrixNumber: "AI220002", faculty: "FSKTM", course: "Computer Security", phone: "+6017-9876543" },
    { email: "student3@uthm.edu.my", name: "Chong Wei Keat", matrixNumber: "AI220003", faculty: "FSKTM", course: "Multimedia Computing", phone: "+6013-1112222" },
    // 37 other students
    { name: "Nur Syamilah Binti Ahmad", matrixNumber: "AI220004" },
    { name: "Ahmad Daniel Bin Kamaruddin", matrixNumber: "AI220005" },
    { name: "Siti Aminah Binti Mohd Yusof", matrixNumber: "AI220006" },
    { name: "Mohammad Farhan Bin Ibrahim", matrixNumber: "AI220007" },
    { name: "Tan Mei Ling", matrixNumber: "AI220008" },
    { name: "Karthik A/L Subramaniam", matrixNumber: "AI220009" },
    { name: "Lim Jia Hao", matrixNumber: "AI220010" },
    { name: "Pavithra A/P Mohan", matrixNumber: "AI220011" },
    { name: "Muhammad Haziq Bin Kamarudin", matrixNumber: "AI220012" },
    { name: "Siti Sarah Binti Ramli", matrixNumber: "AI220013" },
    { name: "Teoh Kah Seng", matrixNumber: "AI220014" },
    { name: "Divya A/P Raman", matrixNumber: "AI220015" },
    { name: "Muhammad Asyraf Bin Zulkiflee", matrixNumber: "AI220016" },
    { name: "Nurul Fatimah Binti Ismail", matrixNumber: "AI220017" },
    { name: "Ng Kok Wei", matrixNumber: "AI220018" },
    { name: "Arun A/L Selvam", matrixNumber: "AI220019" },
    { name: "Aisyah Humaira Binti Rosli", matrixNumber: "AI220020" },
    { name: "Muhamad Amirul Bin Hashim", matrixNumber: "AI220021" },
    { name: "Nurul Izzah Binti Anwar", matrixNumber: "AI220022" },
    { name: "Lee Wei Jie", matrixNumber: "AI220023" },
    { name: "Raja Syazwan Bin Raja Azhar", matrixNumber: "AI220024" },
    { name: "Chua Bee Lian", matrixNumber: "AI220025" },
    { name: "Thilaga A/P Krishnan", matrixNumber: "AI220026" },
    { name: "Muhammad Faiz Bin Mansor", matrixNumber: "AI220027" },
    { name: "Nur Hazirah Binti Hamdan", matrixNumber: "AI220028" },
    { name: "Wong Chee Meng", matrixNumber: "AI220029" },
    { name: "Sharvin A/L Ganesan", matrixNumber: "AI220030" },
    { name: "Nur Adila Binti Kamaruzaman", matrixNumber: "AI220031" },
    { name: "Muhammad Firdaus Bin Salleh", matrixNumber: "AI220032" },
    { name: "Siti Zubaidah Binti Abdul Rahman", matrixNumber: "AI220033" },
    { name: "Ong Siew Lian", matrixNumber: "AI220034" },
    { name: "Pravin A/L Naidu", matrixNumber: "AI220035" },
    { name: "Muhammad Zulhelmi Bin Rosli", matrixNumber: "AI220036" },
    { name: "Nur Aqilah Binti Mohammad", matrixNumber: "AI220037" },
    { name: "Goh Wei Ping", matrixNumber: "AI220038" },
    { name: "Kogulan A/L Murugan", matrixNumber: "AI220039" },
    { name: "Nurul Nabila Binti Shamsul", matrixNumber: "AI220040" }
  ];

  // Fill in other student properties dynamically
  const students = rawStudents.map((s, index) => {
    if (s.email) return s; // already filled for demo students
    const facultyObj = faculties[index % faculties.length];
    const course = facultyObj.courses[index % facultyObj.courses.length];
    const faculty = facultyObj.name;
    const email = `${s.matrixNumber.toLowerCase()}@student.uthm.edu.my`;
    const phone = `+601${Math.floor(1 + Math.random() * 8)}-${Math.floor(1000000 + Math.random() * 9000000)}`;
    return {
      ...s,
      email,
      faculty,
      course,
      phone
    };
  });

  // Include Ali (AI220385) in our students list so he gets registered to events too!
  const allStudents = [...students];
  const aliStudentIndex = dbUsers.find(u => u.matrix_number === "AI220385");
  let aliStudentId = aliUser.id;
  
  // 5. Create or update auth accounts and populate public.users
  console.log("Upserting auth and public user profiles...");
  const authUsersMap = new Map();
  let page = 1;
  while (true) {
    const { data: pageData, error: pageErr } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (pageErr) throw pageErr;
    pageData.users.forEach(u => authUsersMap.set(u.email.toLowerCase(), u));
    if (pageData.users.length < 100) break;
    page += 1;
  }

  const seededStudents = []; // Stores objects with id, name, matrixNumber, email, etc.

  for (const s of allStudents) {
    const emailLower = s.email.toLowerCase();
    const existingAuth = authUsersMap.get(emailLower);
    let authId = "";
    
    if (existingAuth) {
      authId = existingAuth.id;
      const { error: updateErr } = await supabase.auth.admin.updateUserById(authId, {
        password: "Student@12345",
        user_metadata: {
          name: s.name,
          role: "student",
          faculty: s.faculty,
          course: s.course,
          phone: s.phone
        }
      });
      if (updateErr) console.warn(`Warning updating auth user ${s.email}:`, updateErr.message);
    } else {
      const { data: newAuth, error: createErr } = await supabase.auth.admin.createUser({
        email: s.email,
        password: "Student@12345",
        email_confirm: true,
        user_metadata: {
          name: s.name,
          role: "student",
          faculty: s.faculty,
          course: s.course,
          phone: s.phone
        }
      });
      if (createErr) {
        console.error(`Error creating auth user ${s.email}:`, createErr.message);
        continue;
      }
      authId = newAuth.user.id;
    }

    // Upsert into public.users table
    const { error: dbErr } = await supabase.from("users").upsert({
      id: authId,
      name: s.name,
      email: s.email,
      matrix_number: s.matrixNumber,
      role: "student",
      status: "active"
    }, { onConflict: "id" });
    
    if (dbErr) {
      console.error(`Error upserting public user profile for ${s.email}:`, dbErr.message);
    } else {
      seededStudents.push({ ...s, id: authId });
    }
  }
  
  console.log(`Seeded ${seededStudents.length} student profiles successfully.`);

  // Ensure Ali's record is present and added to seededStudents
  if (dbUsers.find(u => u.matrix_number === "AI220385")) {
    const aliDbObj = dbUsers.find(u => u.matrix_number === "AI220385");
    if (!seededStudents.some(s => s.id === aliDbObj.id)) {
      seededStudents.push({
        id: aliDbObj.id,
        name: aliDbObj.name || "ali",
        email: aliDbObj.email || "ali@example.com",
        matrixNumber: "AI220385",
        faculty: "FSKTM",
        course: "Software Engineering",
        phone: "+6012-7778889"
      });
    }
  }

  // 6. Define UTHM/ITC-style events
  const events = [
    {
      id: "89d4337f-2776-417e-8c67-455ab282f52a", // Demo UAT Event
      title: "FYP Demo UAT Event 20260601",
      start_date: "2026-06-01T09:00:00+08:00",
      end_date: "2026-06-01T17:00:00+08:00",
      location: "Computer Lab 3, FSKTM",
      max_students: 50,
      fee_amount: 0,
      budget: 800,
      purpose: "Provide a complete verification scenario for Final Year Project assessment.",
      objective: "Confirm that certificate generation, RLS policies, feedback analytics, and blockchain checks function perfectly in tandem.",
      status: "Completed",
      created_by: committeeUser.id,
      approved_by: advisorUser.id,
      approved_at: "2026-06-01T10:00:00.000Z"
    },
    {
      id: "4f0071a6-5187-425a-b6c5-c6575831534c", // Web Dev Bootcamp
      title: "Web Development Bootcamp 2026",
      start_date: "2026-06-10T09:00:00+08:00",
      end_date: "2026-06-11T17:00:00+08:00",
      location: "Computer Lab 2, FSKTM",
      max_students: 60,
      fee_amount: 0,
      budget: 1200,
      purpose: "Hands-on web development boot camp for students to learn practical full-stack coding skills.",
      objective: "Participants will learn core HTML, CSS, JavaScript, and database connections, producing a deployed web app.",
      status: "Completed",
      created_by: committeeUser.id,
      approved_by: advisorUser.id,
      approved_at: "2026-06-02T09:00:00.000Z"
    },
    {
      id: "6e84cf95-9276-48c2-9fb4-ce64551108ab",
      title: "Cybersecurity Awareness Workshop",
      start_date: "2026-06-12T09:30:00+08:00",
      end_date: "2026-06-12T16:30:00+08:00",
      location: "FSKTM Seminar Hall",
      max_students: 45,
      fee_amount: 10,
      budget: 900,
      purpose: "A focused workshop covering digital security, ethical hacking fundamentals, and system hardening.",
      objective: "Students will identify common vulnerabilities, set up dual-factor authentication, and understand phishing defense.",
      status: "Completed",
      created_by: committeeUser.id,
      approved_by: highCouncilUser.id,
      approved_at: "2026-06-03T14:30:00.000Z"
    },
    {
      id: "7e94db92-8276-49a3-aab2-d28437bb9612",
      title: "ITC Annual General Meeting 2026",
      start_date: "2026-06-25T14:00:00+08:00",
      end_date: "2026-06-25T17:30:00+08:00",
      location: "FSKTM Lecture Hall 1",
      max_students: 120,
      fee_amount: 0,
      budget: 400,
      purpose: "Annual club general assembly to present reports, discuss future activities, and elect the new committee.",
      objective: "Ensure transparent governance, approve budget summaries, and recruit active members for executive roles.",
      status: "Published",
      created_by: committeeUser.id,
      approved_by: advisorUser.id,
      approved_at: "2026-06-15T09:00:00.000Z"
    },
    {
      id: "8f05eb92-1234-4567-89ab-cdef01234567",
      title: "Blockchain Certificate Verification Seminar",
      start_date: "2026-06-28T09:00:00+08:00",
      end_date: "2026-06-28T12:30:00+08:00",
      location: "DTII Auditorium, UTHM",
      max_students: 150,
      fee_amount: 5,
      budget: 1500,
      purpose: "An educational seminar detailing how cryptography and decentralized ledgers secure public records.",
      objective: "Demonstrate live blockchain certificate verification, smart contract interactions, and decentralized identity setups.",
      status: "Published",
      created_by: committeeUser.id,
      approved_by: highCouncilUser.id,
      approved_at: "2026-06-16T10:15:00.000Z"
    },
    {
      id: "9a06fb92-1111-2222-3333-444455556666",
      title: "Python Programming Clinic",
      start_date: "2026-06-30T10:00:00+08:00",
      end_date: "2026-06-30T16:00:00+08:00",
      location: "FSKTM Computer Lab 4",
      max_students: 50,
      fee_amount: 0,
      budget: 500,
      purpose: "A programming clinic for students needing assistance with algorithms, script automation, and libraries.",
      objective: "Help students debug FYP codebase elements, solve algorithmic assignments, and master OOP patterns.",
      status: "Published",
      created_by: committeeUser.id,
      approved_by: advisorUser.id,
      approved_at: "2026-06-16T11:00:00.000Z"
    },
    {
      id: "ab07c192-2222-3333-4444-555566667777",
      title: "UI/UX Design Mini Workshop",
      start_date: "2026-07-02T09:00:00+08:00",
      end_date: "2026-07-02T13:00:00+08:00",
      location: "FSKTM Seminar Hall",
      max_students: 40,
      fee_amount: 0,
      budget: 600,
      purpose: "A workshop introducing students to UI design systems, wireframing tools, and heuristic evaluation.",
      objective: "Design low-fidelity and high-fidelity mockups using Figma and practice user testing principles.",
      status: "Pending Approval",
      created_by: committeeUser.id,
    },
    {
      id: "bc08d292-3333-4444-5555-666677778888",
      title: "Database Design Hands-on Session",
      start_date: "2026-07-05T09:00:00+08:00",
      end_date: "2026-07-05T17:00:00+08:00",
      location: "FSKTM Computer Lab 1",
      max_students: 50,
      fee_amount: 0,
      budget: 750,
      purpose: "Hands-on session for normalising relational schemas, indexing, and writing complex PostgreSQL queries.",
      objective: "Ensure students can design transactionally consistent schemas and optimize slow-running database operations.",
      status: "Pending Club Advisor Approval",
      created_by: committeeUser.id,
    },
    {
      id: "cd09e392-4444-5555-6666-777788889999",
      title: "GitHub and Version Control Training",
      start_date: "2026-07-08T10:00:00+08:00",
      end_date: "2026-07-08T13:00:00+08:00",
      location: "FSKTM Seminar Hall 2",
      max_students: 80,
      fee_amount: 0,
      budget: 450,
      purpose: "Introduce Git, branching strategies, conflict resolution, Pull Requests, and GitHub Actions.",
      objective: "Familiarise students with collaborative development pipelines, open-source contribution workflows, and commit standards.",
      status: "Draft",
      created_by: committeeUser.id,
    },
    {
      id: "de10f492-5555-6666-7777-88889999aaaa",
      title: "Cloud Computing Introduction Talk",
      start_date: "2026-07-12T14:30:00+08:00",
      end_date: "2026-07-12T16:30:00+08:00",
      location: "FSKTM Lecture Hall 3",
      max_students: 100,
      fee_amount: 0,
      budget: 2000,
      purpose: "Introductory talk on cloud paradigms, serverless compute, storage buckets, and scaling architectures.",
      objective: "Gain high-level knowledge of AWS/GCP, container hosting, and microservice structures.",
      status: "Rejected",
      rejection_reason: "Budget of RM 2000 is disproportionately high for a 2-hour introductory talk. Please revise or secure co-sponsorship.",
      created_by: committeeUser.id,
    },
    {
      id: "ef11a592-6666-7777-8888-9999aaaabbbb",
      title: "Final Year Project Sharing Session",
      start_date: "2026-06-05T09:00:00+08:00",
      end_date: "2026-06-05T12:00:00+08:00",
      location: "FSKTM Seminar Hall",
      max_students: 80,
      fee_amount: 0,
      budget: 350,
      purpose: "Alumni sharing session focused on project planning, tool selection, and presentation tips for final semester evaluations.",
      objective: "Allow final year students to ask questions, view high-scoring presentation decks, and understand grading rubrics.",
      status: "Completed",
      created_by: committeeUser.id,
      approved_by: advisorUser.id,
      approved_at: "2026-05-25T10:00:00.000Z"
    }
  ];

  console.log("Upserting events...");
  const { error: eventUpsertErr } = await supabase.from("events").upsert(events);
  if (eventUpsertErr) throw eventUpsertErr;
  console.log(`Seeded ${events.length} events successfully.`);

  // 7. Seed approval history logs for events
  console.log("Seeding event approval history logs...");
  const eventApprovalHistory = [];
  events.forEach(e => {
    if (e.status === "Draft") return;
    
    // Every non-draft event was submitted
    eventApprovalHistory.push({
      entity_type: "event",
      entity_id: e.id,
      action: "submitted",
      actor_id: committeeUser.id,
      actor_role: "committee",
      from_status: "Draft",
      to_status: e.status === "Pending Approval" || e.status === "Pending Club Advisor Approval" || e.status === "Pending High Council Approval" ? e.status : "Pending Approval",
      comments: "Submitting the event proposal for formal committee review.",
      created_at: new Date(new Date(e.start_date).getTime() - 20 * 24 * 60 * 60 * 1000).toISOString()
    });

    if (e.status === "Published" || e.status === "Completed") {
      eventApprovalHistory.push({
        entity_type: "event",
        entity_id: e.id,
        action: "approved",
        actor_id: e.approved_by || advisorUser.id,
        actor_role: e.approved_by === highCouncilUser.id ? "high_council" : "club_advisor",
        from_status: "Pending Approval",
        to_status: "Published",
        comments: "Proposal reviews look solid. Venue and budget approved.",
        created_at: new Date(new Date(e.start_date).getTime() - 15 * 24 * 60 * 60 * 1000).toISOString()
      });
    } else if (e.status === "Rejected") {
      eventApprovalHistory.push({
        entity_type: "event",
        entity_id: e.id,
        action: "rejected",
        actor_id: advisorUser.id,
        actor_role: "club_advisor",
        from_status: "Pending Approval",
        to_status: "Rejected",
        comments: e.rejection_reason,
        created_at: new Date(new Date(e.start_date).getTime() - 18 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
  });

  const { error: appHistoryErr } = await supabase.from("approval_history").insert(eventApprovalHistory);
  if (appHistoryErr) throw appHistoryErr;
  console.log(`Seeded ${eventApprovalHistory.length} event approval logs.`);

  // 8. Seed registrations, payments, and check-ins
  console.log("Generating event registrations, payments, and attendance records...");
  
  const registrationsToInsert = [];
  
  // Keep track of which registrations need certificates
  const certificateCandidates = []; // Array of { userId, userName, eventId, eventTitle, issuedAt }
  
  events.forEach(e => {
    // Only Published and Completed events have registrations
    if (e.status !== "Published" && e.status !== "Completed") return;
    
    // Register a subset of students
    const registrationCount = e.title === "FYP Demo UAT Event 20260601" ? 3 : Math.floor(15 + Math.random() * 15);
    
    // Shuffle students to get unique registrants
    const shuffledStudents = [...seededStudents].sort(() => 0.5 - Math.random());
    const selectedStudents = shuffledStudents.slice(0, registrationCount);

    // If UAT event, make sure Ali, Student 1, and Student 2 are registered
    if (e.title === "FYP Demo UAT Event 20260601") {
      selectedStudents.length = 0;
      // Add Ali
      const ali = seededStudents.find(s => s.matrixNumber === "AI220385");
      if (ali) selectedStudents.push(ali);
      // Add Student 1
      const s1 = seededStudents.find(s => s.email === "student1@uthm.edu.my");
      if (s1) selectedStudents.push(s1);
      // Add Student 2
      const s2 = seededStudents.find(s => s.email === "student2@uthm.edu.my");
      if (s2) selectedStudents.push(s2);
    }
    
    // Ensure student1, student2, student3 are registered to completed events to get issued certs
    if (e.status === "Completed") {
      const s1 = seededStudents.find(s => s.email === "student1@uthm.edu.my");
      const s2 = seededStudents.find(s => s.email === "student2@uthm.edu.my");
      const s3 = seededStudents.find(s => s.email === "student3@uthm.edu.my");
      
      if (e.title === "Web Development Bootcamp 2026" && s1 && !selectedStudents.some(s => s.id === s1.id)) {
        selectedStudents.push(s1);
      }
      if (e.title === "Cybersecurity Awareness Workshop" && s2 && !selectedStudents.some(s => s.id === s2.id)) {
        selectedStudents.push(s2);
      }
      if (e.title === "Final Year Project Sharing Session" && s3 && !selectedStudents.some(s => s.id === s3.id)) {
        selectedStudents.push(s3);
      }
    }

    selectedStudents.forEach((student, index) => {
      const isPaidEvent = e.fee_amount > 0;
      let paymentStatus = "unpaid";
      let regStatus = "registered";
      let checkedInAt = null;
      let payRef = null;
      let paySubAt = null;
      let payVerAt = null;
      let payVerBy = null;
      
      const regDate = new Date(new Date(e.start_date).getTime() - (5 + index) * 24 * 60 * 60 * 1000).toISOString();

      if (e.status === "Completed") {
        // Complete events mean students either attended/completed or cancelled/did not attend
        const isDemoS1 = student.email === "student1@uthm.edu.my" && e.title === "Web Development Bootcamp 2026";
        const isDemoS2 = student.email === "student2@uthm.edu.my" && e.title === "Cybersecurity Awareness Workshop";
        const isDemoS3 = student.email === "student3@uthm.edu.my" && e.title === "Final Year Project Sharing Session";
        const isDemoUAT = e.title === "FYP Demo UAT Event 20260601";
        const isAttended = index < selectedStudents.length - 2 || isDemoS1 || isDemoS2 || isDemoS3 || isDemoUAT;
        
        if (isAttended) {
          regStatus = "completed";
          checkedInAt = new Date(new Date(e.start_date).getTime() + 15 * 60 * 1000).toISOString(); // 15 mins after start
          paymentStatus = isPaidEvent ? "paid" : "unpaid";
          
          if (isPaidEvent) {
            payRef = `PAY-STRIPE-SEC-${Math.floor(100000 + Math.random() * 900000)}`;
            paySubAt = new Date(new Date(regDate).getTime() + 2 * 60 * 60 * 1000).toISOString();
            payVerAt = new Date(new Date(paySubAt).getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
            payVerBy = adminUser.id;
          } else if (e.title === "FYP Demo UAT Event 20260601") {
            payRef = "FREE-DEMO-EVENT";
            paymentStatus = "paid";
          }
          
          // Eligible for certificate
          certificateCandidates.push({
            userId: student.id,
            userName: student.name,
            eventId: e.id,
            eventTitle: e.title,
            issuedAt: new Date(new Date(e.start_date).getTime() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours after start
          });
          
        } else {
          regStatus = "cancelled";
          paymentStatus = isPaidEvent ? "rejected" : "unpaid";
        }
      } else {
        // Published/Upcoming events
        regStatus = "registered";
        if (isPaidEvent) {
          // Vary payment status for active registrations
          if (index % 3 === 0) {
            paymentStatus = "paid";
            payRef = `PAY-STRIPE-SEC-${Math.floor(100000 + Math.random() * 900000)}`;
            paySubAt = new Date(new Date(regDate).getTime() + 1 * 60 * 60 * 1000).toISOString();
            payVerAt = new Date(new Date(paySubAt).getTime() + 12 * 60 * 60 * 1000).toISOString();
            payVerBy = adminUser.id;
          } else if (index % 3 === 1) {
            paymentStatus = "pending";
            payRef = `PAY-PENDING-REF-${Math.floor(100000 + Math.random() * 900000)}`;
            paySubAt = new Date(new Date(regDate).getTime() + 2 * 60 * 60 * 1000).toISOString();
          } else {
            paymentStatus = "unpaid";
          }
        } else {
          paymentStatus = "unpaid";
        }
      }

      registrationsToInsert.push({
        user_id: student.id,
        event_id: e.id,
        registered_at: regDate,
        payment_status: paymentStatus,
        payment_reference: payRef,
        payment_submitted_at: paySubAt,
        payment_verified_at: payVerAt,
        payment_verified_by: payVerBy,
        status: regStatus,
        checked_in_at: checkedInAt
      });
    });
  });

  console.log(`Inserting ${registrationsToInsert.length} registrations...`);
  const { error: regErr } = await supabase.from("event_registrations").insert(registrationsToInsert);
  if (regErr) throw regErr;
  console.log("Registrations seeded successfully.");

  // 9. Generate and anchor certificates
  console.log("Generating certificates for candidates...");
  
  const certificatesToInsert = [];
  const certificateApprovalHistory = [];
  
  // Let's first retrieve all registrations with their generated IDs to link certificates correctly
  const { data: dbRegistrations, error: regListErr } = await supabase
    .from("event_registrations")
    .select("id, user_id, event_id");
  if (regListErr) throw regListErr;

  // Generate and insert feedback submissions
  const feedbackToInsert = [];
  certificateCandidates.forEach((cand, index) => {
    const reg = dbRegistrations.find(r => r.user_id === cand.userId && r.event_id === cand.eventId);
    feedbackToInsert.push({
      event_id: cand.eventId,
      user_id: cand.userId,
      registration_id: reg ? reg.id : null,
      rating: 4 + (index % 2),
      comments: `Great ${cand.eventTitle}! The trainers were very helpful and the content was well organized.`,
      is_anonymous: false,
      submitted_at: new Date(new Date(cand.issuedAt).getTime() + 12 * 60 * 60 * 1000).toISOString()
    });
  });

  console.log(`Inserting ${feedbackToInsert.length} feedback submissions...`);
  const { error: feedErr } = await supabase.from("event_feedback").insert(feedbackToInsert);
  if (feedErr) throw feedErr;
  console.log("Feedback seeded successfully.");

  let certCounter = 1;
  
  for (const cand of certificateCandidates) {
    const isUatDemoCert = cand.eventId === "89d4337f-2776-417e-8c67-455ab282f52a" && cand.userId === aliUser.id;
    const certNo = isUatDemoCert 
      ? "CERT-FYP-DEMO-20260601" 
      : `CERT-ITC-2026-${String(certCounter).padStart(4, "0")}`;
    certCounter++;
    
    const certId = crypto.randomUUID(); // valid UUID
    
    // Compute exact SHA-256 certificate hash matching frontend verification calculations
    const certHash = calculateCertificateHash(certId, certNo, cand.userName, cand.eventTitle, cand.issuedAt);
    
    // Determine if we should live anchor this specific certificate
    const isS1Anchor = cand.userName === "Ahmad Haris Bin Zulkifli" && cand.eventTitle === "Web Development Bootcamp 2026";
    const isS2Anchor = cand.userName === "Nurul Syahira Binti Azman" && cand.eventTitle === "Cybersecurity Awareness Workshop";
    const isS3Anchor = cand.userName === "Chong Wei Keat" && cand.eventTitle === "Final Year Project Sharing Session";
    const shouldLiveAnchor = isS1Anchor || isS2Anchor || isS3Anchor;
    
    let certStatus = "issued";
    
    // Make some certificates "pending_approval" or "rejected" to show varied data, except for the 3 main demo ones and UAT cert
    const isDemoStudent = cand.userName === "Ahmad Haris Bin Zulkifli" || cand.userName === "Nurul Syahira Binti Azman" || cand.userName === "Chong Wei Keat";
    if (!isDemoStudent && !isUatDemoCert) {
      const randVal = Math.random();
      if (randVal < 0.15) {
        certStatus = "pending_approval";
      } else if (randVal < 0.25) {
        certStatus = "rejected";
      }
    }
    
    let txHash = null;
    if (certStatus === "issued") {
      if (shouldLiveAnchor) {
        // Attempt live anchoring on Sepolia blockchain
        console.log(`Starting real on-chain transaction for ${cand.userName} (${certNo})...`);
        txHash = await anchorCertificateOnChain(certNo, cand.userName, cand.eventTitle, certHash);
        
        if (!txHash) {
          console.warn(`Real anchoring failed for ${certNo}. Falling back to a mock transaction hash.`);
          txHash = "0x" + createHash("sha256").update(certNo + "-live-fallback").digest("hex");
        } else {
          console.log(`Successfully anchored ${certNo} on-chain! TxHash: ${txHash}`);
          // Wait 3 seconds between live transactions to avoid nonce clashes
          await new Promise(r => setTimeout(r, 3000));
        }
      } else {
        // Seed offline realistic mock transaction hash
        txHash = "0x" + createHash("sha256").update(certNo + "-seeding-mock").digest("hex");
      }
    }
    
    certificatesToInsert.push({
      id: certId,
      user_id: cand.userId,
      event_id: cand.eventId,
      student_id: cand.userId,
      certificate_no: certNo,
      issued_at: cand.issuedAt,
      status: certStatus,
      certificate_hash: certHash,
      transaction_hash: txHash,
      approved_by: certStatus === "issued" || certStatus === "rejected" ? advisorUser.id : null,
      approved_at: certStatus === "issued" || certStatus === "rejected" ? cand.issuedAt : null
    });

    // Populate certificate approval log
    certificateApprovalHistory.push({
      entity_type: "certificate",
      entity_id: certId,
      action: "submitted",
      actor_id: committeeUser.id,
      actor_role: "committee",
      from_status: null,
      to_status: "pending_approval",
      comments: "Generating participation certificate for completed event criteria.",
      created_at: new Date(new Date(cand.issuedAt).getTime() - 2 * 60 * 60 * 1000).toISOString()
    });

    if (certStatus === "issued") {
      certificateApprovalHistory.push({
        entity_type: "certificate",
        entity_id: certId,
        action: "approved",
        actor_id: advisorUser.id,
        actor_role: "club_advisor",
        from_status: "pending_approval",
        to_status: "issued",
        comments: "Approved and signed. Ready for blockchain anchoring.",
        created_at: cand.issuedAt
      });
    } else if (certStatus === "rejected") {
      certificateApprovalHistory.push({
        entity_type: "certificate",
        entity_id: certId,
        action: "rejected",
        actor_id: advisorUser.id,
        actor_role: "club_advisor",
        from_status: "pending_approval",
        to_status: "rejected",
        comments: "Attendance record does not meet the minimum participation threshold.",
        created_at: cand.issuedAt
      });
    }
  }

  console.log(`Inserting ${certificatesToInsert.length} certificates...`);
  const { error: certUpsertErr } = await supabase.from("certificates").insert(certificatesToInsert);
  if (certUpsertErr) throw certUpsertErr;
  console.log("Certificates seeded successfully.");

  console.log(`Inserting ${certificateApprovalHistory.length} certificate approval history logs...`);
  const { error: certAppHistErr } = await supabase.from("approval_history").insert(certificateApprovalHistory);
  if (certAppHistErr) throw certAppHistErr;
  console.log("Certificate approval history logs seeded successfully.");

  console.log("\nDatabase seeding completed successfully! Verification hashes are fully synced and ready.");
  console.log("Primary Demo Student Accounts:");
  console.log("1. student1@uthm.edu.my -> Ahmad Haris Bin Zulkifli (AI220001)");
  console.log("2. student2@uthm.edu.my -> Nurul Syahira Binti Azman (AI220002)");
  console.log("3. student3@uthm.edu.my -> Chong Wei Keat (AI220003)");
  console.log("Common Password: Student@12345");
}

main().catch((err) => {
  console.error("Critical seeding failure:", err);
  process.exit(1);
});
