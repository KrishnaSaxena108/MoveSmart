import mongoose, { Schema, Document, Model, models } from "mongoose"

export type PaymentStatus = 
  | "pending"
  | "processing"
  | "held" // In escrow
  | "released"
  | "refunded"
  | "disputed"
  | "failed"

export type PaymentType = "escrow" | "payout" | "refund" | "fee"

export interface IPayment extends Document {
  _id: mongoose.Types.ObjectId
  shipmentId: mongoose.Types.ObjectId
  
  // Parties
  payerId: mongoose.Types.ObjectId // Shipper for escrow, Platform for payout
  payeeId: mongoose.Types.ObjectId // Platform for escrow, Carrier for payout
  
  // Payment details
  type: PaymentType
  status: PaymentStatus
  
  amount: number
  currency: string
  
  // Breakdown
  breakdown: {
    subtotal: number
    platformFee: number
    processingFee: number
    carrierPayout: number
  }
  
  // Stripe
  stripePaymentIntentId?: string
  stripeTransferId?: string
  stripeRefundId?: string
  
  // Escrow
  escrow?: {
    heldAt: Date
    releasedAt?: Date
    releaseCode?: string
  }
  
  // Refund
  refund?: {
    amount: number
    reason: string
    requestedAt: Date
    processedAt?: Date
  }
  
  // Error handling
  failureReason?: string
  
  // Invoice
  invoiceNumber: string
  invoiceUrl?: string
  
  metadata?: Record<string, unknown>
  
  createdAt: Date
  updatedAt: Date
}

const PaymentSchema = new Schema<IPayment>(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: "Shipment",
      required: true,
    },
    
    payerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    payeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    type: {
      type: String,
      enum: ["escrow", "payout", "refund", "fee"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "held", "released", "refunded", "disputed", "failed"],
      default: "pending",
    },
    
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "usd",
    },
    
    breakdown: {
      subtotal: { type: Number, required: true },
      platformFee: { type: Number, required: true },
      processingFee: { type: Number, default: 0 },
      carrierPayout: { type: Number, required: true },
    },
    
    stripePaymentIntentId: String,
    stripeTransferId: String,
    stripeRefundId: String,
    
    escrow: {
      heldAt: Date,
      releasedAt: Date,
      releaseCode: String,
    },
    
    refund: {
      amount: Number,
      reason: String,
      requestedAt: Date,
      processedAt: Date,
    },
    
    failureReason: String,
    
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    invoiceUrl: String,
    
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
)

// Indexes
PaymentSchema.index({ shipmentId: 1 })
PaymentSchema.index({ payerId: 1 })
PaymentSchema.index({ payeeId: 1 })
PaymentSchema.index({ status: 1 })
PaymentSchema.index({ type: 1 })
PaymentSchema.index({ stripePaymentIntentId: 1 })
PaymentSchema.index({ invoiceNumber: 1 })
PaymentSchema.index({ createdAt: -1 })

export const Payment: Model<IPayment> = models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema)
