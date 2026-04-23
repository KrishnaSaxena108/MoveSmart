import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ShipperDashboard } from "@/components/dashboard/shipper-dashboard"
import { CarrierDashboard } from "@/components/dashboard/carrier-dashboard"
import { AdminDashboard } from "@/components/dashboard/admin-dashboard"

export const metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/auth/login")
  }

  const { role } = session.user

  if (role === "admin") {
    return <AdminDashboard user={session.user} />
  }

  if (role === "carrier") {
    return <CarrierDashboard user={session.user} />
  }

  return <ShipperDashboard user={session.user} />
}
