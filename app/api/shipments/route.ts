import { NextRequest, NextResponse } from "next/server"
import { createShipment, type CreateShipmentInput } from "@/lib/actions/shipments"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db/mongodb"
import { Shipment } from "@/lib/db/models/shipment"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()

    const availableQuery = {
      status: "open",
      $or: [{ carrierId: { $exists: false } }, { carrierId: null }],
    }

    const [openForCarriers, instantOpen, auctionOpen, shipments] = await Promise.all([
      Shipment.countDocuments(availableQuery),
      Shipment.countDocuments({ ...availableQuery, listingType: "instant" }),
      Shipment.countDocuments({ ...availableQuery, listingType: "auction" }),
      Shipment.find(availableQuery)
        .sort({ createdAt: -1 })
        .limit(20)
        .select("_id listingType status pickup delivery pricing createdAt")
        .lean(),
    ])

    return NextResponse.json({
      success: true,
      role: session.user.role,
      summary: {
        openForCarriers,
        instantOpen,
        auctionOpen,
      },
      shipments: shipments.map((shipment: any) => ({
        id: shipment._id.toString(),
        listingType: shipment.listingType,
        status: shipment.status,
        pickup: {
          city: shipment.pickup?.city,
          state: shipment.pickup?.state,
        },
        delivery: {
          city: shipment.delivery?.city,
          state: shipment.delivery?.state,
        },
        pricing: {
          budget: shipment.pricing?.budget,
          fixedPrice: shipment.pricing?.fixedPrice,
        },
        createdAt: shipment.createdAt,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch shipments"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateShipmentInput
    const result = await createShipment(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to create shipment" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      shipmentId: result.shipmentId,
      message: result.message,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
