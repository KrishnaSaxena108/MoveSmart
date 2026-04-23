import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Package, 
  PlusCircle, 
  Clock, 
  CheckCircle2,
  ArrowRight,
  DollarSign,
  Star
} from "lucide-react"
import type { UserRole, VerificationStatus } from "@/lib/db/models/user"
import { getShipperDashboardData } from "@/lib/actions/dashboard"
import { formatDistanceToNow } from "date-fns"

interface ShipperDashboardProps {
  user: {
    id: string
    name: string
    role: UserRole
    verificationStatus: VerificationStatus
  }
}

export async function ShipperDashboard({ user }: ShipperDashboardProps) {
  const isVerified = user.verificationStatus === "approved"
  const dashboardResult = await getShipperDashboardData(user.id)
  const stats = dashboardResult.success
    ? dashboardResult.data.stats
    : {
        activeShipments: 0,
        pendingQuotes: 0,
        totalShipments: 0,
        totalSaved: 0,
        averageRating: 0,
        totalReviews: 0,
      }
  const recentShipments = dashboardResult.success ? dashboardResult.data.recentShipments : []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">Open for Bids</Badge>
      case "booked":
        return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">Booked</Badge>
      case "in_transit":
        return <Badge className="bg-primary/10 text-primary hover:bg-primary/20">In Transit</Badge>
      case "delivered":
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Delivered</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your shipments
          </p>
        </div>
        {isVerified && (
          <Button asChild>
            <Link href="/dashboard/shipments/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Shipment
            </Link>
          </Button>
        )}
      </div>

      {/* Verification Banner */}
      {!isVerified && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Complete Your Verification</h3>
              <p className="text-sm text-muted-foreground">
                Upload required documents to start posting shipments
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/settings/verification">
                Complete Now
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Shipments
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeShipments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingQuotes} pending quotes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Shipments
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalShipments}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Saved
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalSaved.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              vs. market average
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rating
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              From {stats.totalReviews} reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Shipments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Shipments</CardTitle>
            <CardDescription>Your latest shipment listings</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/shipments">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentShipments.length > 0 ? (
            <div className="space-y-4">
              {recentShipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{shipment.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {shipment.from} to {shipment.to}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(shipment.status)}
                    {shipment.status === "open" && (
                      <Badge variant="secondary">{shipment.bids} bids</Badge>
                    )}
                    <span className="hidden text-xs text-muted-foreground md:inline">
                      {formatDistanceToNow(new Date(shipment.createdAt), { addSuffix: true })}
                    </span>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/dashboard/shipments/${shipment.id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="font-medium">No shipments yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first shipment to get started
              </p>
              {isVerified && (
                <Button asChild className="mt-4">
                  <Link href="/dashboard/shipments/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Shipment
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Tips</CardTitle>
          <CardDescription>Get the most out of MoveSmart</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <h4 className="font-medium">Add Photos</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Listings with photos get 3x more bids on average
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <h4 className="font-medium">Be Specific</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Detailed descriptions help carriers provide accurate quotes
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <h4 className="font-medium">Flexible Dates</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Wider pickup windows attract more competitive bids
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
