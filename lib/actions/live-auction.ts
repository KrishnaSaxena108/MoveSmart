"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db/mongodb"
import { Bid } from "@/lib/db/models/bid"
import { Shipment } from "@/lib/db/models/shipment"
import { User } from "@/lib/db/models/user"
import { Types } from "mongoose"
import { z } from "zod"

const createLiveAuctionSchema = z.object({
  shipmentId: z.string().min(1, "Shipment ID is required"),
  desiredTime: z.string().datetime("Invalid date format"),
})

export type CreateLiveAuctionInput = z.infer<typeof createLiveAuctionSchema>

/**
 * Create a live auction for a shipment
 * Starts 5 minutes before desired time, ends at desired time + 10 second cooldown
 */
export async function createLiveAuction(input: CreateLiveAuctionInput) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" }
    }

    await connectToDatabase()

    const shipment = await Shipment.findById(input.shipmentId)
    if (!shipment) {
      return { success: false, error: "Shipment not found" }
    }

    // Verify it's a live auction listing type
    if (shipment.listingType !== "auction") {
      return { success: false, error: "Shipment must be an auction type" }
    }

    // Verify authorization (shipper only)
    if (shipment.shipperId.toString() !== session.user.id && session.user.role !== "admin") {
      return { success: false, error: "Not authorized to create live auction" }
    }

    const desiredTime = new Date(input.desiredTime)
    const now = new Date()

    // Validate desired time is in the future
    if (desiredTime <= now) {
      return { success: false, error: "Desired time must be in the future" }
    }

    // Calculate auction times
    const startTime = new Date(desiredTime.getTime() - 5 * 60 * 1000) // 5 minutes before
    const endTime = new Date(desiredTime) // At desired time
    const cooldownEndTime = new Date(desiredTime.getTime() + 10 * 1000) // 10 seconds after

    // Update shipment with live auction info
    shipment.liveAuction = {
      desiredTime,
      startTime,
      endTime,
      cooldownEndTime,
    }
    shipment.status = "open"
    await shipment.save()

    revalidatePath(`/dashboard/shipments/${input.shipmentId}`)
    revalidatePath("/dashboard")

    return {
      success: true,
      message: "Live auction created successfully",
      data: {
        shipmentId: shipment._id.toString(),
        startTime,
        endTime,
        cooldownEndTime,
      },
    }
  } catch (error) {
    console.error("Error creating live auction:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: "Failed to create live auction" }
  }
}

/**
 * Place a bid in a live auction
 */
export async function placeLiveAuctionBid(input: {
  shipmentId: string
  amount: number
  estimatedPickup?: Date
  estimatedDelivery?: Date
}) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" }
    }

    await connectToDatabase()

    // Verify carrier is verified
    const user = await User.findById(session.user.id)
    if (!user || user.verificationStatus !== "approved") {
      return { success: false, error: "Your account must be verified to place bids" }
    }

    const shipment = await Shipment.findById(input.shipmentId)
    if (!shipment) {
      return { success: false, error: "Shipment not found" }
    }

    const now = new Date()

    // Check if auction has started
    if (!shipment.liveAuction) {
      return { success: false, error: "This shipment doesn't have a live auction" }
    }

    if (now < shipment.liveAuction.startTime) {
      return { 
        success: false, 
        error: `Auction hasn't started yet. Starts in ${Math.round((shipment.liveAuction.startTime.getTime() - now.getTime()) / 1000)} seconds` 
      }
    }

    // Check if auction has ended
    if (now > shipment.liveAuction.endTime) {
      return { success: false, error: "Auction has ended" }
    }

    // Check minimum bid amount
    const currentLowestBid = await Bid.findOne(
      { shipmentId: input.shipmentId, isLiveAuction: true },
      { amount: 1 },
      { sort: { amount: 1 } }
    )

    if (currentLowestBid && input.amount >= currentLowestBid.amount) {
      return { 
        success: false, 
        error: `Your bid must be lower than current lowest bid ($${currentLowestBid.amount.toFixed(2)})` 
      }
    }

    // Check if carrier already has a bid in this auction
    const existingBid = await Bid.findOne({
      shipmentId: input.shipmentId,
      carrierId: session.user.id,
      isLiveAuction: true,
    })

    if (existingBid) {
      // Update existing bid
      existingBid.amount = input.amount
      if (input.estimatedPickup) existingBid.estimatedPickupDate = input.estimatedPickup
      if (input.estimatedDelivery) existingBid.estimatedDeliveryDate = input.estimatedDelivery
      existingBid.updatedAt = now
      await existingBid.save()

      return {
        success: true,
        message: "Bid updated successfully",
        bidId: existingBid._id.toString(),
      }
    }

    // Create new live auction bid
    const bid = await Bid.create({
      shipmentId: input.shipmentId,
      carrierId: session.user.id,
      amount: input.amount,
      estimatedPickupDate: input.estimatedPickup || new Date(),
      estimatedDeliveryDate: input.estimatedDelivery || new Date(),
      isLiveAuction: true,
      auctionStartTime: shipment.liveAuction.startTime,
      auctionEndTime: shipment.liveAuction.endTime,
      cooldownEndTime: shipment.liveAuction.cooldownEndTime,
      status: "pending",
      expiresAt: shipment.liveAuction.cooldownEndTime,
    })

    // Increment bid count
    await Shipment.findByIdAndUpdate(input.shipmentId, {
      $inc: { bidCount: 1 },
    })

    revalidatePath(`/dashboard/shipments/${input.shipmentId}`)

    return {
      success: true,
      message: "Bid placed successfully",
      bidId: bid._id.toString(),
    }
  } catch (error) {
    console.error("Error placing live auction bid:", error)
    return { success: false, error: "Failed to place bid" }
  }
}

/**
 * Get live auction bids for a shipment
 */
export async function getLiveAuctionBids(shipmentId: string) {
  try {
    if (!Types.ObjectId.isValid(shipmentId)) {
      return { success: true, bids: [] }
    }

    await connectToDatabase()

    const bids = await Bid.find({
      shipmentId,
      isLiveAuction: true,
    })
      .sort({ amount: 1, createdAt: 1 })
      .populate("carrierId", "firstName lastName companyName profileImage rating stats verificationStatus")
      .lean()

    return {
      success: true,
      bids: bids.map((bid) => ({
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
    console.error("Error fetching live auction bids:", error)
    return { success: false, error: "Failed to fetch bids" }
  }
}

/**
 * Get live auction shipments (currently active or upcoming)
 */
export async function getLiveAuctionShipments(filters?: {
  status?: string
  limit?: number
}) {
  try {
    await connectToDatabase()

    const limit = filters?.limit || 20
    const now = new Date()

    // Find shipments with active or upcoming live auctions
    const shipments = await Shipment.find({
      listingType: "auction",
      liveAuction: { $exists: true },
      $or: [
        { "liveAuction.endTime": { $gte: now } }, // Ongoing or future auctions
      ],
    })
      .limit(limit)
      .sort({ "liveAuction.endTime": 1 })
      .populate("shipperId", "firstName lastName companyName profileImage")
      .lean()

    return {
      success: true,
      shipments: shipments.map((shipment) => ({
        ...shipment,
        _id: shipment._id.toString(),
        shipperId: typeof shipment.shipperId === "object" ? {
          ...shipment.shipperId,
          _id: shipment.shipperId._id?.toString(),
        } : shipment.shipperId,
      })),
    }
  } catch (error) {
    console.error("Error fetching live auction shipments:", error)
    return { success: false, error: "Failed to fetch shipments" }
  }
}

/**
 * Auto-select winner after cooldown period
 * This should be called by a cron job
 */
export async function autoSelectWinner(shipmentId: string) {
  try {
    await connectToDatabase()

    const shipment = await Shipment.findById(shipmentId)
    if (!shipment || !shipment.liveAuction) {
      return { success: false, error: "Shipment or auction not found" }
    }

    const now = new Date()

    // Check if cooldown period has ended
    if (now < shipment.liveAuction.cooldownEndTime) {
      return { 
        success: false, 
        error: "Cooldown period hasn't ended yet" 
      }
    }

    // Already has a winner
    if (shipment.liveAuction.winnerId) {
      return { 
        success: false, 
        error: "Winner already selected for this auction" 
      }
    }

    // Find the lowest bid
    const winningBid = await Bid.findOne({
      shipmentId,
      isLiveAuction: true,
      status: "pending",
    }).sort({ amount: 1, createdAt: 1 })

    if (!winningBid) {
      // No bids received - mark auction as failed
      shipment.status = "cancelled"
      await shipment.save()
      return {
        success: true,
        message: "No bids received - auction cancelled",
      }
    }

    // Update winning bid
    winningBid.status = "auction_winner"
    winningBid.isWinner = true
    winningBid.winnerSelectedAt = now
    await winningBid.save()

    // Update all other bids to auction_lost
    await Bid.updateMany(
      {
        shipmentId,
        isLiveAuction: true,
        _id: { $ne: winningBid._id },
      },
      {
        status: "auction_lost",
        isWinner: false,
      }
    )

    // Update shipment with winner info
    shipment.liveAuction.winnerId = winningBid.carrierId
    shipment.liveAuction.winningBidId = winningBid._id
    shipment.liveAuction.winningAmount = winningBid.amount
    shipment.liveAuction.winnerSelectedAt = now
    shipment.carrierId = winningBid.carrierId
    shipment.status = "booked"
    shipment.pricing.acceptedPrice = winningBid.amount
    
    // Add to tracking history
    if (!shipment.tracking) {
      shipment.tracking = { statusHistory: [] }
    }
    shipment.tracking.statusHistory?.push({
      status: "booked",
      timestamp: now,
      note: `Live auction winner selected: $${winningBid.amount.toFixed(2)}`,
    })

    await shipment.save()

    revalidatePath(`/dashboard/shipments/${shipmentId}`)
    revalidatePath("/dashboard")

    return {
      success: true,
      message: "Winner selected successfully",
      data: {
        winningBidId: winningBid._id.toString(),
        carrierId: winningBid.carrierId.toString(),
        winningAmount: winningBid.amount,
      },
    }
  } catch (error) {
    console.error("Error selecting winner:", error)
    return { success: false, error: "Failed to select winner" }
  }
}
