import mongoose, { Schema, Document, Model, models } from "mongoose"

export type ShipmentStatus = 
  | "draft"
  | "pending"
  | "open"
  | "booked"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "cancelled"
  | "disputed"

export type ListingType = "auction" | "instant"

export type ItemCategory = 
  | "vehicle"
  | "furniture"
  | "freight"
  | "household"
  | "equipment"
  | "machinery"
  | "pallets"
  | "other"

export interface ILocation {
  address: string
  city: string
  state: string
  zipCode?: string
  country: string
  coordinates: {
    type: "Point"
    coordinates: [number, number] // [longitude, latitude]
  }
}

export interface IShipment extends Document {
  _id: mongoose.Types.ObjectId
  shipperId: mongoose.Types.ObjectId
  carrierId?: mongoose.Types.ObjectId
  
  // Locations
  pickup: ILocation & {
    dateWindow: {
      start: Date
      end: Date
    }
    contactName?: string
    contactPhone?: string
    instructions?: string
  }
  delivery: ILocation & {
    dateWindow: {
      start: Date
      end: Date
    }
    contactName?: string
    contactPhone?: string
    instructions?: string
  }
  
  // Distance & Route
  distance: number // in kilometers
  estimatedDuration: number // in minutes
  
  // Item Details
  items: Array<{
    description: string
    category: ItemCategory
    quantity: number
    weight: number // in kg
    dimensions?: {
      length: number
      width: number
      height: number
    }
    photos: string[] // Cloudinary URLs
    specialHandling: string[]
  }>
  
  totalWeight: number
  
  // Listing Info
  listingType: ListingType
  status: ShipmentStatus
  
  // Pricing
  pricing: {
    budget?: number // Shipper's budget for auction
    fixedPrice?: number // For instant bookings
    acceptedPrice?: number // Final accepted price
    platformFee?: number
    carrierPayout?: number
  }
  
  // Auction specific
  auction?: {
    endsAt: Date
    minBid?: number
    totalBids: number
  }
  
  // Instant specific
  instant?: {
    expiresAt: Date
    isUrgent: boolean
  }
  
  // Tracking
  tracking?: {
    currentLocation?: {
      type: "Point"
      coordinates: [number, number]
    }
    lastUpdated?: Date
    eta?: Date
    statusHistory: Array<{
      status: ShipmentStatus
      timestamp: Date
      note?: string
      location?: {
        type: "Point"
        coordinates: [number, number]
      }
    }>
  }
  
  // Delivery Confirmation
  deliveryConfirmation?: {
    photos: string[]
    signature?: string
    confirmedAt: Date
    confirmedBy: "shipper" | "carrier"
    notes?: string
  }
  
  // Meta
  viewCount: number
  bidCount: number
  
  createdAt: Date
  updatedAt: Date
}

const LocationSchema = new Schema({
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, default: "" },
  country: { type: String, default: "USA" },
  coordinates: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true },
  },
}, { _id: false })

const ShipmentSchema = new Schema<IShipment>(
  {
    shipperId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    carrierId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    
    pickup: {
      ...LocationSchema.obj,
      dateWindow: {
        start: { type: Date, required: true },
        end: { type: Date, required: true },
      },
      contactName: String,
      contactPhone: String,
      instructions: String,
    },
    delivery: {
      ...LocationSchema.obj,
      dateWindow: {
        start: { type: Date, required: true },
        end: { type: Date, required: true },
      },
      contactName: String,
      contactPhone: String,
      instructions: String,
    },
    
    distance: { type: Number, required: true },
    estimatedDuration: { type: Number, required: true },
    
    items: [{
      description: { type: String, required: true },
      category: {
        type: String,
        enum: ["vehicle", "furniture", "freight", "household", "equipment", "machinery", "pallets", "other"],
        required: true,
      },
      quantity: { type: Number, default: 1 },
      weight: { type: Number, required: true },
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
      },
      photos: [String],
      specialHandling: [String],
    }],
    
    totalWeight: { type: Number, required: true },
    
    listingType: {
      type: String,
      enum: ["auction", "instant"],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "pending", "open", "booked", "picked_up", "in_transit", "delivered", "cancelled", "disputed"],
      default: "draft",
    },
    
    pricing: {
      budget: Number,
      fixedPrice: Number,
      acceptedPrice: Number,
      platformFee: Number,
      carrierPayout: Number,
    },
    
    auction: {
      endsAt: Date,
      minBid: Number,
      totalBids: { type: Number, default: 0 },
    },
    
    instant: {
      expiresAt: Date,
      isUrgent: { type: Boolean, default: false },
    },
    
    tracking: {
      currentLocation: {
        type: { type: String, enum: ["Point"] },
        coordinates: [Number],
      },
      lastUpdated: Date,
      eta: Date,
      statusHistory: [{
        status: String,
        timestamp: Date,
        note: String,
        location: {
          type: { type: String, enum: ["Point"] },
          coordinates: [Number],
        },
      }],
    },
    
    deliveryConfirmation: {
      photos: [String],
      signature: String,
      confirmedAt: Date,
      confirmedBy: { type: String, enum: ["shipper", "carrier"] },
      notes: String,
    },
    
    viewCount: { type: Number, default: 0 },
    bidCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
)

// Geospatial indexes
ShipmentSchema.index({ "pickup.coordinates": "2dsphere" })
ShipmentSchema.index({ "delivery.coordinates": "2dsphere" })
ShipmentSchema.index({ "tracking.currentLocation": "2dsphere" })

// Query indexes
ShipmentSchema.index({ status: 1 })
ShipmentSchema.index({ listingType: 1 })
ShipmentSchema.index({ shipperId: 1 })
ShipmentSchema.index({ carrierId: 1 })
ShipmentSchema.index({ "items.category": 1 })
ShipmentSchema.index({ totalWeight: 1 })
ShipmentSchema.index({ "pricing.budget": 1 })
ShipmentSchema.index({ "pickup.dateWindow.start": 1 })
ShipmentSchema.index({ createdAt: -1 })

export const Shipment: Model<IShipment> = models.Shipment || mongoose.model<IShipment>("Shipment", ShipmentSchema)
