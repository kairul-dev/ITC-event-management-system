import { redirect } from "next/navigation";

export default function PresidentLoginEntry() {
  redirect("/login?role=club_advisor");
}
