import mongoose, { Schema, Document, Model, models } from "mongoose"

export type BidStatus = "pending" | "accepted" | "rejected" | "withdrawn" | "expired" | "countered"

export interface IBid extends Document {
  _id: mongoose.Types.ObjectId
  shipmentId: mongoose.Types.ObjectId
  carrierId: mongoose.Types.ObjectId
  
  // Bid details
  amount: number
  message?: string
  estimatedPickupDate: Date
  estimatedDeliveryDate: Date
  
  // Status
  status: BidStatus
  
  // Counter offers
  counterOffers: Array<{
    amount: number
    message?: string
    fromRole: "shipper" | "carrier"
    createdAt: Date
  }>
  
  // Final
  acceptedAmount?: number
  acceptedAt?: Date
  rejectedAt?: Date
  rejectionReason?: string
  
  // Expiration
  expiresAt: Date
  
  createdAt: Date
  updatedAt: Date
}

const BidSchema = new Schema<IBid>(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: "Shipment",
      required: true,
    },
    carrierId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    message: String,
    estimatedPickupDate: {
      type: Date,
      required: true,
    },
    estimatedDeliveryDate: {
      type: Date,
      required: true,
    },
    
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn", "expired", "countered"],
      default: "pending",
    },
    
    counterOffers: [{
      amount: { type: Number, required: true },
      message: String,
      fromRole: { type: String, enum: ["shipper", "carrier"], required: true },
      createdAt: { type: Date, default: Date.now },
    }],
    
    acceptedAmount: Number,
    acceptedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
    
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
BidSchema.index({ shipmentId: 1 })
BidSchema.index({ carrierId: 1 })
BidSchema.index({ status: 1 })
BidSchema.index({ amount: 1 })
BidSchema.index({ createdAt: -1 })
BidSchema.index({ expiresAt: 1 })

// Compound indexes
BidSchema.index({ shipmentId: 1, carrierId: 1 }, { unique: true })

export const Bid: Model<IBid> = models.Bid || mongoose.model<IBid>("Bid", BidSchema)
