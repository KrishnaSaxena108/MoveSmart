import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IConversation extends Document {
  shipment: mongoose.Types.ObjectId
  participants: mongoose.Types.ObjectId[]
  lastMessage?: mongoose.Types.ObjectId
  lastMessageAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ConversationSchema = new Schema<IConversation>(
  {
    shipment: {
      type: Schema.Types.ObjectId,
      ref: 'Shipment',
      required: true,
      index: true,
    },
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastMessageAt: Date,
  },
  {
    timestamps: true,
  }
)

// Compound index for finding conversations between participants for a shipment
ConversationSchema.index({ shipment: 1, participants: 1 })

// Index for listing user's conversations sorted by recent activity
ConversationSchema.index({ participants: 1, lastMessageAt: -1 })

export const Conversation: Model<IConversation> =
  mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema)
