import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminPaymentsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/auth/login")
  }
  if (session.user.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">Platform revenue and payout controls.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Payments dashboard</CardTitle>
          <CardDescription>
            Add billing, payout, and revenue management controls here.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This route exists so admin revenue links resolve.
        </CardContent>
      </Card>
    </div>
  )
}
