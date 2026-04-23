import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { auth } from '@/lib/auth'
import { getAdminStats, getPaymentDisputes } from '@/lib/actions/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Gavel, Scale, ShieldAlert } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{
    page?: string
  }>
}

function pageHref(page: number) {
  return `/dashboard/admin/disputes?page=${page}`
}

export default async function AdminDisputesPage({ searchParams }: PageProps) {
  const session = await auth()
  const params = await searchParams

  if (!session?.user) {
    redirect('/auth/login')
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const page = Math.max(1, Number.parseInt(params.page || '1', 10) || 1)
  const limit = 20
  const offset = (page - 1) * limit

  const [disputesResult, statsResult] = await Promise.all([
    getPaymentDisputes({ limit, offset }),
    getAdminStats(),
  ])

  const disputesData = disputesResult.data || { disputes: [], total: 0 }
  const stats = statsResult.data || {
    totalUsers: 0,
    pendingVerifications: 0,
    activeShipments: 0,
    completedShipments: 0,
    totalRevenue: 0,
    recentDisputes: 0,
  }
  const totalPages = Math.max(1, Math.ceil(disputesData.total / limit))

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-linear-to-br from-background via-muted/30 to-background p-6 shadow-sm dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground hover:bg-primary">Dispute Command Center</Badge>
            <Badge variant="destructive">{stats.recentDisputes} active</Badge>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dispute Resolution</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Review payment disputes, understand exposure, and route escalations to the right operational channel.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-border bg-card/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Open disputes</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{disputesData.total.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Escalation risk</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  Requires manual admin judgment
                </p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Throughput</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Gavel className="h-4 w-4 text-primary" />
                  Track and close cases quickly
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Dispute Cases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {disputesData.disputes.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No disputed payments found.
            </div>
          ) : (
            disputesData.disputes.map((dispute) => (
              <div key={dispute._id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{dispute.shipment.title || 'Shipment dispute'}</p>
                    <p className="text-xs text-muted-foreground">
                      Filed {formatDistanceToNow(new Date(dispute.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="destructive">{dispute.status}</Badge>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <div>Shipper: <span className="font-medium text-foreground">{dispute.shipper.name}</span></div>
                  <div>Carrier: <span className="font-medium text-foreground">{dispute.carrier.name}</span></div>
                  <div>Amount: <span className="font-medium text-foreground">${dispute.amount.toLocaleString()}</span></div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/messages">
                      <Scale className="mr-2 h-4 w-4" />
                      Contact parties
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/admin/shipments">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Open shipment monitor
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}

          <div className="flex items-center justify-between pt-2 text-sm">
            <Link
              href={pageHref(Math.max(1, page - 1))}
              className={page <= 1 ? 'pointer-events-none text-muted-foreground/50' : 'text-primary hover:underline'}
            >
              Previous
            </Link>
            <span className="text-muted-foreground">Page {page} of {totalPages}</span>
            <Link
              href={pageHref(Math.min(totalPages, page + 1))}
              className={page >= totalPages ? 'pointer-events-none text-muted-foreground/50' : 'text-primary hover:underline'}
            >
              Next
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
