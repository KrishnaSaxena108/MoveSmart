"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AddressAutocomplete } from "@/components/maps/address-autocomplete"
import { searchShipments } from "@/lib/actions/shipments"
import { 
  MapPin, 
  Calendar, 
  Package, 
  DollarSign,
  ArrowRight,
  Search,
  Filter,
  Truck,
  Zap,
  Clock,
  Route,
  Star,
  Weight,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface AddressData {
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  coordinates: { lat: number; lng: number }
  displayName: string
}

interface ShipmentResult {
  _id: string
  pickup: {
    city: string
    state: string
    address?: string
    coordinates?: { lat: number; lng: number }
  }
  delivery: {
    city: string
    state: string
    address?: string
    coordinates?: { lat: number; lng: number }
  }
  pickupDate: {
    earliest: string
    latest?: string
  }
  items: Array<{
    description: string
    category: string
    quantity: number
    weight?: number
    weightUnit?: string
  }>
  listingType: "auction" | "instant"
  pricing: {
    type: string
    budget?: number
    fixedPrice?: number
  }
  estimatedDistance?: number
  shipperId?: {
    firstName?: string
    lastName?: string
    companyName?: string
    rating?: { average: number; count: number }
  }
  bidCount?: number
  detourDistance?: number
  createdAt: string
}

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "vehicle", label: "Vehicle" },
  { value: "furniture", label: "Furniture" },
  { value: "freight", label: "Freight" },
  { value: "household", label: "Household" },
  { value: "equipment", label: "Equipment" },
  { value: "palletized", label: "Palletized" },
  { value: "other", label: "Other" },
]

export function LoadBoard() {
  const [searchMode, setSearchMode] = useState<"location" | "route" | "instant">("location")
  const [shipments, setShipments] = useState<ShipmentResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Location-based search
  const [pickupLocation, setPickupLocation] = useState<AddressData | null>(null)
  const [deliveryLocation, setDeliveryLocation] = useState<AddressData | null>(null)
  const [pickupRadius, setPickupRadius] = useState("50")

  // Filters
  const [category, setCategory] = useState("")
  const [listingType, setListingType] = useState<"" | "auction" | "instant">("")
  const [dateStart, setDateStart] = useState("")
  const [dateEnd, setDateEnd] = useState("")

  // Load instant shipments on mount when in instant mode
  useEffect(() => {
    if (searchMode === "instant") {
      handleSearch()
    }
  }, [searchMode])

  const handleSearch = async () => {
    setIsLoading(true)
    setHasSearched(true)

    try {
      const params: Record<string, unknown> = {
        page: 1,
        limit: 50,
      }

      if (searchMode === "instant") {
        params.listingType = "instant"
      } else if (searchMode === "location") {
        if (pickupLocation) {
          params.pickupCity = pickupLocation.city
          params.pickupState = pickupLocation.state
          if (pickupLocation.coordinates) {
            params.pickupLat = pickupLocation.coordinates.lat
            params.pickupLng = pickupLocation.coordinates.lng
            params.pickupRadius = parseInt(pickupRadius)
          }
        }
        if (deliveryLocation) {
          params.deliveryCity = deliveryLocation.city
          params.deliveryState = deliveryLocation.state
        }
      } else if (searchMode === "route" && pickupLocation && deliveryLocation) {
        params.routeStart = pickupLocation.coordinates
        params.routeEnd = deliveryLocation.coordinates
        params.routeRadius = parseInt(pickupRadius)
      }

      // Apply filters
      if (category) params.category = category
      if (listingType) params.listingType = listingType
      if (dateStart) params.pickupDateStart = dateStart
      if (dateEnd) params.pickupDateEnd = dateEnd

      const result = await searchShipments(params as Parameters<typeof searchShipments>[0])

      if (result.success && result.shipments) {
        const transformedShipments = result.shipments.map((shipment: any) => ({
          ...shipment,
          pickupDate: {
            earliest: shipment.pickup.dateWindow.start,
            latest: shipment.pickup.dateWindow.end,
          },
        }))
        setShipments(transformedShipments as ShipmentResult[])
      }
    } catch (error) {
      console.error("Error searching shipments:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const getPrice = (shipment: ShipmentResult) => {
    if (shipment.pricing.fixedPrice) return shipment.pricing.fixedPrice
    if (shipment.pricing.budget) return shipment.pricing.budget
    return 0
  }

  return (
    <div className="space-y-6">
      {/* Search Tabs */}
      <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as typeof searchMode)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="location" className="gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Location Search</span>
            <span className="sm:hidden">Location</span>
          </TabsTrigger>
          <TabsTrigger value="route" className="gap-2">
            <Route className="h-4 w-4" />
            <span className="hidden sm:inline">Along My Route</span>
            <span className="sm:hidden">Route</span>
          </TabsTrigger>
          <TabsTrigger value="instant" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Instant Pickups</span>
            <span className="sm:hidden">Instant</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="location" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Find Loads by Location</CardTitle>
              <CardDescription>
                Search for shipments starting from a specific area
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Pickup Area *</Label>
                  <AddressAutocomplete
                    value={pickupLocation}
                    onChange={setPickupLocation}
                    placeholder="Enter city or zip code"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Destination (optional)</Label>
                  <AddressAutocomplete
                    value={deliveryLocation}
                    onChange={setDeliveryLocation}
                    placeholder="Anywhere"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label>Search Radius</Label>
                  <Select value={pickupRadius} onValueChange={setPickupRadius}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 km</SelectItem>
                      <SelectItem value="50">50 km</SelectItem>
                      <SelectItem value="100">100 km</SelectItem>
                      <SelectItem value="200">200 km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSearch} disabled={!pickupLocation || isLoading}>
                  <Search className="mr-2 h-4 w-4" />
                  Search Loads
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="route" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Find Loads Along Your Route</CardTitle>
              <CardDescription>
                Get shipments with minimal detour from your planned route
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Route Start *</Label>
                  <AddressAutocomplete
                    value={pickupLocation}
                    onChange={setPickupLocation}
                    placeholder="Where are you starting?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Route End *</Label>
                  <AddressAutocomplete
                    value={deliveryLocation}
                    onChange={setDeliveryLocation}
                    placeholder="Where are you heading?"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label>Max Detour</Label>
                  <Select value={pickupRadius} onValueChange={setPickupRadius}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 km</SelectItem>
                      <SelectItem value="25">25 km</SelectItem>
                      <SelectItem value="50">50 km</SelectItem>
                      <SelectItem value="100">100 km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleSearch} 
                  disabled={!pickupLocation || !deliveryLocation || isLoading}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Find Route Loads
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instant" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" />
                Instant Pickups
              </CardTitle>
              <CardDescription>
                Time-sensitive shipments with fixed prices. First to accept wins!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                These loads need immediate pickup. Accept quickly to secure the job.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select
              value={category || "all"}
              onValueChange={(value) => setCategory(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {searchMode !== "instant" && (
              <Select 
                value={listingType || "all"}
                onValueChange={(v) => setListingType(v === "all" ? "" : (v as typeof listingType))}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Listing Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="auction">Auction</SelectItem>
                  <SelectItem value="instant">Instant</SelectItem>
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-36"
                placeholder="From date"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-36"
                placeholder="To date"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleSearch}>
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="mt-4 text-muted-foreground">Searching for loads...</p>
            </div>
          </div>
        ) : shipments.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found {shipments.length} shipment{shipments.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="grid gap-4">
              {shipments.map((shipment) => (
                <ShipmentCard key={shipment._id} shipment={shipment} />
              ))}
            </div>
          </>
        ) : hasSearched ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No shipments found</h3>
              <p className="mt-2 text-center text-muted-foreground">
                Try adjusting your search criteria or check back later
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Search className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Start your search</h3>
              <p className="mt-2 text-center text-muted-foreground">
                Enter a location above to find available shipments
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function ShipmentCard({ shipment }: { shipment: ShipmentResult }) {
  const price = shipment.pricing.fixedPrice || shipment.pricing.budget || 0
  const totalWeight = shipment.items.reduce((sum, item) => sum + (item.weight || 0), 0)
  const primaryItem = shipment.items[0]

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Route Info */}
          <div className="flex-1 p-4 lg:p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Route Visual */}
                <div className="hidden sm:flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                  </div>
                  <div className="h-8 w-0.5 bg-border" />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                    <MapPin className="h-4 w-4 text-accent" />
                  </div>
                </div>

                {/* Locations */}
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold">
                      {shipment.pickup.city}, {shipment.pickup.state}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(shipment.pickupDate.earliest)}
                      {shipment.pickupDate.latest && ` - ${formatDate(shipment.pickupDate.latest)}`}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">
                      {shipment.delivery.city}, {shipment.delivery.state}
                    </p>
                    {shipment.estimatedDistance && (
                      <p className="text-sm text-muted-foreground">
                        ~{Math.round(shipment.estimatedDistance)} km
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-col items-end gap-2">
                <Badge 
                  variant={shipment.listingType === "instant" ? "default" : "secondary"}
                  className={cn(
                    shipment.listingType === "instant" && "bg-accent text-accent-foreground"
                  )}
                >
                  {shipment.listingType === "instant" ? (
                    <>
                      <Zap className="mr-1 h-3 w-3" />
                      Instant
                    </>
                  ) : (
                    <>
                      <Truck className="mr-1 h-3 w-3" />
                      Auction
                    </>
                  )}
                </Badge>
                {shipment.detourDistance !== undefined && (
                  <Badge variant="outline">
                    +{Math.round(shipment.detourDistance)} km detour
                  </Badge>
                )}
              </div>
            </div>

            {/* Item Info */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>
                  {primaryItem?.description || "Shipment"}
                  {shipment.items.length > 1 && ` +${shipment.items.length - 1} more`}
                </span>
              </div>
              {totalWeight > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Weight className="h-4 w-4" />
                  <span>{totalWeight} {primaryItem?.weightUnit || "lbs"}</span>
                </div>
              )}
              {shipment.bidCount !== undefined && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>{shipment.bidCount} bid{shipment.bidCount !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>

            {/* Shipper Info */}
            {shipment.shipperId && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Posted by {shipment.shipperId.companyName || 
                    `${shipment.shipperId.firstName} ${shipment.shipperId.lastName}`}
                </span>
                {shipment.shipperId.rating && shipment.shipperId.rating.count > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{shipment.shipperId.rating.average.toFixed(1)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Price & Action */}
          <div className="flex items-center justify-between gap-4 border-t bg-muted/30 p-4 lg:w-48 lg:flex-col lg:justify-center lg:border-l lg:border-t-0">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {shipment.listingType === "instant" ? "Fixed Price" : "Budget"}
              </p>
              <p className="text-2xl font-bold">${price.toLocaleString()}</p>
            </div>
            <Button asChild>
              <Link href={`/dashboard/shipments/${shipment._id}`}>
                View Details
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}
