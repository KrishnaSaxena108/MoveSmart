"use server"

import { Types } from "mongoose"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db/mongodb"
import { Bid, Payment, Shipment, User } from "@/lib/db/models"
import { Message } from "@/lib/db/models/message"
import { Conversation } from "@/lib/db/models/conversation"

export async function getShipperDashboardData(userId?: string) {
  try {
    const session = await auth()
    const effectiveUserId = userId || session?.user?.id

    if (!effectiveUserId) {
      return { success: false, error: "Not authenticated" as const }
    }

    await connectToDatabase()

    const userObjectId = new Types.ObjectId(effectiveUserId)

    const [
      user,
      activeShipments,
      totalShipments,
      recentShipments,
      savingsResult,
    ] = await Promise.all([
      User.findById(effectiveUserId).select("stats").lean(),
      Shipment.countDocuments({
        shipperId: effectiveUserId,
        status: { $in: ["open", "booked", "picked_up", "in_transit"] },
      }),
      Shipment.countDocuments({ shipperId: effectiveUserId }),
      Shipment.find({ shipperId: effectiveUserId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("pickup delivery status bidCount createdAt items pricing")
        .lean(),
      Shipment.aggregate([
        {
          $match: {
            shipperId: userObjectId,
            "pricing.budget": { $exists: true, $ne: null },
            "pricing.acceptedPrice": { $exists: true, $ne: null },
          },
        },
        {
          $project: {
            savedAmount: {
              $max: [{ $subtract: ["$pricing.budget", "$pricing.acceptedPrice"] }, 0],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalSaved: { $sum: "$savedAmount" },
          },
        },
      ]),
    ])

    const shipmentIds = recentShipments.map((shipment) => shipment._id)
    const pendingQuotes = shipmentIds.length
      ? await Bid.countDocuments({
          shipmentId: { $in: shipmentIds },
          status: { $in: ["pending", "countered"] },
        })
      : 0

    return {
      success: true,
      data: {
        stats: {
          activeShipments,
          pendingQuotes,
          totalShipments,
          totalSaved: Number(savingsResult[0]?.totalSaved || 0),
          averageRating: user?.stats?.averageRating || 0,
          totalReviews: user?.stats?.totalReviews || 0,
        },
        recentShipments: recentShipments.map((shipment) => ({
          id: shipment._id.toString(),
          title: shipment.items?.[0]?.description || "Shipment",
          from: `${shipment.pickup?.city || "-"}, ${shipment.pickup?.state || "-"}`,
          to: `${shipment.delivery?.city || "-"}, ${shipment.delivery?.state || "-"}`,
          status: shipment.status,
          bids: shipment.bidCount || 0,
          createdAt: shipment.createdAt,
        })),
      },
    }
  } catch (error) {
    console.error("Error fetching shipper dashboard data:", error)
    return { success: false, error: "Failed to fetch dashboard data" as const }
  }
}

export async function getCarrierDashboardData(userId?: string) {
  try {
    const session = await auth()
    const effectiveUserId = userId || session?.user?.id

    if (!effectiveUserId) {
      return { success: false, error: "Not authenticated" as const }
    }

    await connectToDatabase()

    const [
      user,
      activeJobs,
      pendingBids,
      completedJobs,
      earningsResult,
      nearbyLoads,
      activeBids,
    ] = await Promise.all([
      User.findById(effectiveUserId).select("stats").lean(),
      Shipment.countDocuments({
        carrierId: effectiveUserId,
        status: { $in: ["booked", "picked_up", "in_transit"] },
      }),
      Bid.countDocuments({
        carrierId: effectiveUserId,
        status: { $in: ["pending", "countered"] },
      }),
      Shipment.countDocuments({
        carrierId: effectiveUserId,
        status: "delivered",
      }),
      Payment.aggregate([
        {
          $match: {
            payeeId: new Types.ObjectId(effectiveUserId),
            status: "released",
            type: "payout",
          },
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: "$breakdown.carrierPayout" },
          },
        },
      ]),
      Shipment.find({ status: "open" })
        .sort({ createdAt: -1 })
        .limit(4)
        .select("items pickup delivery totalWeight pricing bidCount listingType")
        .lean(),
      Bid.find({
        carrierId: effectiveUserId,
        status: { $in: ["pending", "countered"] },
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate("shipmentId", "items bidCount")
        .lean(),
    ])

    return {
      success: true,
      data: {
        stats: {
          activeJobs,
          pendingBids,
          completedJobs,
          totalEarnings: Number(earningsResult[0]?.totalEarnings || 0),
          averageRating: user?.stats?.averageRating || 0,
        },
        nearbyLoads: nearbyLoads.map((load) => ({
          id: load._id.toString(),
          title: load.items?.[0]?.description || "Shipment",
          from: `${load.pickup?.city || "-"}, ${load.pickup?.state || "-"}`,
          to: `${load.delivery?.city || "-"}, ${load.delivery?.state || "-"}`,
          weight: load.totalWeight || 0,
          budget: load.pricing?.budget || load.pricing?.fixedPrice || 0,
          bids: load.bidCount || 0,
          instant: load.listingType === "instant",
        })),
        activeBids: activeBids.map((bid: any) => {
          const latestCounter = [...(bid.counterOffers || [])]
            .reverse()
            .find((offer) => offer.fromRole === "shipper")

          return {
            id: bid._id.toString(),
            title: bid.shipmentId?.items?.[0]?.description || "Shipment",
            yourBid: bid.amount,
            status: bid.status,
            counterOffer: latestCounter?.amount,
            competingBids: bid.shipmentId?.bidCount || 0,
          }
        }),
      },
    }
  } catch (error) {
    console.error("Error fetching carrier dashboard data:", error)
    return { success: false, error: "Failed to fetch dashboard data" as const }
  }
}

type DashboardNotification = {
  id: string
  type: "message" | "bid" | "shipment"
  title: string
  description: string
  href: string
  createdAt: Date
  unread?: boolean
}

export async function getDashboardNotifications(userId?: string) {
  try {
    const session = await auth()
    const effectiveUserId = userId || session?.user?.id

    if (!effectiveUserId) {
      return { success: false, error: "Not authenticated" as const }
    }

    await connectToDatabase()

    const objectUserId = new Types.ObjectId(effectiveUserId)
    const notifications: DashboardNotification[] = []

    const conversations = await Conversation.find({ participants: objectUserId })
      .select("_id shipment")
      .lean()

    const conversationIds = conversations.map((conversation) => conversation._id)
    const shipmentByConversationId = new Map(
      conversations.map((conversation) => [conversation._id.toString(), conversation.shipment?.toString() || ""])
    )

    if (conversationIds.length) {
      const unreadMessages = await Message.find({
        conversationId: { $in: conversationIds },
        senderId: { $ne: objectUserId },
        isRead: false,
      })
        .select("_id content senderId createdAt conversationId")
        .populate("senderId", "name")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean()

      unreadMessages.forEach((message) => {
        const sender = message.senderId as unknown as { name?: string }
        const shipmentId = shipmentByConversationId.get(message.conversationId.toString()) || ""
        notifications.push({
          id: `msg-${message._id.toString()}`,
          type: "message",
          title: `New message from ${sender?.name || "user"}`,
          description: message.content || "You have a new unread message.",
          href: "/dashboard/messages",
          createdAt: message.createdAt,
          unread: true,
        })

        if (shipmentId) {
          notifications[notifications.length - 1].href = `/dashboard/shipments/${shipmentId}`
        }
      })
    }

    if (session?.user?.role === "shipper") {
      const recentIncomingBids = await Bid.find({ status: { $in: ["pending", "countered"] } })
        .sort({ updatedAt: -1 })
        .limit(10)
        .populate({
          path: "shipmentId",
          select: "shipperId items",
          match: { shipperId: objectUserId },
        })
        .lean()

      recentIncomingBids
        .filter((bid: any) => bid.shipmentId)
        .forEach((bid: any) => {
          notifications.push({
            id: `bid-${bid._id.toString()}`,
            type: "bid",
            title: bid.status === "countered" ? "Carrier sent a counter offer" : "New bid received",
            description: `${bid.shipmentId?.items?.[0]?.description || "Shipment"} • $${Number(bid.amount || 0).toLocaleString()}`,
            href: `/dashboard/shipments/${bid.shipmentId._id.toString()}`,
            createdAt: bid.updatedAt || bid.createdAt,
          })
        })
    } else if (session?.user?.role === "carrier") {
      const bidStatusUpdates = await Bid.find({
        carrierId: objectUserId,
        status: { $in: ["accepted", "rejected", "countered"] },
      })
        .sort({ updatedAt: -1 })
        .limit(10)
        .populate("shipmentId", "items")
        .lean()

      bidStatusUpdates.forEach((bid: any) => {
        notifications.push({
          id: `bid-status-${bid._id.toString()}`,
          type: "bid",
          title:
            bid.status === "accepted"
              ? "Your bid was accepted"
              : bid.status === "rejected"
                ? "A bid was declined"
                : "Bid has a counter offer",
          description: bid.shipmentId?.items?.[0]?.description || "Shipment",
          href: bid.shipmentId?._id ? `/dashboard/shipments/${bid.shipmentId._id.toString()}` : "/dashboard/bids",
          createdAt: bid.updatedAt || bid.createdAt,
        })
      })
    }

    const shipmentQuery =
      session?.user?.role === "carrier"
        ? { carrierId: objectUserId }
        : { shipperId: objectUserId }

    const recentShipmentEvents = await Shipment.find({
      ...shipmentQuery,
      status: { $in: ["booked", "picked_up", "in_transit", "delivered", "disputed"] },
    })
      .sort({ updatedAt: -1 })
      .limit(8)
      .select("_id status items updatedAt")
      .lean()

    recentShipmentEvents.forEach((shipment) => {
      notifications.push({
        id: `shipment-${shipment._id.toString()}-${shipment.updatedAt.getTime()}`,
        type: "shipment",
        title: `Shipment ${shipment.status.replace("_", " ")}`,
        description: shipment.items?.[0]?.description || "Shipment update",
        href: `/dashboard/shipments/${shipment._id.toString()}`,
        createdAt: shipment.updatedAt,
      })
    })

    const sorted = notifications
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20)

    return {
      success: true,
      data: {
        unreadCount: sorted.filter((item) => item.unread).length,
        notifications: sorted,
      },
    }
  } catch (error) {
    console.error("Error fetching dashboard notifications:", error)
    return { success: false, error: "Failed to fetch notifications" as const }
  }
}
