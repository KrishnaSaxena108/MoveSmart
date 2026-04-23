import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getShipments } from '@/lib/actions/shipments'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Package,
  Plus,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  ChevronRight,
  Truck,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

export const metadata = {
  title: 'My Shipments',
}

export default async function ShipmentsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/login')
  }

  const isShipper = session.user.role === 'shipper' || session.user.role === 'admin'
  
  const result = await getShipments({
    shipperId: isShipper ? session.user.id : undefined,
    limit: 50,
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'open':
        return <Badge className="bg-success text-success-foreground">Open</Badge>
      case 'booked':
        return <Badge className="bg-primary text-primary-foreground">Booked</Badge>
      case 'picked_up':
        return <Badge className="bg-accent text-accent-foreground">Picked Up</Badge>
      case 'in_transit':
        return <Badge className="bg-accent text-accent-foreground">In Transit</Badge>
      case 'delivered':
        return <Badge className="bg-success text-success-foreground">Delivered</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  interface Shipment {
    _id: string
    title: string
    pickup: { city: string; state: string }
    delivery: { city: string; state: string }
    pickupDate: { earliest: string | Date }
    status: string
    listingType: string
    pricing: { budget?: number; instantPrice?: number }
    bidsCount?: number
    distance?: number
    createdAt: string | Date
  }

  const rawShipments = result.success ? result.shipments || [] : []
  const shipments: Shipment[] = rawShipments.map((shipment: any) => {
    const itemSummary = shipment.items?.[0]?.description || 'Shipment'
    const pickupStart = shipment.pickup?.dateWindow?.start || shipment.createdAt || new Date().toISOString()

    return {
      _id: shipment._id,
      title: shipment.title || itemSummary,
      pickup: {
        city: shipment.pickup?.city || 'Unknown',
        state: shipment.pickup?.state || '',
      },
      delivery: {
        city: shipment.delivery?.city || 'Unknown',
        state: shipment.delivery?.state || '',
      },
      pickupDate: {
        earliest: pickupStart,
      },
      status: shipment.status || 'draft',
      listingType: shipment.listingType || 'auction',
      pricing: {
        budget: shipment.pricing?.budget,
        instantPrice: shipment.pricing?.fixedPrice,
      },
      bidsCount: shipment.bidCount,
      distance: shipment.distance,
      createdAt: shipment.createdAt,
    }
  })

  const activeShipments = shipments.filter((s) =>
    ['open', 'booked', 'picked_up', 'in_transit'].includes(s.status)
  )
  const completedShipments = shipments.filter((s) => s.status === 'delivered')
  const draftShipments = shipments.filter((s) => s.status === 'draft')

  const ShipmentCard = ({ shipment }: { shipment: Shipment }) => (
    <Link href={`/dashboard/shipments/${shipment._id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{shipment.title}</h3>
                {getStatusBadge(shipment.status)}
                {shipment.listingType === 'instant' && (
                  <Badge variant="outline" className="text-accent">Instant</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {shipment.pickup.city}, {shipment.pickup.state}
                </span>
                <ChevronRight className="h-4 w-4" />
                <span>
                  {shipment.delivery.city}, {shipment.delivery.state}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(shipment.pickupDate.earliest), 'MMM d, yyyy')}
                </span>
                {shipment.pricing.budget !== undefined && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    ${shipment.pricing.budget}
                  </span>
                )}
                {shipment.pricing.instantPrice && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    ${shipment.pricing.instantPrice}
                  </span>
                )}
                {shipment.distance && (
                  <span className="flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    {shipment.distance.toFixed(0)} mi
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              {shipment.bidsCount !== undefined && shipment.bidsCount > 0 && (
                <div className="text-sm">
                  <span className="font-semibold text-primary">{shipment.bidsCount}</span>
                  <span className="text-muted-foreground"> bids</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(shipment.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )

  const EmptyState = ({ title, description }: { title: string; description: string }) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-center mb-4">{description}</p>
        {isShipper && (
          <Button asChild>
            <Link href="/dashboard/shipments/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Shipment
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Shipments</h1>
          <p className="text-muted-foreground">
            Manage and track all your shipments
          </p>
        </div>
        {isShipper && (
          <Button asChild>
            <Link href="/dashboard/shipments/new">
              <Plus className="h-4 w-4 mr-2" />
              New Shipment
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Active ({activeShipments.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Completed ({completedShipments.length})
          </TabsTrigger>
          {draftShipments.length > 0 && (
            <TabsTrigger value="drafts" className="flex items-center gap-2">
              Drafts ({draftShipments.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeShipments.length === 0 ? (
            <EmptyState
              title="No Active Shipments"
              description="You don't have any active shipments at the moment."
            />
          ) : (
            activeShipments.map((shipment: Shipment) => (
              <ShipmentCard key={shipment._id} shipment={shipment} />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {completedShipments.length === 0 ? (
            <EmptyState
              title="No Completed Shipments"
              description="Your completed shipments will appear here."
            />
          ) : (
            completedShipments.map((shipment: Shipment) => (
              <ShipmentCard key={shipment._id} shipment={shipment} />
            ))
          )}
        </TabsContent>

        {draftShipments.length > 0 && (
          <TabsContent value="drafts" className="space-y-4 mt-4">
            {draftShipments.map((shipment: Shipment) => (
              <ShipmentCard key={shipment._id} shipment={shipment} />
            ))}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
