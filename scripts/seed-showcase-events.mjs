import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, "")];
    }),
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const events = [
  {
    title: "Web Development Bootcamp",
    start_date: "2026-06-22T09:00:00+08:00",
    end_date: "2026-06-22T17:00:00+08:00",
    location: "Computer Lab 3, FSKTM",
    max_students: 60,
    fee_amount: 0,
    budget: 1200,
    purpose:
      "Hands-on ITC bootcamp for students to build practical web development skills through guided exercises and a mini project.",
    objective:
      "Participants will learn core HTML, CSS, JavaScript, and deployment concepts, then produce a simple working web application.",
  },
  {
    title: "UI/UX Design Sprint",
    start_date: "2026-06-28T10:00:00+08:00",
    end_date: "2026-06-28T16:00:00+08:00",
    location: "Seminar Room, FSKTM",
    max_students: 45,
    fee_amount: 0,
    budget: 900,
    purpose:
      "A focused design sprint introducing students to user research, wireframing, prototyping, and interface critique.",
    objective:
      "Students will create a clickable prototype and practice presenting design decisions based on user needs.",
  },
  {
    title: "ITC Coding Challenge",
    start_date: "2026-07-05T08:30:00+08:00",
    end_date: "2026-07-05T13:00:00+08:00",
    location: "Main Hall, FSKTM",
    max_students: 100,
    fee_amount: 5,
    budget: 1500,
    purpose:
      "A friendly programming competition that encourages algorithmic thinking, teamwork, and problem-solving under time constraints.",
    objective:
      "Participants will solve structured coding problems, improve debugging confidence, and experience competition-style programming.",
  },
  {
    title: "Cybersecurity Awareness Talk",
    start_date: "2026-07-12T09:30:00+08:00",
    end_date: "2026-07-12T12:00:00+08:00",
    location: "Lecture Hall 1, FSKTM",
    max_students: 120,
    fee_amount: 0,
    budget: 700,
    purpose:
      "An awareness session covering everyday cybersecurity risks, account protection, phishing, and responsible digital behavior.",
    objective:
      "Students will understand common cyber threats and apply practical safety habits in academic and personal technology use.",
  },
  {
    title: "Tech Career Sharing Session",
    start_date: "2026-07-20T14:30:00+08:00",
    end_date: "2026-07-20T17:00:00+08:00",
    location: "Auditorium, FSKTM",
    max_students: 150,
    fee_amount: 0,
    budget: 1000,
    purpose:
      "A career-sharing program connecting students with technology practitioners and alumni from software, data, and security roles.",
    objective:
      "Students will learn about career paths, internship preparation, portfolio building, and industry expectations.",
  },
  {
    title: "Final Year Project Showcase",
    start_date: "2026-07-27T11:00:00+08:00",
    end_date: "2026-07-27T16:00:00+08:00",
    location: "Innovation Space, FSKTM",
    max_students: 80,
    fee_amount: 0,
    budget: 1300,
    purpose:
      "A showcase platform for students to present final year project ideas, prototypes, and implementation outcomes to peers.",
    objective:
      "Participants will exchange project feedback, discover implementation approaches, and build confidence presenting technical work.",
  },
];

const { data: existing, error: existingError } = await supabase
  .from("events")
  .select("title")
  .in(
    "title",
    events.map((event) => event.title),
  );

if (existingError) {
  throw existingError;
}

const existingTitles = new Set((existing || []).map((event) => event.title));
const eventsToInsert = events
  .filter((event) => !existingTitles.has(event.title))
  .map((event) => ({
    ...event,
    status: "approved",
    created_at: new Date().toISOString(),
  }));

if (eventsToInsert.length === 0) {
  console.log("No events inserted. Showcase events already exist.");
  process.exit(0);
}

const { error } = await supabase.from("events").insert(eventsToInsert);

if (error) {
  throw error;
}

console.log(`Inserted ${eventsToInsert.length} showcase event(s).`);
