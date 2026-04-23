import mongoose, { Schema, Document, Model, models } from "mongoose"

export type UserRole = "shipper" | "carrier" | "admin"
export type VerificationStatus = "pending" | "approved" | "rejected"

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  email: string
  password?: string
  name: string
  role: UserRole
  phone?: string
  avatar?: string
  
  // Verification
  verificationStatus: VerificationStatus
  verifiedAt?: Date
  verifiedBy?: mongoose.Types.ObjectId
  
  // Documents (Cloudinary URLs)
  documents: {
    governmentId?: string
    businessRegistration?: string
    driversLicense?: string
    vehicleRegistration?: string
    insuranceCertificate?: string
    dotNumber?: string
    mcNumber?: string
  }
  
  // Shipper-specific
  companyName?: string
  companyAddress?: string
  
  // Carrier-specific
  carrierInfo?: {
    vehicleTypes: string[]
    maxWeight: number
    maxDimensions: {
      length: number
      width: number
      height: number
    }
    serviceAreas: string[]
    isAvailable: boolean
  }
  
  // Stats
  stats: {
    totalShipments: number
    completedShipments: number
    cancelledShipments: number
    averageRating: number
    totalReviews: number
    responseRate: number
    responseTime: number // in minutes
  }
  
  // OAuth
  googleId?: string
  appleId?: string
  
  // Settings
  emailNotifications: boolean
  smsNotifications: boolean
  
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["shipper", "carrier", "admin"],
      required: true,
    },
    phone: String,
    avatar: String,
    
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    verifiedAt: Date,
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    
    documents: {
      governmentId: String,
      businessRegistration: String,
      driversLicense: String,
      vehicleRegistration: String,
      insuranceCertificate: String,
      dotNumber: String,
      mcNumber: String,
    },
    
    companyName: String,
    companyAddress: String,
    
    carrierInfo: {
      vehicleTypes: [String],
      maxWeight: Number,
      maxDimensions: {
        length: Number,
        width: Number,
        height: Number,
      },
      serviceAreas: [String],
      isAvailable: {
        type: Boolean,
        default: true,
      },
    },
    
    stats: {
      totalShipments: { type: Number, default: 0 },
      completedShipments: { type: Number, default: 0 },
      cancelledShipments: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
      responseRate: { type: Number, default: 0 },
      responseTime: { type: Number, default: 0 },
    },
    
    googleId: String,
    appleId: String,
    
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
)

// Indexes
UserSchema.index({ email: 1 })
UserSchema.index({ role: 1 })
UserSchema.index({ verificationStatus: 1 })
UserSchema.index({ "carrierInfo.serviceAreas": 1 })
UserSchema.index({ "stats.averageRating": -1 })

export const User: Model<IUser> = models.User || mongoose.model<IUser>("User", UserSchema)
