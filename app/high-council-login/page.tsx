import { redirect } from "next/navigation";

export default function HighCouncilLoginEntry() {
  redirect("/login?role=high_council");
}
