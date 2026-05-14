import { connectToDatabase } from "@/lib/db/mongodb"
import { Shipment } from "@/lib/db/models/shipment"
import { Bid } from "@/lib/db/models/bid"
import { autoSelectWinner } from "@/lib/actions/live-auction"
import { NextRequest, NextResponse } from "next/server"

/**
 * Cron endpoint to auto-select winners for finished live auctions
 * Should be called every 10 seconds by a cron service
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authorization - use secret header
    const secret = request.headers.get("x-api-secret")
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    await connectToDatabase()

    const now = new Date()

    // Find shipments where the cooldown period has just ended
    const completedAuctions = await Shipment.find({
      listingType: "auction",
      "liveAuction.cooldownEndTime": {
        $lte: now,
        $gt: new Date(now.getTime() - 60 * 1000), // Within last 60 seconds
      },
      "liveAuction.winnerId": { $exists: false }, // Winner not yet selected
    })

    console.log(`Found ${completedAuctions.length} auctions to process`)

    let processed = 0
    let failed = 0

    for (const auction of completedAuctions) {
      const result = await autoSelectWinner(auction._id.toString())
      if (result.success) {
        processed++
      } else {
        failed++
        console.error(`Failed to process auction ${auction._id}:`, result.error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} auctions, ${failed} failed`,
      data: {
        processed,
        failed,
        total: completedAuctions.length,
      },
    })
  } catch (error) {
    console.error("Error in auto-select winner cron:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check auction status (for debugging)
 */
export async function GET(request: NextRequest) {
  try {
    const secret = request.headers.get("x-api-secret")
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    await connectToDatabase()

    const now = new Date()

    // Get stats on live auctions
    const activeAuctions = await Shipment.countDocuments({
      listingType: "auction",
      "liveAuction.endTime": { $gte: now },
      "liveAuction.winnerId": { $exists: false },
    })

    const pendingWinners = await Shipment.countDocuments({
      listingType: "auction",
      "liveAuction.cooldownEndTime": { $lte: now },
      "liveAuction.winnerId": { $exists: false },
    })

    const completedAuctions = await Shipment.countDocuments({
      listingType: "auction",
      "liveAuction.winnerId": { $exists: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        activeAuctions,
        pendingWinners,
        completedAuctions,
        timestamp: now.toISOString(),
      },
    })
  } catch (error) {
    console.error("Error fetching auction stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
