import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Truck, 
  Search, 
  DollarSign, 
  Clock, 
  CheckCircle2,
  MapPin,
  ArrowRight,
  Star,
  Route,
} from "lucide-react"
import type { UserRole, VerificationStatus } from "@/lib/db/models/user"
import { getCarrierDashboardData } from "@/lib/actions/dashboard"

interface CarrierDashboardProps {
  user: {
    id: string
    name: string
    role: UserRole
    verificationStatus: VerificationStatus
  }
}

export async function CarrierDashboard({ user }: CarrierDashboardProps) {
  const isVerified = user.verificationStatus === "approved"
  const dashboardResult = await getCarrierDashboardData(user.id)

  if (!dashboardResult.success || !dashboardResult.data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Carrier Dashboard</h1>
          <p className="text-muted-foreground">Unable to load your live dashboard data right now.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Database Data Unavailable</CardTitle>
            <CardDescription>
              Carrier analytics are rendered only from database records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/load-board">
                <Search className="mr-2 h-4 w-4" />
                Open Load Board
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = dashboardResult.data.stats
  const nearbyLoads = dashboardResult.data.nearbyLoads
  const activeBids = dashboardResult.data.activeBids

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            Find loads and grow your business
          </p>
        </div>
        {isVerified && (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/loads/route">
                <Route className="mr-2 h-4 w-4" />
                Route Search
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/loads">
                <Search className="mr-2 h-4 w-4" />
                Find Loads
              </Link>
            </Button>
          </div>
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
                Upload your license, insurance, and vehicle registration to start bidding
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Jobs
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeJobs}</div>
            <p className="text-xs text-muted-foreground">
              In progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Bids
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingBids}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Jobs
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedJobs}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime deliveries
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Earnings
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total released payouts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rating
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating}</div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < Math.floor(stats.averageRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Nearby Loads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Nearby Loads</CardTitle>
              <CardDescription>Shipments in your area</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/loads">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nearbyLoads.map((load) => (
                <div
                  key={load.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{load.title}</h4>
                      {load.instant && (
                        <Badge className="bg-amber-500/10 text-amber-600">Instant</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {load.from} to {load.to}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{load.weight} kg</span>
                      <span>{load.bids} bids</span>
                      <span className="font-medium text-foreground">${load.budget.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/dashboard/loads/${load.id}`}>
                      {load.instant ? "Accept" : "Bid"}
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Bids */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Bids</CardTitle>
              <CardDescription>Your pending quotes</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/bids">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activeBids.length > 0 ? (
              <div className="space-y-4">
                {activeBids.map((bid) => (
                  <div
                    key={bid.id}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{bid.title}</h4>
                      {bid.status === "pending" ? (
                        <Badge variant="secondary">Pending</Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-600">Counter Offer</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <span className="text-sm text-muted-foreground">Your bid: </span>
                        <span className="font-medium">${bid.yourBid.toLocaleString()}</span>
                      </div>
                      {bid.status === "countered" && (
                        <div>
                          <span className="text-sm text-muted-foreground">Counter: </span>
                          <span className="font-medium text-primary">${bid.counterOffer?.toLocaleString() || 0}</span>
                        </div>
                      )}
                    </div>
                    {bid.competingBids && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {bid.competingBids} other bids
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      {bid.status === "countered" ? (
                        <>
                          <Button size="sm">Accept Counter</Button>
                          <Button size="sm" variant="outline">Counter</Button>
                        </>
                      ) : (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/bids/${bid.id}`}>View Details</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <DollarSign className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="font-medium">No active bids</h3>
                <p className="text-sm text-muted-foreground">
                  Start bidding on loads to grow your business
                </p>
                {isVerified && (
                  <Button asChild className="mt-4">
                    <Link href="/dashboard/loads">
                      <Search className="mr-2 h-4 w-4" />
                      Find Loads
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Tips for Success</CardTitle>
          <CardDescription>Maximize your earnings on MoveSmart</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <h4 className="font-medium">Route Search</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Find loads along your planned route to minimize deadhead miles
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <h4 className="font-medium">Quick Response</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Respond quickly to messages to improve your response rate
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <h4 className="font-medium">Quality Service</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Maintain a high rating to win more competitive bids
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
