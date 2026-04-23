import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { VerificationsList } from '@/components/admin/verifications-list'
import { getPendingVerifications } from '@/lib/actions/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default async function VerificationsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/login')
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const result = await getPendingVerifications()
  const data = result.data || { users: [], total: 0 }
  const pendingCount = data.total

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-primary text-primary-foreground hover:bg-primary">Admin Verification Desk</Badge>
            {pendingCount > 0 ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {pendingCount} pending reviews
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Queue is clear
              </Badge>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Verifications</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Review identity and compliance submissions, approve trusted users, and keep marketplace risk in check.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard/admin/users">Open user management</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/admin">Back to admin dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending Requests</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Review Mode</p>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Manual validation enabled
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">SLA Window</p>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock3 className="h-4 w-4 text-primary" />
              Prioritize oldest submissions first
            </p>
          </CardContent>
        </Card>
      </div>

      <VerificationsList
        initialUsers={data.users}
        totalCount={data.total}
      />
    </div>
  )
}
