import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCarrierBids } from "@/lib/actions/bids"
import { formatDistanceToNow } from "date-fns"

export default async function BidsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/auth/login")
  }

  const bidsResult = await getCarrierBids(session.user.id)
  const bids = bidsResult.success ? bidsResult.bids : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Bids</h1>
        <p className="text-muted-foreground">Review bids you placed on active shipments.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bid Activity</CardTitle>
          <CardDescription>{bids.length} bids fetched from your account history.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {bids.length > 0 ? (
            bids.map((bid: any) => (
              <div key={bid._id} className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/80 p-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {bid.shipmentId?.items?.[0]?.description || "Shipment"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {bid.shipmentId?.pickup?.city || "-"}, {bid.shipmentId?.pickup?.state || "-"} to {bid.shipmentId?.delivery?.city || "-"}, {bid.shipmentId?.delivery?.state || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(bid.updatedAt || bid.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">{bid.status}</Badge>
                  <Badge variant="outline">${Number(bid.amount || 0).toLocaleString()}</Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={bid.shipmentId?._id ? `/dashboard/shipments/${bid.shipmentId._id}` : "/dashboard/loads"}>
                      View
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No bids found in the database for your account yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
