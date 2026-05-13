import { redirect } from "next/navigation";

export default function AdminLoginEntry() {
  redirect("/login?role=admin");
}
