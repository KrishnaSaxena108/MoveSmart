"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db/mongodb"
import { Bid } from "@/lib/db/models/bid"
import { Shipment } from "@/lib/db/models/shipment"
import { User } from "@/lib/db/models/user"
import { Types } from "mongoose"
import { z } from "zod"

const createBidSchema = z.object({
  shipmentId: z.string().min(1, "Shipment ID is required"),
  amount: z.number().min(1, "Bid amount must be greater than 0"),
  notes: z.string().optional(),
  estimatedPickupDate: z.string().optional(),
  estimatedDeliveryDate: z.string().optional(),
})

export type CreateBidInput = z.infer<typeof createBidSchema>

export async function submitBid(input: {
  shipmentId: string
  amount: number
  notes?: string
  estimatedPickup?: Date
  estimatedDelivery?: Date
  validUntil?: Date
}) {
  return createBid({
    shipmentId: input.shipmentId,
    amount: input.amount,
    notes: input.notes,
    estimatedPickupDate: input.estimatedPickup?.toISOString(),
    estimatedDeliveryDate: input.estimatedDelivery?.toISOString(),
  })
}

export async function createBid(input: CreateBidInput) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return { success: false, error: "You must be logged in to place a bid" }
    }

    await connectToDatabase()

    // Check user is a verified carrier
    const user = await User.findById(session.user.id)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    if (user.role !== "carrier" && user.role !== "admin") {
      return { success: false, error: "Only carriers can place bids" }
    }

    if (user.verificationStatus !== "approved") {
      return { success: false, error: "Your account must be verified before placing bids" }
    }

    // Check shipment exists and is active
    const shipment = await Shipment.findById(input.shipmentId)
    if (!shipment) {
      return { success: false, error: "Shipment not found" }
    }

    if (shipment.status !== "open") {
      return { success: false, error: "This shipment is no longer accepting bids" }
    }

    if (shipment.listingType === "instant") {
      return { success: false, error: "Instant listings cannot receive bids. Use instant booking instead." }
    }

    // Check if carrier already has a pending bid
    const existingBid = await Bid.findOne({
      shipmentId: input.shipmentId,
      carrierId: session.user.id,
      status: { $in: ["pending", "accepted"] },
    })

    if (existingBid) {
      return { success: false, error: "You already have an active bid on this shipment" }
    }

    // Create bid
    const bid = await Bid.create({
      shipmentId: input.shipmentId,
      carrierId: session.user.id,
      amount: input.amount,
      message: input.notes,
      estimatedPickupDate: input.estimatedPickupDate ? new Date(input.estimatedPickupDate) : undefined,
      estimatedDeliveryDate: input.estimatedDeliveryDate ? new Date(input.estimatedDeliveryDate) : undefined,
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    } as const)

    // Increment bid count on shipment
    await Shipment.findByIdAndUpdate(input.shipmentId, {
      $inc: { bidCount: 1 },
    })

    revalidatePath(`/dashboard/shipments/${input.shipmentId}`)
    revalidatePath("/dashboard")

    return { 
      success: true, 
      bidId: bid._id.toString(),
      message: "Bid placed successfully" 
    }
  } catch (error) {
    console.error("Error creating bid:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: "Failed to place bid" }
  }
}

export async function getBidsForShipment(shipmentId: string) {
  try {
    if (!Types.ObjectId.isValid(shipmentId)) {
      return { success: true, bids: [] }
    }

    await connectToDatabase()

    const bids = await Bid.find({ shipmentId })
      .sort({ amount: 1, createdAt: -1 })
      .populate("carrierId", "firstName lastName companyName profileImage rating stats verificationStatus")
      .lean()

    return {
      success: true,
      bids: bids.map(bid => ({
        ...bid,
        _id: bid._id.toString(),
        shipmentId: bid.shipmentId.toString(),
        carrierId: typeof bid.carrierId === "object" ? {
          ...bid.carrierId,
          _id: bid.carrierId._id?.toString(),
        } : bid.carrierId,
      })),
    }
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "CastError") {
      return { success: true, bids: [] }
    }
    console.error("Error fetching bids:", error)
    return { success: false, error: "Failed to fetch bids" }
  }
}

export async function getCarrierBids(carrierId?: string) {
  try {
    const session = await auth()
    const userId = carrierId || session?.user?.id

    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    await connectToDatabase()

    const bids = await Bid.find({ carrierId: userId })
      .sort({ createdAt: -1 })
      .populate("shipmentId", "pickup delivery pickupDate items pricing status")
      .lean()

    return {
      success: true,
      bids: bids.map(bid => ({
        ...bid,
        _id: bid._id.toString(),
        carrierId: bid.carrierId.toString(),
        shipmentId: typeof bid.shipmentId === "object" ? {
          ...bid.shipmentId,
          _id: bid.shipmentId._id?.toString(),
        } : bid.shipmentId,
      })),
    }
  } catch (error) {
    console.error("Error fetching carrier bids:", error)
    return { success: false, error: "Failed to fetch bids" }
  }
}

export async function acceptBid(bidId: string) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" }
    }

    await connectToDatabase()

    const bid = await Bid.findById(bidId)
    if (!bid) {
      return { success: false, error: "Bid not found" }
    }

    const shipment = await Shipment.findById(bid.shipmentId)
    if (!shipment) {
      return { success: false, error: "Shipment not found" }
    }

    // Check authorization
    if (shipment.shipperId.toString() !== session.user.id) {
      const user = await User.findById(session.user.id)
      if (user?.role !== "admin") {
        return { success: false, error: "Not authorized to accept this bid" }
      }
    }

    // Check shipment status
    if (shipment.status !== "open") {
      return { success: false, error: "This shipment is no longer accepting bids" }
    }

    // Update bid status
    bid.status = "accepted"
    await bid.save()

    // Update shipment
    const shipmentDoc = shipment as any
    shipmentDoc.status = "booked"
    shipmentDoc.carrierId = bid.carrierId
    shipmentDoc.pricing.acceptedPrice = bid.amount
    shipmentDoc.tracking ??= {}
    shipmentDoc.tracking.statusHistory ??= []
    shipmentDoc.tracking.statusHistory.push({
      status: "booked",
      timestamp: new Date(),
      note: `Bid accepted for $${bid.amount}`,
      notes: `Bid accepted for $${bid.amount}`,
    })
    await shipmentDoc.save()

    // Reject other pending bids
    await Bid.updateMany(
      { 
        shipmentId: bid.shipmentId, 
        _id: { $ne: bidId },
        status: "pending" 
      },
      { status: "rejected" }
    )

    revalidatePath(`/dashboard/shipments/${bid.shipmentId}`)
    revalidatePath("/dashboard")

    return { 
      success: true, 
      message: "Bid accepted successfully" 
    }
  } catch (error) {
    console.error("Error accepting bid:", error)
    return { success: false, error: "Failed to accept bid" }
  }
}

export async function rejectBid(bidId: string) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" }
    }

    await connectToDatabase()

    const bid = await Bid.findById(bidId)
    if (!bid) {
      return { success: false, error: "Bid not found" }
    }

    const shipment = await Shipment.findById(bid.shipmentId)
    if (!shipment) {
      return { success: false, error: "Shipment not found" }
    }

    // Check authorization
    if (shipment.shipperId.toString() !== session.user.id) {
      const user = await User.findById(session.user.id)
      if (user?.role !== "admin") {
        return { success: false, error: "Not authorized to reject this bid" }
      }
    }

    bid.status = "rejected"
    await bid.save()

    revalidatePath(`/dashboard/shipments/${bid.shipmentId}`)

    return { success: true, message: "Bid rejected" }
  } catch (error) {
    console.error("Error rejecting bid:", error)
    return { success: false, error: "Failed to reject bid" }
  }
}

export async function withdrawBid(bidId: string) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" }
    }

    await connectToDatabase()

    const bid = await Bid.findById(bidId)
    if (!bid) {
      return { success: false, error: "Bid not found" }
    }

    // Check authorization
    if (bid.carrierId.toString() !== session.user.id) {
      return { success: false, error: "Not authorized to withdraw this bid" }
    }

    if (bid.status !== "pending") {
      return { success: false, error: "Can only withdraw pending bids" }
    }

    bid.status = "withdrawn"
    await bid.save()

    // Decrement bid count
    await Shipment.findByIdAndUpdate(bid.shipmentId, {
      $inc: { bidCount: -1 },
    })

    revalidatePath(`/dashboard/shipments/${bid.shipmentId}`)
    revalidatePath("/dashboard")

    return { success: true, message: "Bid withdrawn" }
  } catch (error) {
    console.error("Error withdrawing bid:", error)
    return { success: false, error: "Failed to withdraw bid" }
  }
}

export async function counterOffer(bidId: string, counterAmount: number, message?: string) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" }
    }

    await connectToDatabase()

    const bid = await Bid.findById(bidId)
    if (!bid) {
      return { success: false, error: "Bid not found" }
    }

    const shipment = await Shipment.findById(bid.shipmentId)
    if (!shipment) {
      return { success: false, error: "Shipment not found" }
    }

    // Check authorization (shipper or carrier can counter)
    const isShipper = shipment.shipperId.toString() === session.user.id
    const isCarrier = bid.carrierId.toString() === session.user.id

    if (!isShipper && !isCarrier) {
      return { success: false, error: "Not authorized to make counter offer" }
    }

    // Add to counter offers
    bid.counterOffers.push({
      amount: counterAmount,
      fromRole: isShipper ? "shipper" : "carrier",
      message,
      createdAt: new Date(),
    })

    bid.status = "countered"
    await bid.save()

    revalidatePath(`/dashboard/shipments/${bid.shipmentId}`)

    return { success: true, message: "Counter offer sent" }
  } catch (error) {
    console.error("Error sending counter offer:", error)
    return { success: false, error: "Failed to send counter offer" }
  }
}

export async function acceptInstantBooking(shipmentId: string) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" }
    }

    await connectToDatabase()

    const user = await User.findById(session.user.id)
    if (!user) {
      return { success: false, error: "User not found" }
    }

    if (user.role !== "carrier" && user.role !== "admin") {
      return { success: false, error: "Only carriers can accept instant bookings" }
    }

    if (user.verificationStatus !== "approved") {
      return { success: false, error: "Your account must be verified to accept bookings" }
    }

    const shipment = await Shipment.findById(shipmentId)
    if (!shipment) {
      return { success: false, error: "Shipment not found" }
    }

    if (shipment.listingType !== "instant") {
      return { success: false, error: "This is not an instant listing" }
    }

    if (shipment.status !== "open") {
      return { success: false, error: "This shipment is no longer available" }
    }

    // Create an automatic bid/booking
    const bid = await Bid.create({
      shipmentId,
      carrierId: session.user.id,
      amount: shipment.pricing.fixedPrice,
      message: "Instant booking",
      status: "accepted",
      estimatedPickupDate: new Date(),
      estimatedDeliveryDate: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    } as const)

    // Update shipment
    const shipmentDoc = shipment as any
    shipmentDoc.status = "booked"
    shipmentDoc.carrierId = session.user.id
    shipmentDoc.pricing.acceptedPrice = shipment.pricing.fixedPrice
    shipmentDoc.tracking ??= {}
    shipmentDoc.tracking.statusHistory ??= []
    shipmentDoc.tracking.statusHistory.push({
      status: "booked",
      timestamp: new Date(),
      note: "Instant booking accepted",
      notes: "Instant booking accepted",
    })
    await shipmentDoc.save()

    revalidatePath(`/dashboard/shipments/${shipmentId}`)
    revalidatePath("/dashboard/load-board")
    revalidatePath("/dashboard")

    return { 
      success: true, 
      message: "Booking confirmed!",
      shipmentId: shipment._id.toString(),
    }
  } catch (error) {
    console.error("Error accepting instant booking:", error)
    return { success: false, error: "Failed to accept booking" }
  }
}
