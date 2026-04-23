import { NextRequest, NextResponse } from "next/server"
import { acceptInstantBooking } from "@/lib/actions/bids"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const result = await acceptInstantBooking(id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to accept instant booking" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      shipmentId: result.shipmentId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
