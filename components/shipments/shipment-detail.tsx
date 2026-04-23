"use client"

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  MapPin,
  Calendar,
  Package,
  Weight,
  Ruler,
  DollarSign,
  Clock,
  Truck,
  Star,
  AlertTriangle,
  ArrowLeft,
  MessageSquare,
  Share2,
  Heart,
  Shield,
  Zap,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { BidForm } from '@/components/bids/bid-form'
import { BidsList } from '@/components/bids/bids-list'
import { acceptInstantBooking } from '@/lib/actions/bids'
import { toast } from 'sonner'

interface ShipmentDetailProps {
  shipment: {
    _id: string
    title: string
    description?: string
    pickup: {
      address: string
      city: string
      state: string
      zipCode: string
      country: string
      coordinates?: { lat: number; lng: number }
      contactName?: string
      contactPhone?: string
      instructions?: string
    }
    delivery: {
      address: string
      city: string
      state: string
      zipCode: string
      country: string
      coordinates?: { lat: number; lng: number }
      contactName?: string
      contactPhone?: string
      instructions?: string
    }
    items: Array<{
      description: string
      quantity: number
      weight?: number
      weightUnit?: string
      dimensions?: { length: number; width: number; height: number; unit: string }
      category: string
      specialHandling?: string[]
      photos?: string[]
    }>
    pickupDate: {
      earliest: Date
      latest: Date
      flexible: boolean
    }
    deliveryDate?: {
      earliest: Date
      latest: Date
    }
    listingType: 'standard' | 'instant'
    pricing: {
      suggestedPrice?: number
      minimumBid?: number
      instantPrice?: number
      budget?: { min: number; max: number }
    }
    distance?: number
    estimatedDuration?: string
    status: string
    shipper: {
      _id: string
      name: string
      email: string
      image?: string
      rating?: number
      completedShipments?: number
      isVerified?: boolean
    }
    photos?: string[]
    createdAt: Date
    expiresAt?: Date
  }
  bids: Array<{
    _id: string
    carrier: {
      _id: string
      name: string
      email: string
      image?: string
      rating?: number
      completedShipments?: number
      isVerified?: boolean
    }
    amount: number
    notes?: string
    estimatedPickup: Date
    estimatedDelivery: Date
    validUntil: Date
    status: string
    counterOffer?: {
      amount: number
      message?: string
      createdAt: Date
    }
    createdAt: Date
  }>
  isShipper: boolean
  isCarrier: boolean
  isAdmin: boolean
  existingBid?: {
    _id: string
    amount: number
    status: string
  } | null
  currentUserId: string
}

export function ShipmentDetail({
  shipment,
  bids,
  isShipper,
  isCarrier,
  isAdmin,
  existingBid,
}: ShipmentDetailProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('details')
  const [isAcceptingInstant, startAcceptingInstant] = useTransition()

  const handleAcceptInstant = () => {
    startAcceptingInstant(async () => {
      const result = await acceptInstantBooking(shipment._id)
      if (!result.success) {
        toast.error(result.error || 'Failed to accept instant delivery')
        return
      }

      toast.success(result.message || 'Instant delivery accepted')
      router.refresh()
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'open':
        return <Badge className="bg-success text-success-foreground">Open for Bids</Badge>
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

  const totalWeight = shipment.items.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0)
  const totalItems = shipment.items.reduce((sum, item) => sum + item.quantity, 0)
  const lowestBid = bids.length > 0 ? Math.min(...bids.map((b) => b.amount)) : null
  const pendingBids = bids.filter((b) => b.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{shipment.title}</h1>
            {getStatusBadge(shipment.status)}
            {shipment.listingType === 'instant' && (
              <Badge className="bg-accent text-accent-foreground">
                <Zap className="h-3 w-3 mr-1" />
                Instant
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Posted {formatDistanceToNow(new Date(shipment.createdAt), { addSuffix: true })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Heart className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route Overview */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Pickup */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <div className="h-3 w-3 rounded-full bg-success" />
                    PICKUP
                  </div>
                  <h3 className="font-semibold text-lg">
                    {shipment.pickup.city}, {shipment.pickup.state}
                  </h3>
                  <p className="text-muted-foreground text-sm">{shipment.pickup.address}</p>
                  <p className="text-muted-foreground text-sm">
                    {shipment.pickup.zipCode}, {shipment.pickup.country}
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(shipment.pickupDate.earliest), 'MMM d')}
                      {shipment.pickupDate.latest &&
                        ` - ${format(new Date(shipment.pickupDate.latest), 'MMM d, yyyy')}`}
                    </span>
                    {shipment.pickupDate.flexible && (
                      <Badge variant="outline" className="text-xs">Flexible</Badge>
                    )}
                  </div>
                </div>

                {/* Divider with distance */}
                <div className="flex md:flex-col items-center justify-center gap-2 py-4 md:py-0">
                  <Separator className="flex-1 md:hidden" />
                  <div className="flex md:flex-col items-center gap-2 px-4">
                    {shipment.distance && (
                      <span className="text-sm font-medium whitespace-nowrap">
                        {shipment.distance.toFixed(0)} mi
                      </span>
                    )}
                    <Truck className="h-5 w-5 text-muted-foreground" />
                    {shipment.estimatedDuration && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        ~{shipment.estimatedDuration}
                      </span>
                    )}
                  </div>
                  <Separator className="flex-1 md:hidden" />
                </div>

                {/* Delivery */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <div className="h-3 w-3 rounded-full bg-destructive" />
                    DELIVERY
                  </div>
                  <h3 className="font-semibold text-lg">
                    {shipment.delivery.city}, {shipment.delivery.state}
                  </h3>
                  <p className="text-muted-foreground text-sm">{shipment.delivery.address}</p>
                  <p className="text-muted-foreground text-sm">
                    {shipment.delivery.zipCode}, {shipment.delivery.country}
                  </p>
                  {shipment.deliveryDate && (
                    <div className="flex items-center gap-2 mt-3 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        By {format(new Date(shipment.deliveryDate.latest), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Item Details</TabsTrigger>
              <TabsTrigger value="bids">
                Bids ({pendingBids.length})
              </TabsTrigger>
              <TabsTrigger value="shipper">Shipper</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              {shipment.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{shipment.description}</p>
                  </CardContent>
                </Card>
              )}

              {shipment.items.map((item, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {item.description}
                      <Badge variant="secondary">{item.category}</Badge>
                    </CardTitle>
                    <CardDescription>Quantity: {item.quantity}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {item.weight && (
                        <div className="flex items-center gap-2">
                          <Weight className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {item.weight} {item.weightUnit || 'lbs'}
                            </p>
                            <p className="text-xs text-muted-foreground">Weight</p>
                          </div>
                        </div>
                      )}
                      {item.dimensions && (
                        <div className="flex items-center gap-2">
                          <Ruler className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {item.dimensions.length} x {item.dimensions.width} x{' '}
                              {item.dimensions.height} {item.dimensions.unit}
                            </p>
                            <p className="text-xs text-muted-foreground">Dimensions</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {item.specialHandling && item.specialHandling.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          Special Handling
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {item.specialHandling.map((handling) => (
                            <Badge key={handling} variant="outline">
                              {handling}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.photos && item.photos.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Photos</p>
                        <div className="grid grid-cols-3 gap-2">
                          {item.photos.map((photo, photoIndex) => (
                            <div
                              key={photoIndex}
                              className="aspect-square rounded-lg overflow-hidden bg-muted"
                            >
                              <Image
                                src={photo}
                                alt={`Item photo ${photoIndex + 1}`}
                                width={200}
                                height={200}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="bids" className="mt-4">
              <BidsList
                shipmentId={shipment._id}
                bids={bids as Parameters<typeof BidsList>[0]['bids']}
                isShipper={isShipper}
                shipmentStatus={shipment.status}
              />
            </TabsContent>

            <TabsContent value="shipper" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">About the Shipper</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={shipment.shipper.image} />
                      <AvatarFallback>
                        {shipment.shipper.name?.split(' ').map((n) => n[0]).join('') || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{shipment.shipper.name}</h3>
                        {shipment.shipper.isVerified && (
                          <Shield className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {shipment.shipper.rating && (
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-accent text-accent" />
                            {shipment.shipper.rating.toFixed(1)}
                          </span>
                        )}
                        {shipment.shipper.completedShipments !== undefined && (
                          <span>{shipment.shipper.completedShipments} shipments</span>
                        )}
                      </div>
                      {!isShipper && shipment.status === 'booked' && (
                        <Button className="mt-4" variant="outline">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message Shipper
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {shipment.listingType === 'instant' && shipment.pricing.instantPrice ? (
                <div>
                  <p className="text-sm text-muted-foreground">Instant Price</p>
                  <p className="text-3xl font-bold">${shipment.pricing.instantPrice.toFixed(2)}</p>
                </div>
              ) : (
                <>
                  {shipment.pricing.budget && (
                    <div>
                      <p className="text-sm text-muted-foreground">Budget Range</p>
                      <p className="text-xl font-semibold">
                        ${shipment.pricing.budget.min} - ${shipment.pricing.budget.max}
                      </p>
                    </div>
                  )}
                  {lowestBid && (
                    <div>
                      <p className="text-sm text-muted-foreground">Current Lowest Bid</p>
                      <p className="text-2xl font-bold text-success">${lowestBid.toFixed(2)}</p>
                    </div>
                  )}
                </>
              )}

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Items</span>
                  <span>{totalItems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Weight</span>
                  <span>{totalWeight} lbs</span>
                </div>
                {shipment.distance && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distance</span>
                    <span>{shipment.distance.toFixed(0)} miles</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bids Received</span>
                  <span>{bids.length}</span>
                </div>
              </div>

              {shipment.expiresAt && (
                <div className="flex items-center gap-2 text-sm text-warning bg-warning/10 p-3 rounded-md">
                  <Clock className="h-4 w-4" />
                  <span>
                    Expires {formatDistanceToNow(new Date(shipment.expiresAt), { addSuffix: true })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instant Action */}
          {shipment.listingType === 'instant' && shipment.status === 'open' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Instant Delivery</CardTitle>
                <CardDescription>
                  This shipment can be accepted immediately at the instant price.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isCarrier && !existingBid ? (
                  <Button className="w-full" onClick={handleAcceptInstant} disabled={isAcceptingInstant}>
                    {isAcceptingInstant ? 'Accepting...' : 'Accept Instant Delivery'}
                  </Button>
                ) : isCarrier && existingBid ? (
                  <p className="text-sm text-muted-foreground">
                    You already have an active response on this shipment.
                  </p>
                ) : isShipper ? (
                  <p className="text-sm text-muted-foreground">
                    Carriers can accept this shipment instantly. Share this listing with carriers or wait for acceptance.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sign in as a verified carrier to accept this instant shipment.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {isCarrier && shipment.status === 'open' && !existingBid && shipment.listingType !== 'instant' && (
            <BidForm
              shipmentId={shipment._id}
              suggestedPrice={shipment.pricing.suggestedPrice}
              minimumBid={shipment.pricing.minimumBid}
              currentLowestBid={lowestBid || undefined}
              pickupDate={new Date(shipment.pickupDate.earliest)}
            />
          )}

          {/* Existing Bid Notice */}
          {existingBid && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Your Bid</p>
                    <p className="text-2xl font-bold">${existingBid.amount.toFixed(2)}</p>
                    <Badge
                      variant={
                        existingBid.status === 'accepted'
                          ? 'default'
                          : existingBid.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {existingBid.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin Actions */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Admin Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full">
                  Review Shipment
                </Button>
                <Button variant="outline" className="w-full text-destructive">
                  Flag for Review
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
