"use server"

import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db/mongodb"
import { Review, Shipment, User } from "@/lib/db/models"
import { revalidatePath } from "next/cache"
import { Types } from "mongoose"

interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

interface ReviewInput {
  shipmentId: string
  rating: number
  categoryRatings?: {
    communication?: number
    timeliness?: number
    itemCondition?: number
    professionalism?: number
  }
  comment?: string
  photos?: string[]
}

function buildCategoryRatings(input: ReviewInput["categoryRatings"], overallRating: number) {
  return {
    communication: input?.communication ?? overallRating,
    timeliness: input?.timeliness ?? overallRating,
    professionalism: input?.professionalism ?? overallRating,
    itemCondition: input?.itemCondition,
  }
}

function formatShipmentTitle(shipment: {
  pickup?: { city?: string; state?: string }
  delivery?: { city?: string; state?: string }
}) {
  const pickup = shipment.pickup?.city || shipment.pickup?.state
    ? `${shipment.pickup?.city || "Unknown"}, ${shipment.pickup?.state || "--"}`
    : "Unknown"
  const delivery = shipment.delivery?.city || shipment.delivery?.state
    ? `${shipment.delivery?.city || "Unknown"}, ${shipment.delivery?.state || "--"}`
    : "Unknown"
  return `${pickup} -> ${delivery}`
}

export async function submitReview(
  input: ReviewInput,
): Promise<ActionResult<{ reviewId: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    if (!Types.ObjectId.isValid(input.shipmentId)) {
      return { success: false, error: "Shipment not found" }
    }

    if (input.rating < 1 || input.rating > 5) {
      return { success: false, error: "Rating must be between 1 and 5" }
    }

    await connectToDatabase()

    const shipment = await Shipment.findById(input.shipmentId)
    if (!shipment) {
      return { success: false, error: "Shipment not found" }
    }

    if (shipment.status !== "delivered") {
      return { success: false, error: "Can only review completed shipments" }
    }

    const isShipper = shipment.shipperId.toString() === session.user.id
    const isCarrier = shipment.carrierId?.toString() === session.user.id

    if (!isShipper && !isCarrier) {
      return { success: false, error: "Not authorized to review this shipment" }
    }

    const revieweeId = isShipper ? shipment.carrierId : shipment.shipperId
    if (!revieweeId) {
      return { success: false, error: "Shipment has no review target yet" }
    }

    const existingReview = await Review.findOne({
      shipmentId: input.shipmentId,
      reviewerId: session.user.id,
    })

    if (existingReview) {
      return { success: false, error: "You have already reviewed this shipment" }
    }

    const review = await Review.create({
      shipmentId: input.shipmentId,
      reviewerId: session.user.id,
      revieweeId,
      overallRating: input.rating,
      categoryRatings: buildCategoryRatings(input.categoryRatings, input.rating),
      comment: input.comment?.trim() || "No written feedback provided.",
      photos: input.photos,
      isVerified: true,
    })

    await updateUserRating(revieweeId.toString())

    revalidatePath(`/dashboard/shipments/${input.shipmentId}`)

    return {
      success: true,
      data: { reviewId: review._id.toString() },
    }
  } catch (error) {
    console.error("Error submitting review:", error)
    return { success: false, error: "Failed to submit review" }
  }
}

async function updateUserRating(userId: string): Promise<void> {
  const reviews = await Review.find({ revieweeId: userId }).select("overallRating")

  if (reviews.length === 0) {
    await User.findByIdAndUpdate(userId, {
      "stats.averageRating": 0,
      "stats.totalReviews": 0,
    })
    return
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.overallRating, 0)
  const averageRating = totalRating / reviews.length

  await User.findByIdAndUpdate(userId, {
    "stats.averageRating": Math.round(averageRating * 10) / 10,
    "stats.totalReviews": reviews.length,
  })
}

export async function getUserReviews(
  userId: string,
  options?: { limit?: number; offset?: number },
): Promise<
  ActionResult<{
    reviews: Array<{
      _id: string
      shipment: { _id: string; title: string }
      reviewer: { _id: string; name: string; image?: string }
      rating: number
      categoryRatings?: {
        communication?: number
        timeliness?: number
        itemCondition?: number
        professionalism?: number
      }
      comment?: string
      photos?: string[]
      response?: string
      createdAt: Date
    }>
    total: number
    averageRating: number
  }>
> {
  try {
    if (!Types.ObjectId.isValid(userId)) {
      return { success: true, data: { reviews: [], total: 0, averageRating: 0 } }
    }

    await connectToDatabase()

    const total = await Review.countDocuments({ revieweeId: userId })

    const reviews = await Review.find({ revieweeId: userId })
      .populate("shipmentId", "pickup delivery")
      .populate("reviewerId", "name avatar")
      .sort({ createdAt: -1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 10)
      .lean()

    const user = await User.findById(userId).select("stats.averageRating").lean()

    return {
      success: true,
      data: {
        reviews: reviews.map((review) => {
          const shipment = review.shipmentId as unknown as {
            _id: Types.ObjectId
            pickup?: { city?: string; state?: string }
            delivery?: { city?: string; state?: string }
          }
          const reviewer = review.reviewerId as unknown as {
            _id: Types.ObjectId
            name?: string
            avatar?: string
          }

          return {
            _id: review._id.toString(),
            shipment: {
              _id: shipment?._id?.toString() || "",
              title: formatShipmentTitle(shipment || {}),
            },
            reviewer: {
              _id: reviewer?._id?.toString() || "",
              name: reviewer?.name || "Unknown user",
              image: reviewer?.avatar,
            },
            rating: review.overallRating,
            categoryRatings: review.categoryRatings,
            comment: review.comment,
            photos: review.photos,
            response: review.response?.content,
            createdAt: review.createdAt,
          }
        }),
        total,
        averageRating: user?.stats?.averageRating || 0,
      },
    }
  } catch (error) {
    console.error("Error getting reviews:", error)
    return { success: false, error: "Failed to get reviews" }
  }
}

export async function getShipmentReviews(
  shipmentId: string,
): Promise<
  ActionResult<
    Array<{
      _id: string
      reviewer: { _id: string; name: string; image?: string; role: string }
      reviewee: { _id: string; name: string; image?: string }
      rating: number
      categoryRatings?: {
        communication?: number
        timeliness?: number
        itemCondition?: number
        professionalism?: number
      }
      comment?: string
      photos?: string[]
      response?: string
      createdAt: Date
    }>
  >
> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    if (!Types.ObjectId.isValid(shipmentId)) {
      return { success: true, data: [] }
    }

    await connectToDatabase()

    const reviews = await Review.find({ shipmentId })
      .populate("reviewerId", "name avatar role")
      .populate("revieweeId", "name avatar")
      .sort({ createdAt: -1 })
      .lean()

    return {
      success: true,
      data: reviews.map((review) => {
        const reviewer = review.reviewerId as unknown as {
          _id: Types.ObjectId
          name?: string
          avatar?: string
          role?: string
        }
        const reviewee = review.revieweeId as unknown as {
          _id: Types.ObjectId
          name?: string
          avatar?: string
        }

        return {
          _id: review._id.toString(),
          reviewer: {
            _id: reviewer?._id?.toString() || "",
            name: reviewer?.name || "Unknown user",
            image: reviewer?.avatar,
            role: reviewer?.role || "user",
          },
          reviewee: {
            _id: reviewee?._id?.toString() || "",
            name: reviewee?.name || "Unknown user",
            image: reviewee?.avatar,
          },
          rating: review.overallRating,
          categoryRatings: review.categoryRatings,
          comment: review.comment,
          photos: review.photos,
          response: review.response?.content,
          createdAt: review.createdAt,
        }
      }),
    }
  } catch (error) {
    console.error("Error getting shipment reviews:", error)
    return { success: false, error: "Failed to get reviews" }
  }
}

export async function respondToReview(reviewId: string, response: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    if (!response.trim()) {
      return { success: false, error: "Response cannot be empty" }
    }

    if (!Types.ObjectId.isValid(reviewId)) {
      return { success: false, error: "Review not found" }
    }

    await connectToDatabase()

    const review = await Review.findById(reviewId)
    if (!review) {
      return { success: false, error: "Review not found" }
    }

    if (review.revieweeId.toString() !== session.user.id) {
      return { success: false, error: "Not authorized to respond to this review" }
    }

    if (review.response?.content) {
      return { success: false, error: "You have already responded to this review" }
    }

    review.response = {
      content: response.trim(),
      createdAt: new Date(),
    }
    await review.save()

    return { success: true }
  } catch (error) {
    console.error("Error responding to review:", error)
    return { success: false, error: "Failed to respond to review" }
  }
}

export async function canReviewShipment(
  shipmentId: string,
): Promise<ActionResult<{ canReview: boolean; hasReviewed: boolean }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    if (!Types.ObjectId.isValid(shipmentId)) {
      return { success: false, error: "Shipment not found" }
    }

    await connectToDatabase()

    const shipment = await Shipment.findById(shipmentId)
    if (!shipment) {
      return { success: false, error: "Shipment not found" }
    }

    const isShipper = shipment.shipperId.toString() === session.user.id
    const isCarrier = shipment.carrierId?.toString() === session.user.id
    const isCompleted = shipment.status === "delivered"

    if (!isShipper && !isCarrier) {
      return {
        success: true,
        data: { canReview: false, hasReviewed: false },
      }
    }

    const existingReview = await Review.findOne({
      shipmentId,
      reviewerId: session.user.id,
    })

    return {
      success: true,
      data: {
        canReview: isCompleted && !existingReview,
        hasReviewed: !!existingReview,
      },
    }
  } catch (error) {
    console.error("Error checking review status:", error)
    return { success: false, error: "Failed to check review status" }
  }
}
