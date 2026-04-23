import { NextRequest, NextResponse } from "next/server"
import { searchAddress } from "@/lib/maps/nominatim"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const limit = parseInt(searchParams.get("limit") || "5")

  if (!query || query.length < 3) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await searchAddress(query, limit)
    return NextResponse.json({ results })
  } catch (error) {
    console.error("Geocode API error:", error)
    return NextResponse.json({ results: [], error: "Failed to search address" }, { status: 500 })
  }
}
