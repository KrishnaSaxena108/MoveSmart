import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  Shield,
  Truck,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  getAdminStats,
  getAllShipments,
  getPaymentDisputes,
  getPendingVerifications,
} from '@/lib/actions/admin'
import type { UserRole, VerificationStatus } from '@/lib/db/models/user'

interface AdminDashboardProps {
  user: {
    id: string
    name?: string | null
    role: UserRole
    verificationStatus: VerificationStatus
  }
}

function formatRelativeDate(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

function getShipmentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    open: 'Open',
    booked: 'Booked',
    picked_up: 'Picked up',
    in_transit: 'In transit',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }

  return labels[status] || status
}

function getShipmentStatusBadgeClass(status: string) {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-300 dark:border-emerald-800'
    case 'in_transit':
      return 'bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-300 dark:border-blue-800'
    case 'booked':
      return 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-300 dark:border-amber-800'
    case 'cancelled':
      return 'bg-rose-500/10 text-rose-700 border-rose-200 dark:text-rose-300 dark:border-rose-800'
    default:
      return 'bg-slate-500/10 text-slate-700 border-slate-200 dark:text-slate-300 dark:border-slate-700'
  }
}

export async function AdminDashboard({ user }: AdminDashboardProps) {
  const [statsResult, pendingResult, disputesResult, shipmentsResult] = await Promise.all([
    getAdminStats(),
    getPendingVerifications({ limit: 5 }),
    getPaymentDisputes({ limit: 5 }),
    getAllShipments({ limit: 6 }),
  ])

  const stats = statsResult.data || {
    totalUsers: 0,
    pendingVerifications: 0,
    activeShipments: 0,
    completedShipments: 0,
    totalRevenue: 0,
    recentDisputes: 0,
  }

  const pendingVerifications = pendingResult.data?.users || []
  const recentDisputes = disputesResult.data?.disputes || []
  const recentShipments = shipmentsResult.data?.shipments || []

  const completionRate =
    stats.activeShipments + stats.completedShipments > 0
      ? Math.round(
          (stats.completedShipments / (stats.activeShipments + stats.completedShipments)) * 100,
        )
      : 0

  const disputeRate =
    stats.completedShipments > 0
      ? Math.round((stats.recentDisputes / stats.completedShipments) * 100)
      : 0

  const verificationBacklog =
    stats.totalUsers > 0
      ? Math.min(100, Math.round((stats.pendingVerifications / stats.totalUsers) * 100))
      : 0

  const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })

  const numbers = new Intl.NumberFormat('en-US')

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-linear-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-10 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div className="space-y-3">
            <Badge className="bg-white/15 text-white hover:bg-white/15">Admin Control Center</Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Platform command deck</h1>
            <p className="max-w-2xl text-sm text-slate-200 sm:text-base">
              Welcome back{user.name ? `, ${user.name}` : ''}. Oversee users, shipments, verification risk,
              disputes, and platform revenue from one place.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild className="bg-white text-slate-900 hover:bg-slate-100">
                <Link href="/dashboard/admin/verifications">
                  Review verifications
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/40 text-white hover:bg-white/10">
                <Link href="/dashboard/admin/disputes">Resolve disputes</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-white/10 bg-white/5 text-white shadow-none backdrop-blur">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-slate-300">Platform Revenue</p>
                <p className="mt-1 text-2xl font-semibold">{currency.format(stats.totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/5 text-white shadow-none backdrop-blur">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-slate-300">Active Users</p>
                <p className="mt-1 text-2xl font-semibold">{numbers.format(stats.totalUsers)}</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/5 text-white shadow-none backdrop-blur sm:col-span-2">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                  <span>Verification backlog</span>
                  <span>{verificationBacklog}%</span>
                </div>
                <Progress value={verificationBacklog} className="h-2 bg-white/20" />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="relative overflow-hidden border-emerald-200 bg-linear-to-br from-emerald-50 via-emerald-50 to-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-900/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-emerald-400 to-teal-400" />
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-300">Completed Shipments</CardTitle>
              <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                {stats.completedShipments === 0 ? 'No completed loads yet' : 'Closed and delivered successfully'}
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-950/50">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold leading-none text-emerald-950 dark:text-emerald-200">{numbers.format(stats.completedShipments)}</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <span>Completion rate</span>
                <span className="font-semibold">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-1.5 bg-emerald-100 dark:bg-emerald-900/30 **:data-[slot=progress-indicator]:bg-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-blue-200 bg-linear-to-br from-blue-50 via-blue-50 to-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-blue-900/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-blue-400 to-cyan-400" />
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-300">Active Shipments</CardTitle>
              <p className="mt-1 text-xs text-blue-700/80 dark:text-blue-300/80">{numbers.format(stats.activeShipments)} live loads being tracked</p>
            </div>
            <span className="rounded-full bg-blue-100 p-2 dark:bg-blue-950/50">
              <Truck className="h-4 w-4 text-blue-700 dark:text-blue-300" />
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold leading-none text-blue-950 dark:text-blue-200">{numbers.format(stats.activeShipments)}</p>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
              </span>
              Fleet activity live
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-amber-200 bg-linear-to-br from-amber-50 via-amber-50 to-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-amber-900/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-amber-400 to-orange-400" />
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-300">Pending Verifications</CardTitle>
              <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
                {stats.pendingVerifications === 0 ? 'Verification inbox is clear' : 'Manual approvals waiting'}
              </p>
            </div>
            <span className="rounded-full bg-amber-100 p-2 dark:bg-amber-950/50">
              <Shield className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold leading-none text-amber-950 dark:text-amber-200">{numbers.format(stats.pendingVerifications)}</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                <span>Backlog pressure</span>
                <span className="font-semibold">{verificationBacklog}%</span>
              </div>
              <Progress value={verificationBacklog} className="h-1.5 bg-amber-100 dark:bg-amber-900/30 **:data-[slot=progress-indicator]:bg-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-rose-200 bg-linear-to-br from-rose-50 via-rose-50 to-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-rose-900/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-rose-400 to-pink-400" />
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-rose-900 dark:text-rose-300">Open Disputes</CardTitle>
              <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-300/80">
                {stats.recentDisputes === 0 ? 'No escalations right now' : 'Cases currently in escalation'}
              </p>
            </div>
            <span className="rounded-full bg-rose-100 p-2 dark:bg-rose-950/50">
              <AlertTriangle className="h-4 w-4 text-rose-700 dark:text-rose-300" />
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold leading-none text-rose-950 dark:text-rose-200">{numbers.format(stats.recentDisputes)}</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
                <span>Dispute rate</span>
                <span className="font-semibold">{disputeRate}%</span>
              </div>
              <Progress value={Math.min(disputeRate, 100)} className="h-1.5 bg-rose-100 dark:bg-rose-900/30 **:data-[slot=progress-indicator]:bg-rose-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Operations Pulse</CardTitle>
            <CardDescription>Critical indicators to prioritize this shift</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Shipment completion trend</span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <Progress value={completionRate} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Verification queue pressure</span>
                <span className="font-medium">{verificationBacklog}%</span>
              </div>
              <Progress value={verificationBacklog} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dispute exposure</span>
                <span className="font-medium">{disputeRate}%</span>
              </div>
              <Progress value={Math.min(disputeRate, 100)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild variant="outline" className="justify-between">
                <Link href="/dashboard/admin/shipments">
                  Shipment oversight
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between">
                <Link href="/dashboard/admin/payments">
                  Payments and revenue
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Action Center</CardTitle>
            <CardDescription>High-impact admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="ghost" className="w-full justify-between">
              <Link href="/dashboard/admin/verifications">
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Review verifications
                </span>
                <Badge variant="secondary">{numbers.format(stats.pendingVerifications)}</Badge>
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-between">
              <Link href="/dashboard/admin/disputes">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Resolve disputes
                </span>
                <Badge variant="destructive">{numbers.format(stats.recentDisputes)}</Badge>
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-between">
              <Link href="/dashboard/admin/users">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Manage users
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-between">
              <Link href="/dashboard/admin/shipments">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Track shipments
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Verification Queue</CardTitle>
              <CardDescription>Latest profiles waiting for admin approval</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/admin/verifications">View queue</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingVerifications.map((user) => (
                <div
                  key={user._id}
                  className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-medium">{user.name}</h4>
                      <Badge variant="secondary" className="capitalize">
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {formatRelativeDate(user.createdAt)}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                    <Link href="/dashboard/admin/verifications">Review request</Link>
                  </Button>
                </div>
              ))}
              {pendingVerifications.length === 0 && (
                <div className="rounded-xl border border-dashed p-6 text-center">
                  <p className="font-medium">No pending verifications</p>
                  <p className="text-sm text-muted-foreground">
                    New requests will appear here automatically.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Disputes</CardTitle>
              <CardDescription>Escalations that need attention</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/admin/disputes">Open disputes</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentDisputes.length > 0 ? (
              <div className="space-y-4">
                {recentDisputes.map((dispute) => (
                  <div key={dispute._id} className="space-y-3 rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{dispute.shipment.title || 'Shipment dispute'}</h4>
                      {dispute.status === 'disputed' ? (
                        <Badge variant="destructive">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Disputed
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="mr-1 h-3 w-3" />
                          {dispute.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">Amount: </span>
                        <span className="font-medium">{currency.format(dispute.amount)}</span>
                      </div>
                      <p className="text-muted-foreground">Filed {formatRelativeDate(dispute.createdAt)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Shipper: {dispute.shipper.name} | Carrier: {dispute.carrier.name}
                    </p>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/dashboard/admin/disputes">
                        Review Dispute
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
                <h3 className="font-medium">No open disputes</h3>
                <p className="text-sm text-muted-foreground">
                  Dispute activity is currently clear.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Shipments</CardTitle>
          <CardDescription>Most recent shipment activity across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentShipments.map((shipment) => (
              <div
                key={shipment._id}
                className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{shipment.pickup.city}, {shipment.pickup.state} to {shipment.delivery.city}, {shipment.delivery.state}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatRelativeDate(shipment.createdAt)}
                  </p>
                </div>
                <Badge variant="outline" className={getShipmentStatusBadgeClass(shipment.status)}>
                  {getShipmentStatusLabel(shipment.status)}
                </Badge>
              </div>
            ))}
            {recentShipments.length === 0 && (
              <div className="rounded-xl border border-dashed p-6 text-center">
                <p className="font-medium">No recent shipments to display</p>
                <p className="text-sm text-muted-foreground">
                  New shipment activity will populate this panel.
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/admin/shipments">
                Open shipment monitor
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
