import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadToCloudinary, uploadMultipleToCloudinary } from "@/lib/cloudinary/upload"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const folder = formData.get("folder") as string || "movesmart"

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // Single file upload
    if (files.length === 1) {
      const result = await uploadToCloudinary(files[0], folder)
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
      return NextResponse.json({ url: result.url, publicId: result.publicId })
    }

    // Multiple file upload
    const results = await uploadMultipleToCloudinary(files, folder)
    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    return NextResponse.json({
      uploaded: successful.map((r) => ({ url: r.url, publicId: r.publicId })),
      failed: failed.length,
      total: files.length,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    )
  }
}
