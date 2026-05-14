import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getBidsForShipment, getCarrierBids } from '@/lib/actions/bids'
import { getShipmentById } from '@/lib/actions/shipments'
import { ShipmentDetail } from '@/components/shipments/shipment-detail'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, DollarSign, Truck, Calendar, MapPin } from 'lucide-react'
import { format } from 'date-fns'

interface BidDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function BidDetailPage({ params }: BidDetailPageProps) {
  const { id } = await params
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/login')
  }

  // Get the carrier's bid
  const carrierBidsResult = await getCarrierBids(session.user.id)
  const userBids = carrierBidsResult.success ? carrierBidsResult.bids || [] : []

  // Find the specific bid
  const bid = userBids.find((b: any) => b._id === id)

  if (!bid || !bid.shipmentId) {
    notFound()
  }

  // Get the full shipment details
  const shipmentId = typeof bid.shipmentId === 'object' 
    ? bid.shipmentId._id?.toString() 
    : bid.shipmentId

  const shipmentResult = await getShipmentById(shipmentId)
  const shipment = (shipmentResult as { shipment?: any; data?: any }).shipment
    ?? (shipmentResult as { data?: unknown }).data

  if (!shipmentResult.success || !shipment) {
    notFound()
  }

  // Get all bids for this shipment for context
  const bidsResult = await getBidsForShipment(shipmentId)
  const allBids = bidsResult.success ? bidsResult.bids || [] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/bids">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Bid Details</h1>
          <p className="text-muted-foreground">Review your bid and shipment information</p>
        </div>
      </div>

      {/* Bid Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Your Bid Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-3xl font-bold">${Number(bid.amount || 0).toLocaleString()}</span>
            </div>
            <Badge variant="secondary" className="mt-2 capitalize">{bid.status}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bid Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${
                bid.status === 'accepted' ? 'bg-green-600' :
                bid.status === 'rejected' ? 'bg-red-600' :
                bid.status === 'pending' ? 'bg-yellow-600' :
                'bg-gray-600'
              }`} />
              <span className="text-sm font-medium capitalize">{bid.status}</span>
            </div>
            {bid.createdAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Placed {format(new Date(bid.createdAt), 'MMM d, yyyy')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Other Bids</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{allBids.length - 1}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Competing carriers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Shipment Route Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Route</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pickup */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-600" />
                <p className="font-semibold">Pickup Location</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-0" />
                  <div>
                    <p className="font-medium">
                      {shipment.pickup?.city || 'N/A'}, {shipment.pickup?.state || 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">{shipment.pickup?.address}</p>
                  </div>
                </div>
                {shipment.pickupDate && (
                  <div className="flex items-center gap-2 ml-6">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">
                      {format(new Date(shipment.pickupDate.earliest || shipment.pickupDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-600" />
                <p className="font-semibold">Delivery Location</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-0" />
                  <div>
                    <p className="font-medium">
                      {shipment.delivery?.city || 'N/A'}, {shipment.delivery?.state || 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">{shipment.delivery?.address}</p>
                  </div>
                </div>
                {shipment.deliveryDate && (
                  <div className="flex items-center gap-2 ml-6">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">
                      {format(new Date(shipment.deliveryDate.latest || shipment.deliveryDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipment Details - Reuse existing component */}
      <ShipmentDetail
        shipment={
          {
            ...shipment,
            title: shipment.title || shipment.items?.[0]?.description || 'Shipment',
            pricing: {
              ...shipment.pricing,
              instantPrice: shipment.pricing?.instantPrice ?? shipment.pricing?.fixedPrice,
            },
          } as any
        }
        bids={allBids.map((b: any) => ({
          ...b,
          carrier: b.carrier ?? { _id: b.carrierId },
        }))}
        isShipper={false}
        isCarrier={session.user.role === 'carrier'}
        isAdmin={session.user.role === 'admin'}
        currentUserId={session.user.id}
      />

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard/bids">Back to My Bids</Link>
        </Button>
        {bid.status === 'pending' && (
          <Button asChild>
            <Link href={`/dashboard/shipments/${shipmentId}`}>
              View Shipment & Track
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
