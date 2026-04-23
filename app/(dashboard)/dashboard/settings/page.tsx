import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, Shield, SlidersHorizontal, UserCircle2 } from "lucide-react"

export default async function DashboardSettingsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/login")
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-linear-to-br from-background via-muted/30 to-background p-6 shadow-sm dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="space-y-4">
          <Badge className="bg-primary text-primary-foreground hover:bg-primary">Settings Control Panel</Badge>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Manage account preferences, verification status, and communication controls from one place.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-border bg-card/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Profile</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                  <UserCircle2 className="h-4 w-4 text-primary" />
                  Update identity and contact details
                </p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Security</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  Verification and trust status
                </p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Alerts</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Bell className="h-4 w-4 text-primary" />
                  Notification preferences
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Verification
            </CardTitle>
            <CardDescription>Review and manage your verification workflow.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/settings/verification">Open verification settings</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle2 className="h-4 w-4" />
              Profile
            </CardTitle>
            <CardDescription>Update your account details and profile visibility.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/profile">Go to profile</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="h-4 w-4" />
              Notifications
            </CardTitle>
            <CardDescription>Manage alert and communication preferences.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/notifications">Open notifications</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settings Guidance</CardTitle>
          <CardDescription>Recommended sequence to keep your account optimized</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Complete verification to unlock full marketplace features.</p>
          <p>2. Keep profile information up to date for trust and communication.</p>
          <p>3. Configure notifications so you never miss shipment or message updates.</p>
        </CardContent>
      </Card>
    </div>
  )
}
