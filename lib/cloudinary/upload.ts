"use server"

/**
 * JOLLY420 - CLOUDINARY FILE UPLOAD CONFIGURATION
 * 
 * Required for uploading shipment photos, documents, and profile images.
 * 
 * 1. Create a free Cloudinary account at https://cloudinary.com
 *    Free tier: 25 credits/month (~25GB storage + transformations)
 * 
 * 2. Go to https://console.cloudinary.com/settings/api-keys
 * 
 * NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name (e.g., "dxxxxxx")
 * CLOUDINARY_API_KEY=your_api_key (numeric string)
 * CLOUDINARY_API_SECRET=your_api_secret
 */
import { v2 as cloudinary } from "cloudinary"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface UploadResult {
  success: boolean
  url?: string
  publicId?: string
  error?: string
}

export async function uploadToCloudinary(
  file: File,
  folder: string = "movesmart"
): Promise<UploadResult> {
  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const base64 = buffer.toString("base64")
    const dataUri = `data:${file.type};base64,${base64}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: "auto",
      transformation: [
        { quality: "auto:good" },
        { fetch_format: "auto" }
      ]
    })

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    }
  } catch (error) {
    console.error("Cloudinary upload error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    }
  }
}

export async function uploadMultipleToCloudinary(
  files: File[],
  folder: string = "movesmart"
): Promise<UploadResult[]> {
  const uploadPromises = files.map((file) => uploadToCloudinary(file, folder))
  return Promise.all(uploadPromises)
}

export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId)
    return true
  } catch (error) {
    console.error("Cloudinary delete error:", error)
    return false
  }
}

export async function getSignedUploadUrl(folder: string = "movesmart") {
  const timestamp = Math.round(new Date().getTime() / 1000)
  
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
    },
    process.env.CLOUDINARY_API_SECRET!
  )

  return {
    signature,
    timestamp,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder,
  }
}
