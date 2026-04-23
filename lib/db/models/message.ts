import mongoose, { Schema, Document, Model, models } from "mongoose"

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId
  conversationId: mongoose.Types.ObjectId
  senderId: mongoose.Types.ObjectId
  
  content: string
  attachments: Array<{
    type: "image" | "document"
    url: string
    name: string
    size: number
  }>
  
  isRead: boolean
  readAt?: Date
  
  // System messages
  isSystem: boolean
  systemType?: "bid_placed" | "bid_accepted" | "shipment_booked" | "status_update"
  
  createdAt: Date
  updatedAt: Date
}

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId
  shipmentId: mongoose.Types.ObjectId
  participants: mongoose.Types.ObjectId[]
  
  lastMessage?: {
    content: string
    senderId: mongoose.Types.ObjectId
    createdAt: Date
  }
  
  unreadCount: {
    [key: string]: number
  }
  
  isActive: boolean
  
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    content: {
      type: String,
      required: true,
    },
    attachments: [{
      type: { type: String, enum: ["image", "document"] },
      url: String,
      name: String,
      size: Number,
    }],
    
    isRead: { type: Boolean, default: false },
    readAt: Date,
    
    isSystem: { type: Boolean, default: false },
    systemType: {
      type: String,
      enum: ["bid_placed", "bid_accepted", "shipment_booked", "status_update"],
    },
  },
  {
    timestamps: true,
  }
)

const ConversationSchema = new Schema<IConversation>(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: "Shipment",
      required: true,
    },
    participants: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    
    lastMessage: {
      content: String,
      senderId: { type: Schema.Types.ObjectId, ref: "User" },
      createdAt: Date,
    },
    
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
)

// Indexes
MessageSchema.index({ conversationId: 1 })
MessageSchema.index({ senderId: 1 })
MessageSchema.index({ createdAt: -1 })

ConversationSchema.index({ shipmentId: 1 })
ConversationSchema.index({ participants: 1 })
ConversationSchema.index({ updatedAt: -1 })

export const Message: Model<IMessage> = models.Message || mongoose.model<IMessage>("Message", MessageSchema)
export const Conversation: Model<IConversation> = models.Conversation || mongoose.model<IConversation>("Conversation", ConversationSchema)
