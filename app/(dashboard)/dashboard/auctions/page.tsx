import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { getLiveAuctionShipments } from "@/lib/actions/live-auction"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDistanceToNow, format } from "date-fns"
import { Gavel, MapPin, Clock, DollarSign } from "lucide-react"

export const metadata = {
  title: "Live Auctions",
}

export default async function LiveAuctionsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/auth/login")
  }

  const result = await getLiveAuctionShipments({ limit: 50 })
  const shipments = result.success ? result.shipments || [] : []

  const now = new Date()
  const activeAuctions = shipments.filter(
    (s: any) => s.liveAuction && new Date(s.liveAuction.endTime) > now
  )
  const completedAuctions = shipments.filter(
    (s: any) => s.liveAuction && new Date(s.liveAuction.endTime) <= now
  )

  const getAuctionStatus = (shipment: any) => {
    const now = new Date()
    const start = new Date(shipment.liveAuction?.startTime)
    const end = new Date(shipment.liveAuction?.endTime)
    const cooldownEnd = new Date(shipment.liveAuction?.cooldownEndTime)

    if (now < start) {
      const secsLeft = Math.floor((start.getTime() - now.getTime()) / 1000)
      return { status: "pending", text: `Starts in ${secsLeft}s`, color: "bg-slate-500/10" }
    } else if (now < end) {
      const secsLeft = Math.floor((end.getTime() - now.getTime()) / 1000)
      return { status: "active", text: `${secsLeft}s left`, color: "bg-green-500/10" }
    } else if (now < cooldownEnd) {
      return { status: "cooldown", text: "Selecting winner...", color: "bg-yellow-500/10" }
    } else {
      return { status: "completed", text: "Ended", color: "bg-blue-500/10" }
    }
  }

  const AuctionCard = ({ shipment }: { shipment: any }) => {
    const auctionStatus = getAuctionStatus(shipment)
    const lowestBid = shipment.bidCount > 0 ? shipment.liveAuction?.winningAmount : null
    const startTime = new Date(shipment.liveAuction?.startTime)
    const endTime = new Date(shipment.liveAuction?.endTime)

    return (
      <Link href={`/dashboard/shipments/${shipment._id}`}>
        <Card className={`cursor-pointer transition-all hover:shadow-md ${auctionStatus.color}`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{shipment.title}</CardTitle>
                <CardDescription className="mt-1">
                  {shipment.items?.[0]?.description}
                </CardDescription>
              </div>
              <Badge className={`${
                auctionStatus.status === "active" ? "bg-green-600" :
                auctionStatus.status === "pending" ? "bg-slate-600" :
                auctionStatus.status === "cooldown" ? "bg-yellow-600" :
                "bg-blue-600"
              }`}>
                {auctionStatus.text}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Route */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {shipment.pickup?.city}, {shipment.pickup?.state} →{" "}
                  {shipment.delivery?.city}, {shipment.delivery?.state}
                </span>
              </div>
            </div>

            {/* Time & Bids */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Auction Ends</p>
                <p className="font-medium">{format(endTime, "h:mm a")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(endTime, { addSuffix: true })}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">Bids</p>
                <p className="font-medium">{shipment.bidCount || 0} bid{shipment.bidCount !== 1 ? "s" : ""}</p>
                {lowestBid && (
                  <p className="text-xs text-green-600 font-medium mt-1">
                    ${lowestBid.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {/* Shipper Info */}
            {shipment.shipperId && (
              <div className="flex items-center gap-2 text-sm pt-2 border-t">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  {shipment.shipperId?.profileImage ? (
                    <img src={shipment.shipperId.profileImage} alt="" className="h-8 w-8 rounded-full" />
                  ) : (
                    <span className="text-xs font-medium">
                      {shipment.shipperId?.firstName?.[0]}{shipment.shipperId?.lastName?.[0]}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground">
                  {shipment.shipperId?.firstName} {shipment.shipperId?.lastName}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Gavel className="h-8 w-8" />
            Live Auctions
          </h1>
        </div>
        <p className="text-muted-foreground">
          Browse active auctions and bid on shipments in real-time
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Auctions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeAuctions.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{completedAuctions.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {shipments.reduce((sum: number, s: any) => sum + (s.bidCount || 0), 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Auctions Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeAuctions.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedAuctions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeAuctions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeAuctions.map((shipment: any) => (
                <AuctionCard key={shipment._id} shipment={shipment} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Gavel className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No active auctions</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Check back later for new live auctions
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedAuctions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedAuctions.map((shipment: any) => (
                <AuctionCard key={shipment._id} shipment={shipment} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Gavel className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No completed auctions</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
