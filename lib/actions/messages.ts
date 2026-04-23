"use server"

import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/mongodb'
import { Message, Shipment, Conversation } from '@/lib/db/models'
import { publishToChannel } from '@/lib/ably/server'
import { revalidatePath } from 'next/cache'
import mongoose from 'mongoose'

interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Get or create conversation for a shipment
export async function getOrCreateConversation(
  shipmentId: string,
  participantId: string
): Promise<ActionResult<{ conversationId: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    await connectDB()

    // Verify shipment exists
    const shipment = await Shipment.findById(shipmentId)
    if (!shipment) {
      return { success: false, error: 'Shipment not found' }
    }

    // Check if user is authorized (shipper, assigned carrier, or admin)
    const isShipper = shipment.shipper.toString() === session.user.id
    const isCarrier = shipment.assignedCarrier?.toString() === session.user.id
    const isParticipant = participantId === session.user.id
    const isAdmin = session.user.role === 'admin'

    if (!isShipper && !isCarrier && !isAdmin) {
      return { success: false, error: 'Not authorized to message on this shipment' }
    }

    // Find or create conversation
    const participants = [session.user.id, participantId].sort()
    
    let conversation = await Conversation.findOne({
      shipment: shipmentId,
      participants: { $all: participants },
    })

    if (!conversation) {
      conversation = await Conversation.create({
        shipment: shipmentId,
        participants: participants.map(id => new mongoose.Types.ObjectId(id)),
      })
    }

    return {
      success: true,
      data: { conversationId: conversation._id.toString() },
    }
  } catch (error) {
    console.error('Error getting conversation:', error)
    return { success: false, error: 'Failed to get conversation' }
  }
}

// Send a message
export async function sendMessage(
  conversationId: string,
  content: string,
  attachments?: Array<{ url: string; type: string; name: string }>
): Promise<ActionResult<{ messageId: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    if (!content.trim() && (!attachments || attachments.length === 0)) {
      return { success: false, error: 'Message cannot be empty' }
    }

    await connectDB()

    // Verify conversation and participation
    const conversation = await Conversation.findById(conversationId)
    if (!conversation) {
      return { success: false, error: 'Conversation not found' }
    }

    const isParticipant = conversation.participants.some(
      (p: mongoose.Types.ObjectId) => p.toString() === session.user.id
    )
    if (!isParticipant && session.user.role !== 'admin') {
      return { success: false, error: 'Not authorized to send messages in this conversation' }
    }

    // Create message
    const message = await Message.create({
      conversation: conversationId,
      sender: session.user.id,
      content: content.trim(),
      attachments,
    })

    // Update conversation
    conversation.lastMessage = message._id
    conversation.lastMessageAt = new Date()
    await conversation.save()

    // Publish real-time update
    await publishToChannel(
      `conversation:${conversationId}`,
      'message:new',
      {
        messageId: message._id.toString(),
        senderId: session.user.id,
        senderName: session.user.name,
        content: content.trim(),
        attachments,
        createdAt: message.createdAt,
      }
    )

    revalidatePath(`/dashboard/messages/${conversationId}`)

    return {
      success: true,
      data: { messageId: message._id.toString() },
    }
  } catch (error) {
    console.error('Error sending message:', error)
    return { success: false, error: 'Failed to send message' }
  }
}

// Get messages for a conversation
export async function getMessages(
  conversationId: string,
  options?: { limit?: number; before?: string }
): Promise<ActionResult<{
  messages: Array<{
    _id: string
    sender: { _id: string; name: string; image?: string }
    content: string
    attachments?: Array<{ url: string; type: string; name: string }>
    read: boolean
    createdAt: Date
  }>
  hasMore: boolean
}>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    await connectDB()

    // Verify conversation and participation
    const conversation = await Conversation.findById(conversationId)
    if (!conversation) {
      return { success: false, error: 'Conversation not found' }
    }

    const isParticipant = conversation.participants.some(
      (p: mongoose.Types.ObjectId) => p.toString() === session.user.id
    )
    if (!isParticipant && session.user.role !== 'admin') {
      return { success: false, error: 'Not authorized to view this conversation' }
    }

    const limit = options?.limit || 50
    const query: Record<string, unknown> = { conversation: conversationId }
    
    if (options?.before) {
      query._id = { $lt: new mongoose.Types.ObjectId(options.before) }
    }

    const messages = await Message.find(query)
      .populate('sender', 'name image')
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean()

    const hasMore = messages.length > limit
    const result = messages.slice(0, limit).reverse()

    // Mark messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: session.user.id },
        read: false,
      },
      { read: true, readAt: new Date() }
    )

    return {
      success: true,
      data: {
        messages: result.map((m) => ({
          _id: m._id.toString(),
          sender: {
            _id: m.sender._id.toString(),
            name: m.sender.name,
            image: m.sender.image,
          },
          content: m.content,
          attachments: m.attachments,
          read: m.read,
          createdAt: m.createdAt,
        })),
        hasMore,
      },
    }
  } catch (error) {
    console.error('Error getting messages:', error)
    return { success: false, error: 'Failed to get messages' }
  }
}

// Get all conversations for current user
export async function getConversations(): Promise<ActionResult<Array<{
  _id: string
  shipment: { _id: string; title: string }
  otherParticipant: { _id: string; name: string; image?: string }
  lastMessage?: { content: string; createdAt: Date }
  unreadCount: number
}>>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    await connectDB()

    const conversations = await Conversation.find({
      participants: session.user.id,
    })
      .populate('shipment', 'title')
      .populate('participants', 'name image')
      .populate('lastMessage', 'content createdAt')
      .sort({ lastMessageAt: -1 })
      .lean()

    // Get unread counts
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: session.user.id },
          read: false,
        })

        const otherParticipant = conv.participants.find(
          (p: { _id: mongoose.Types.ObjectId }) => p._id.toString() !== session.user.id
        )

        return {
          _id: conv._id.toString(),
          shipment: {
            _id: conv.shipment._id.toString(),
            title: conv.shipment.title,
          },
          otherParticipant: otherParticipant
            ? {
                _id: otherParticipant._id.toString(),
                name: otherParticipant.name,
                image: otherParticipant.image,
              }
            : { _id: '', name: 'Unknown' },
          lastMessage: conv.lastMessage
            ? {
                content: conv.lastMessage.content,
                createdAt: conv.lastMessage.createdAt,
              }
            : undefined,
          unreadCount,
        }
      })
    )

    return { success: true, data: conversationsWithUnread }
  } catch (error) {
    console.error('Error getting conversations:', error)
    return { success: false, error: 'Failed to get conversations' }
  }
}
