import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { auth } from '@/lib/auth'
import { getAdminStats, getAllShipments } from '@/lib/actions/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Search, Truck } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{
    status?: string
    search?: string
    page?: string
  }>
}

function statusClass(status: string) {
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

function statusLabel(status: string) {
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

function pageHref(page: number, status?: string, search?: string) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (search) params.set('search', search)
  params.set('page', String(page))
  return `/dashboard/admin/shipments?${params.toString()}`
}

export default async function AdminShipmentsPage({ searchParams }: PageProps) {
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

  const [shipmentsResult, statsResult] = await Promise.all([
    getAllShipments({ status: params.status, search: params.search, limit, offset }),
    getAdminStats(),
  ])

  const shipmentsData = shipmentsResult.data || { shipments: [], total: 0 }
  const stats = statsResult.data || {
    totalUsers: 0,
    pendingVerifications: 0,
    activeShipments: 0,
    completedShipments: 0,
    totalRevenue: 0,
    recentDisputes: 0,
  }
  const totalPages = Math.max(1, Math.ceil(shipmentsData.total / limit))

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-linear-to-br from-background via-muted/30 to-background p-6 shadow-sm dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="space-y-4">
          <Badge className="bg-primary text-primary-foreground hover:bg-primary">Shipment Control Panel</Badge>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shipment Oversight</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Monitor active loads, investigate movement across lanes, and filter shipments by status and route text.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-border bg-card/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Active</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{stats.activeShipments.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{stats.completedShipments.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Results</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{shipmentsData.total.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form method="get" className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_auto_auto] md:items-end">
            <div className="space-y-1.5">
              <label htmlFor="search" className="text-xs font-medium text-muted-foreground">Search shipment title</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="search"
                  name="search"
                  defaultValue={params.search}
                  placeholder="Search title"
                  className="h-10 w-full rounded-md border bg-background pl-10 pr-3 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="status" className="text-xs font-medium text-muted-foreground">Status</label>
              <select id="status" name="status" defaultValue={params.status || ''} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">All statuses</option>
                <option value="open">Open</option>
                <option value="booked">Booked</option>
                <option value="picked_up">Picked up</option>
                <option value="in_transit">In transit</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <Button type="submit" className="h-10">
              <Package className="mr-2 h-4 w-4" />
              Apply
            </Button>
            <Button asChild type="button" variant="outline" className="h-10">
              <Link href="/dashboard/admin/shipments">Reset</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Shipments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {shipmentsData.shipments.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No shipments match your current filters.
            </div>
          ) : (
            shipmentsData.shipments.map((shipment) => (
              <div key={shipment._id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {shipment.pickup.city}, {shipment.pickup.state} to {shipment.delivery.city}, {shipment.delivery.state}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDistanceToNow(new Date(shipment.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={statusClass(shipment.status)}>
                    {statusLabel(shipment.status)}
                  </Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/admin">Dashboard</Link>
                  </Button>
                </div>
              </div>
            ))
          )}

          <div className="flex items-center justify-between pt-2 text-sm">
            <Link
              href={pageHref(Math.max(1, page - 1), params.status, params.search)}
              className={page <= 1 ? 'pointer-events-none text-muted-foreground/50' : 'text-primary hover:underline'}
            >
              Previous
            </Link>
            <span className="text-muted-foreground">Page {page} of {totalPages}</span>
            <Link
              href={pageHref(Math.min(totalPages, page + 1), params.status, params.search)}
              className={page >= totalPages ? 'pointer-events-none text-muted-foreground/50' : 'text-primary hover:underline'}
            >
              Next
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/70">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">Need to investigate payment-related shipment issues?</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/admin/disputes">
              <Truck className="mr-2 h-4 w-4" />
              Open disputes queue
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
