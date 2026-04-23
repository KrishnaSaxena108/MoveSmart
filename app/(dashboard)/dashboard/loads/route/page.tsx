import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function LoadsRoutePage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/auth/login")
  }

  redirect("/dashboard/load-board")
}
