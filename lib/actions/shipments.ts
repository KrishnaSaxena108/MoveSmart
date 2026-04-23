"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db/mongodb"
import { Shipment, type ShipmentStatus } from "@/lib/db/models/shipment"
import { User } from "@/lib/db/models/user"
import { Types } from "mongoose"
import { z } from "zod"

// Validation schemas
const locationSchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().optional().default(""),
  country: z.string().default("USA"),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
})

const itemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  category: z.enum([
    "vehicle",
    "furniture",
    "freight",
    "household",
    "equipment",
    "palletized",
    "other",
  ]),
  quantity: z.number().min(1).default(1),
  weight: z.number().optional(),
  weightUnit: z.enum(["lbs", "kg"]).default("lbs"),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number(),
    unit: z.enum(["in", "ft", "cm", "m"]).default("in"),
  }).optional(),
})

const createShipmentSchema = z.object({
  pickup: locationSchema,
  delivery: locationSchema,
  pickupDate: z.object({
    earliest: z.string(),
    latest: z.string().optional(),
  }),
  deliveryDate: z.object({
    earliest: z.string().optional(),
    latest: z.string().optional(),
  }).optional(),
  items: z.array(itemSchema).min(1, "At least one item is required"),
  specialRequirements: z.array(z.string()).optional(),
  listingType: z.enum(["auction", "instant"]),
  pricing: z.object({
    type: z.enum(["auction", "fixed"]),
    budget: z.number().optional(),
    fixedPrice: z.number().optional(),
    currency: z.string().default("USD"),
  }),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>

export async function createShipment(input: CreateShipmentInput) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return { success: false, error: "You must be logged in to create a shipment" }
    }

    await connectToDatabase()

    // Check user verification status
    const user = await User.findById(session.user.id)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    if (user.verificationStatus !== "approved") {
      return { success: false, error: "Your account must be verified before posting shipments" }
    }

    if (user.role !== "shipper" && user.role !== "admin") {
      return { success: false, error: "Only shippers can create shipments" }
    }

    // Validate input
    const validated = createShipmentSchema.parse(input)

    // Calculate estimated distance (simplified - in production use routing API)
    const estimatedDistance = validated.pickup.coordinates && validated.delivery.coordinates
      ? calculateDistance(
          validated.pickup.coordinates.lat,
          validated.pickup.coordinates.lng,
          validated.delivery.coordinates.lat,
          validated.delivery.coordinates.lng
        )
      : undefined

    // Create shipment
    const shipment = await Shipment.create({
      shipperId: session.user.id,
      pickup: {
        ...validated.pickup,
        dateWindow: {
          start: new Date(validated.pickupDate.earliest),
          end: validated.pickupDate.latest ? new Date(validated.pickupDate.latest) : new Date(validated.pickupDate.earliest),
        },
        coordinates: validated.pickup.coordinates
          ? { type: "Point", coordinates: [validated.pickup.coordinates.lng, validated.pickup.coordinates.lat] }
          : undefined,
      },
      delivery: {
        ...validated.delivery,
        dateWindow: {
          start: validated.deliveryDate?.earliest ? new Date(validated.deliveryDate.earliest) : new Date(validated.pickupDate.earliest),
          end: validated.deliveryDate?.latest ? new Date(validated.deliveryDate.latest) : new Date(validated.pickupDate.earliest),
        },
        coordinates: validated.delivery.coordinates
          ? { type: "Point", coordinates: [validated.delivery.coordinates.lng, validated.delivery.coordinates.lat] }
          : undefined,
      },
      distance: estimatedDistance ?? 0,
      estimatedDuration: 0,
      items: validated.items.map((item) => ({
        ...item,
        category: item.category === "palletized" ? "pallets" : item.category,
        weight: item.weight ?? 0,
        photos: [],
        specialHandling: [],
        dimensions: item.dimensions
          ? {
              length: item.dimensions.length,
              width: item.dimensions.width,
              height: item.dimensions.height,
            }
          : undefined,
      })),
      totalWeight: validated.items.reduce((sum, item) => sum + (item.weight ?? 0), 0),
      listingType: validated.listingType,
      pricing: {
        budget: validated.pricing.budget,
        fixedPrice: validated.pricing.fixedPrice,
        acceptedPrice: undefined,
        platformFee: undefined,
        carrierPayout: undefined,
      },
      auction: validated.listingType === "auction"
        ? {
            endsAt: new Date(validated.pickupDate.latest ?? validated.pickupDate.earliest),
            totalBids: 0,
          }
        : undefined,
      instant: validated.listingType === "instant"
        ? {
            expiresAt: new Date(validated.pickupDate.latest ?? validated.pickupDate.earliest),
            isUrgent: false,
          }
        : undefined,
      tracking: {
        statusHistory: [],
      },
      deliveryConfirmation: undefined,
      viewCount: 0,
      bidCount: 0,
      status: "open",
    } as any) as any

    revalidatePath("/dashboard")
    revalidatePath("/load-board")

    return { 
      success: true,
      shipmentId: shipment._id.toString(),
      message: "Shipment created successfully" 
    }
  } catch (error) {
    console.error("Error creating shipment:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: "Failed to create shipment" }
  }
}

export async function getShipments(filters?: {
  status?: string
  shipperId?: string
  carrierId?: string
  page?: number
  limit?: number
}) {
  try {
    await connectToDatabase()

    const query: Record<string, unknown> = {}
    
    if (filters?.status) {
      query.status = filters.status
    }
    if (filters?.shipperId) {
      query.shipperId = filters.shipperId
    }
    if (filters?.carrierId) {
      query.carrierId = filters.carrierId
    }

    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const skip = (page - 1) * limit

    const [shipments, total] = await Promise.all([
      Shipment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("shipperId", "firstName lastName companyName profileImage")
        .lean(),
      Shipment.countDocuments(query),
    ])

    return {
      success: true,
      shipments: (shipments as any[]).map(s => ({
        ...s,
        _id: s._id.toString(),
        shipperId: typeof s.shipperId === "object" ? {
          ...s.shipperId,
          _id: s.shipperId._id?.toString(),
        } : s.shipperId,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error("Error fetching shipments:", error)
    return { success: false, error: "Failed to fetch shipments" }
  }
}

export async function getShipmentById(id: string) {
  try {
    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: "Shipment not found" }
    }

    await connectToDatabase()

    const shipment = await Shipment.findById(id)
      .populate("shipperId", "firstName lastName companyName profileImage rating stats")
      .populate("carrierId", "firstName lastName companyName profileImage rating stats")
      .lean()

    if (!shipment) {
      return { success: false, error: "Shipment not found" }
    }

    return {
      success: true,
      shipment: {
        ...shipment,
        _id: shipment._id.toString(),
      },
    }
  } catch (error) {
    // Invalid ObjectIds should behave like "not found" without noisy server errors.
    if (error && typeof error === "object" && "name" in error && error.name === "CastError") {
      return { success: false, error: "Shipment not found" }
    }
    console.error("Error fetching shipment:", error)
    return { success: false, error: "Failed to fetch shipment" }
  }
}

export async function searchShipments(params: {
  // Location-based search
  pickupCity?: string
  pickupState?: string
  pickupLat?: number
  pickupLng?: number
  pickupRadius?: number // in km
  
  // Destination-based search  
  deliveryCity?: string
  deliveryState?: string
  deliveryLat?: number
  deliveryLng?: number
  
  // Route-based search (along a route)
  routeStart?: { lat: number; lng: number }
  routeEnd?: { lat: number; lng: number }
  routeRadius?: number // km deviation from route
  
  // Filters
  category?: string
  minWeight?: number
  maxWeight?: number
  listingType?: "auction" | "instant"
  minPrice?: number
  maxPrice?: number
  pickupDateStart?: string
  pickupDateEnd?: string
  
  // Pagination
  page?: number
  limit?: number
}) {
  try {
    await connectToDatabase()

    const query: Record<string, unknown> = {
      status: "active",
    }

    // Location filters
    if (params.pickupCity) {
      query["pickup.city"] = { $regex: params.pickupCity, $options: "i" }
    }
    if (params.pickupState) {
      query["pickup.state"] = { $regex: params.pickupState, $options: "i" }
    }
    if (params.deliveryCity) {
      query["delivery.city"] = { $regex: params.deliveryCity, $options: "i" }
    }
    if (params.deliveryState) {
      query["delivery.state"] = { $regex: params.deliveryState, $options: "i" }
    }

    // Category filter
    if (params.category) {
      query["items.category"] = params.category
    }

    // Listing type
    if (params.listingType) {
      query.listingType = params.listingType
    }

    // Date range
    if (params.pickupDateStart || params.pickupDateEnd) {
      query["pickupDate.earliest"] = {}
      if (params.pickupDateStart) {
        (query["pickupDate.earliest"] as Record<string, Date>).$gte = new Date(params.pickupDateStart)
      }
      if (params.pickupDateEnd) {
        (query["pickupDate.earliest"] as Record<string, Date>).$lte = new Date(params.pickupDateEnd)
      }
    }

    // Price range
    if (params.minPrice || params.maxPrice) {
      query["$or"] = [
        params.minPrice && params.maxPrice
          ? { "pricing.budget": { $gte: params.minPrice, $lte: params.maxPrice } }
          : params.minPrice
          ? { "pricing.budget": { $gte: params.minPrice } }
          : { "pricing.budget": { $lte: params.maxPrice } },
        params.minPrice && params.maxPrice
          ? { "pricing.fixedPrice": { $gte: params.minPrice, $lte: params.maxPrice } }
          : params.minPrice
          ? { "pricing.fixedPrice": { $gte: params.minPrice } }
          : { "pricing.fixedPrice": { $lte: params.maxPrice } },
      ]
    }

    const page = params.page || 1
    const limit = params.limit || 20
    const skip = (page - 1) * limit

    let shipments: any[] = await Shipment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("shipperId", "firstName lastName companyName profileImage rating")
      .lean()

    // If doing radius search, filter by distance
    if (params.pickupLat && params.pickupLng && params.pickupRadius) {
      shipments = shipments.filter(s => {
        if (!s.pickup.coordinates?.coordinates?.[0] || !s.pickup.coordinates?.coordinates?.[1]) return true
        const distance = calculateDistance(
          params.pickupLat!,
          params.pickupLng!,
          s.pickup.coordinates.coordinates[1],
          s.pickup.coordinates.coordinates[0]
        )
        return distance <= params.pickupRadius!
      })
    }

    // If doing route-based search, calculate detour distance
    if (params.routeStart && params.routeEnd && params.routeRadius) {
      shipments = shipments.filter(s => {
        if (!s.pickup.coordinates?.coordinates?.[0] || !s.delivery.coordinates?.coordinates?.[0]) return false
        
        const detour = calculateRouteDetour(
          params.routeStart!,
          params.routeEnd!,
          { lat: s.pickup.coordinates.coordinates[1], lng: s.pickup.coordinates.coordinates[0] },
          { lat: s.delivery.coordinates.coordinates[1], lng: s.delivery.coordinates.coordinates[0] }
        )
        
        return detour <= params.routeRadius!
      }).map(s => ({
        ...s,
        detourDistance: calculateRouteDetour(
          params.routeStart!,
          params.routeEnd!,
          { lat: s.pickup.coordinates!.coordinates[1], lng: s.pickup.coordinates!.coordinates[0] },
          { lat: s.delivery.coordinates!.coordinates[1], lng: s.delivery.coordinates!.coordinates[0] }
        ),
      }))
    }

    const total = await Shipment.countDocuments(query)

    return {
      success: true,
      shipments: shipments.map(s => ({
        ...s,
        _id: s._id.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error("Error searching shipments:", error)
    return { success: false, error: "Failed to search shipments" }
  }
}

export async function updateShipmentStatus(
  shipmentId: string,
  status: ShipmentStatus,
  updateData?: Record<string, unknown>
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" }
    }

    await connectToDatabase()

    const shipment = await Shipment.findById(shipmentId) as any
    if (!shipment) {
      return { success: false, error: "Shipment not found" }
    }

    // Only shipper, assigned carrier, or admin can update
    const user = await User.findById(session.user.id)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    const isShipper = shipment.shipperId.toString() === session.user.id
    const isCarrier = shipment.carrierId?.toString() === session.user.id
    const isAdmin = user.role === "admin"

    if (!isShipper && !isCarrier && !isAdmin) {
      return { success: false, error: "Not authorized to update this shipment" }
    }

    // Add to status history
    shipment.tracking ??= {}
    shipment.tracking.statusHistory ??= []
    shipment.tracking.statusHistory.push({
      status,
      timestamp: new Date(),
      note: updateData?.notes as string,
    })

    shipment.status = status
    
    if (updateData) {
      Object.assign(shipment, updateData)
    }

    await shipment.save()

    revalidatePath("/dashboard")
    revalidatePath(`/shipments/${shipmentId}`)

    return { success: true, message: "Shipment updated successfully" }
  } catch (error) {
    console.error("Error updating shipment:", error)
    return { success: false, error: "Failed to update shipment" }
  }
}

// Helper functions
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

function calculateRouteDetour(
  routeStart: { lat: number; lng: number },
  routeEnd: { lat: number; lng: number },
  pickupPoint: { lat: number; lng: number },
  deliveryPoint: { lat: number; lng: number }
): number {
  // Calculate direct route distance
  const directDistance = calculateDistance(
    routeStart.lat,
    routeStart.lng,
    routeEnd.lat,
    routeEnd.lng
  )

  // Calculate route with detour
  const detourDistance =
    calculateDistance(routeStart.lat, routeStart.lng, pickupPoint.lat, pickupPoint.lng) +
    calculateDistance(pickupPoint.lat, pickupPoint.lng, deliveryPoint.lat, deliveryPoint.lng) +
    calculateDistance(deliveryPoint.lat, deliveryPoint.lng, routeEnd.lat, routeEnd.lng)

  return detourDistance - directDistance
}
