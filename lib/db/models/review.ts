import mongoose, { Schema, Document, Model, models } from "mongoose"

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId
  shipmentId: mongoose.Types.ObjectId
  reviewerId: mongoose.Types.ObjectId
  revieweeId: mongoose.Types.ObjectId
  
  // Ratings (1-5)
  overallRating: number
  categoryRatings: {
    communication: number
    timeliness: number
    itemCondition?: number // For carrier reviews
    professionalism: number
    accuracy?: number // For shipper reviews (item description accuracy)
  }
  
  // Content
  title?: string
  comment: string
  photos?: string[]
  
  // Response
  response?: {
    content: string
    createdAt: Date
  }
  
  // Visibility
  isPublic: boolean
  isVerified: boolean // Verified completed shipment
  
  createdAt: Date
  updatedAt: Date
}

const ReviewSchema = new Schema<IReview>(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: "Shipment",
      required: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    revieweeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    overallRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    categoryRatings: {
      communication: { type: Number, min: 1, max: 5, required: true },
      timeliness: { type: Number, min: 1, max: 5, required: true },
      itemCondition: { type: Number, min: 1, max: 5 },
      professionalism: { type: Number, min: 1, max: 5, required: true },
      accuracy: { type: Number, min: 1, max: 5 },
    },
    
    title: String,
    comment: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    photos: [String],
    
    response: {
      content: { type: String, maxlength: 500 },
      createdAt: Date,
    },
    
    isPublic: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
)

// Indexes
ReviewSchema.index({ shipmentId: 1 })
ReviewSchema.index({ reviewerId: 1 })
ReviewSchema.index({ revieweeId: 1 })
ReviewSchema.index({ overallRating: -1 })
ReviewSchema.index({ createdAt: -1 })

// Unique constraint: one review per direction per shipment
ReviewSchema.index({ shipmentId: 1, reviewerId: 1, revieweeId: 1 }, { unique: true })

export const Review: Model<IReview> = models.Review || mongoose.model<IReview>("Review", ReviewSchema)
