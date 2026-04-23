import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { UsersTable } from '@/components/admin/users-table'
import { getAdminStats, getUsers } from '@/lib/actions/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Search, Shield, Users, X } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{
    role?: string
    status?: string
    search?: string
    page?: string
  }>
}

export default async function UsersPage({ searchParams }: PageProps) {
  const session = await auth()
  const params = await searchParams

  if (!session?.user) {
    redirect('/auth/login')
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const page = parseInt(params.page || '1')
  const limit = 20
  const offset = (page - 1) * limit

  const result = await getUsers({
    role: params.role,
    status: params.status,
    search: params.search,
    limit,
    offset,
  })
  const statsResult = await getAdminStats()

  const data = result.data || { users: [], total: 0 }
  const stats = statsResult.data || {
    totalUsers: 0,
    pendingVerifications: 0,
    activeShipments: 0,
    completedShipments: 0,
    totalRevenue: 0,
    recentDisputes: 0,
  }
  const hasActiveFilters = Boolean(params.role || params.status || params.search)

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-linear-to-br from-background via-muted/30 to-background p-6 shadow-sm dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-primary text-primary-foreground hover:bg-primary">Admin User Control</Badge>
            {hasActiveFilters && <Badge variant="secondary">Filters active</Badge>}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Monitor users across roles, filter by verification state, and quickly navigate risk-related accounts.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-border bg-card/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Users</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{stats.totalUsers.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/70">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending Verifications</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{stats.pendingVerifications.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/70">
              <CardContent className="flex h-full items-center justify-between p-4">
                <span className="text-sm font-medium text-foreground">Go to verification queue</span>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/admin/verifications">Open</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form method="get" className="grid gap-3 md:grid-cols-[1.4fr_0.7fr_0.7fr_auto_auto] md:items-end">
            <div className="space-y-1.5">
              <label htmlFor="search" className="text-xs font-medium text-muted-foreground">
                Search users
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="search"
                  name="search"
                  defaultValue={params.search}
                  placeholder="Name or email"
                  className="h-10 w-full rounded-md border bg-background pl-10 pr-3 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="role" className="text-xs font-medium text-muted-foreground">
                Role
              </label>
              <select id="role" name="role" defaultValue={params.role || ''} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">All roles</option>
                <option value="shipper">Shipper</option>
                <option value="carrier">Carrier</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="status" className="text-xs font-medium text-muted-foreground">
                Verification
              </label>
              <select id="status" name="status" defaultValue={params.status || ''} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">All statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <Button type="submit" className="h-10">
              <Users className="mr-2 h-4 w-4" />
              Apply filters
            </Button>
            <Button asChild type="button" variant="outline" className="h-10">
              <Link href="/dashboard/admin/users">
                <X className="mr-2 h-4 w-4" />
                Clear
              </Link>
            </Button>
          </form>
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Active filters:</span>
              {params.search && <Badge variant="secondary">Search: {params.search}</Badge>}
              {params.role && <Badge variant="secondary">Role: {params.role}</Badge>}
              {params.status && <Badge variant="secondary">Status: {params.status}</Badge>}
              <Shield className="h-3.5 w-3.5" />
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <p className="text-sm text-muted-foreground">Showing {data.users.length} records out of {data.total} matching users.</p>
      </div>

      <UsersTable
        users={data.users}
        totalCount={data.total}
        currentPage={page}
        pageSize={limit}
        filters={{
          role: params.role,
          status: params.status,
          search: params.search,
        }}
      />
    </div>
  )
}
