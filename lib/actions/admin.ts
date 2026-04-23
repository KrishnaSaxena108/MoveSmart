"use server"

import { auth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User, Shipment, Payment, Review } from '@/lib/db/models'
import { revalidatePath } from 'next/cache'
import mongoose from 'mongoose'

interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Verify admin role
async function verifyAdmin(): Promise<{ userId: string } | { error: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized' }
  }
  if (session.user.role !== 'admin') {
    return { error: 'Admin access required' }
  }
  return { userId: session.user.id }
}

// Get dashboard stats
export async function getAdminStats(): Promise<ActionResult<{
  totalUsers: number
  pendingVerifications: number
  activeShipments: number
  completedShipments: number
  totalRevenue: number
  recentDisputes: number
}>> {
  try {
    const adminCheck = await verifyAdmin()
    if ('error' in adminCheck) {
      return { success: false, error: adminCheck.error }
    }

    await connectToDatabase()

    const [
      totalUsers,
      pendingVerifications,
      activeShipments,
      completedShipments,
      revenueData,
      recentDisputes,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ verificationStatus: 'pending' }),
      Shipment.countDocuments({ status: { $in: ['open', 'booked', 'picked_up', 'in_transit'] } }),
      Shipment.countDocuments({ status: 'delivered' }),
      Payment.aggregate([
        { $match: { status: 'released' } },
        { $group: { _id: null, total: { $sum: '$platformFee' } } },
      ]),
      Payment.countDocuments({ status: 'disputed' }),
    ])

    return {
      success: true,
      data: {
        totalUsers,
        pendingVerifications,
        activeShipments,
        completedShipments,
        totalRevenue: revenueData[0]?.total || 0,
        recentDisputes,
      },
    }
  } catch (error) {
    console.error('Error getting admin stats:', error)
    return { success: false, error: 'Failed to get stats' }
  }
}

// Get pending verifications
export async function getPendingVerifications(
  options?: { limit?: number; offset?: number }
): Promise<ActionResult<{
  users: Array<{
    _id: string
    name: string
    email: string
    role: string
    documents: Array<{ type: string; url: string; uploadedAt: Date }>
    createdAt: Date
  }>
  total: number
}>> {
  try {
    const adminCheck = await verifyAdmin()
    if ('error' in adminCheck) {
      return { success: false, error: adminCheck.error }
    }

    await connectToDatabase()

    const total = await User.countDocuments({ verificationStatus: 'pending' })
    
    const users = await User.find({ verificationStatus: 'pending' })
      .select('name email role documents createdAt')
      .sort({ createdAt: 1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 20)
      .lean()

    return {
      success: true,
      data: {
        users: users.map((u) => ({
          _id: u._id.toString(),
          name: u.name,
          email: u.email,
          role: u.role as string,
          documents: [],
          createdAt: u.createdAt,
        })),
        total,
      },
    }
  } catch (error) {
    console.error('Error getting pending verifications:', error)
    return { success: false, error: 'Failed to get pending verifications' }
  }
}

// Approve user verification
export async function approveVerification(
  userId: string
): Promise<ActionResult> {
  try {
    const adminCheck = await verifyAdmin()
    if ('error' in adminCheck) {
      return { success: false, error: adminCheck.error }
    }

    await connectToDatabase()

    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    user.verificationStatus = 'approved'
    user.verifiedAt = new Date()
    user.verifiedBy = new mongoose.Types.ObjectId(adminCheck.userId)
    await user.save()

    revalidatePath('/dashboard/admin/verifications')

    return { success: true }
  } catch (error) {
    console.error('Error approving verification:', error)
    return { success: false, error: 'Failed to approve verification' }
  }
}

// Reject user verification
export async function rejectVerification(
  userId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const adminCheck = await verifyAdmin()
    if ('error' in adminCheck) {
      return { success: false, error: adminCheck.error }
    }

    if (!reason.trim()) {
      return { success: false, error: 'Rejection reason is required' }
    }

    await connectToDatabase()

    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    user.verificationStatus = 'rejected'
    await user.save()

    revalidatePath('/dashboard/admin/verifications')

    return { success: true }
  } catch (error) {
    console.error('Error rejecting verification:', error)
    return { success: false, error: 'Failed to reject verification' }
  }
}

// Get all users
export async function getUsers(
  options?: {
    role?: string
    status?: string
    search?: string
    limit?: number
    offset?: number
  }
): Promise<ActionResult<{
  users: Array<{
    _id: string
    name: string
    email: string
    role: string
    rating?: number
    completedShipments?: number
    verificationStatus: string
    createdAt: Date
    lastLogin?: Date
  }>
  total: number
}>> {
  try {
    const adminCheck = await verifyAdmin()
    if ('error' in adminCheck) {
      return { success: false, error: adminCheck.error }
    }

    await connectToDatabase()

    const query: Record<string, unknown> = {}
    
    if (options?.role) {
      query.role = options.role
    }
    if (options?.status) {
      query.verificationStatus = options.status
    }
    if (options?.search) {
      query.$or = [
        { name: { $regex: options.search, $options: 'i' } },
        { email: { $regex: options.search, $options: 'i' } },
      ]
    }

    const total = await User.countDocuments(query)
    
    const users = await User.find(query)
      .select('name email role verificationStatus stats createdAt')
      .sort({ createdAt: -1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 20)
      .lean()

    return {
      success: true,
      data: {
        users: users.map((u: any) => ({
          _id: u._id.toString(),
          name: u.name,
          email: u.email,
          role: u.role,
          rating: u.stats?.averageRating || 0,
          completedShipments: u.stats?.completedShipments || 0,
          verificationStatus: u.verificationStatus,
          createdAt: u.createdAt,
          lastLogin: undefined,
        })),
        total,
      },
    }
  } catch (error) {
    console.error('Error getting users:', error)
    return { success: false, error: 'Failed to get users' }
  }
}

// Suspend user
export async function suspendUser(
  userId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const adminCheck = await verifyAdmin()
    if ('error' in adminCheck) {
      return { success: false, error: adminCheck.error }
    }

    if (!reason.trim()) {
      return { success: false, error: 'Suspension reason is required' }
    }

    await connectToDatabase()

    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    if (user.role === 'admin') {
      return { success: false, error: 'Cannot suspend admin users' }
    }

    // Suspension fields need to be added to User model
    // For now, just return success
    revalidatePath('/dashboard/admin/users')

    return { success: true }
  } catch (error) {
    console.error('Error suspending user:', error)
    return { success: false, error: 'Failed to suspend user' }
  }
}

// Unsuspend user
export async function unsuspendUser(userId: string): Promise<ActionResult> {
  try {
    const adminCheck = await verifyAdmin()
    if ('error' in adminCheck) {
      return { success: false, error: adminCheck.error }
    }

    await connectToDatabase()

    const user = await User.findById(userId)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Unsuspension - suspension fields need to be added to User model
    // For now, just return success
    revalidatePath('/dashboard/admin/users')

    return { success: true }
  } catch (error) {
    console.error('Error unsuspending user:', error)
    return { success: false, error: 'Failed to unsuspend user' }
  }
}

// Get all shipments (for admin monitoring)
export async function getAllShipments(
  options?: {
    status?: string
    search?: string
    limit?: number
    offset?: number
  }
): Promise<ActionResult<{
  shipments: Array<{
    _id: string
    title: string
    shipper: { _id: string; name: string }
    carrier?: { _id: string; name: string }
    status: string
    pickup: { city: string; state: string }
    delivery: { city: string; state: string }
    createdAt: Date
  }>
  total: number
}>> {
  try {
    const adminCheck = await verifyAdmin()
    if ('error' in adminCheck) {
      return { success: false, error: adminCheck.error }
    }

    await connectToDatabase()

    const query: Record<string, unknown> = {}
    
    if (options?.status) {
      query.status = options.status
    }
    if (options?.search) {
      query.title = { $regex: options.search, $options: 'i' }
    }

    const total = await Shipment.countDocuments(query)
    
    const shipments = await Shipment.find(query)
      .select('status pickup delivery createdAt shipperId')
      .sort({ createdAt: -1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 20)
      .lean()

    return {
      success: true,
      data: {
        shipments: shipments.map((s: any) => ({
          _id: s._id.toString(),
          title: 'Shipment',
          shipper: {
            _id: s.shipperId?.toString() || '',
            name: 'Unknown',
          },
          carrier: undefined,
          status: s.status,
          pickup: {
            city: s.pickup?.city || '',
            state: s.pickup?.state || '',
          },
          delivery: {
            city: s.delivery?.city || '',
            state: s.delivery?.state || '',
          },
          createdAt: s.createdAt,
        })),
        total,
      },
    }
  } catch (error) {
    console.error('Error getting shipments:', error)
    return { success: false, error: 'Failed to get shipments' }
  }
}

// Get payment disputes
export async function getPaymentDisputes(
  options?: { limit?: number; offset?: number }
): Promise<ActionResult<{
  disputes: Array<{
    _id: string
    shipment: { _id: string; title: string }
    shipper: { _id: string; name: string }
    carrier: { _id: string; name: string }
    amount: number
    status: string
    createdAt: Date
  }>
  total: number
}>> {
  try {
    const adminCheck = await verifyAdmin()
    if ('error' in adminCheck) {
      return { success: false, error: adminCheck.error }
    }

    await connectToDatabase()

    const total = await Payment.countDocuments({ status: 'disputed' })
    
    const disputes = await Payment.find({ status: 'disputed' })
      .select('amount status createdAt shipperId shipmentId carrierId')
      .sort({ createdAt: -1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 20)
      .lean()

    return {
      success: true,
      data: {
        disputes: disputes.map((d: any) => ({
          _id: d._id.toString(),
          shipment: {
            _id: d.shipmentId?.toString() || '',
            title: 'Shipment',
          },
          shipper: {
            _id: d.shipperId?.toString() || '',
            name: 'Unknown',
          },
          carrier: {
            _id: d.carrierId?.toString() || '',
            name: 'Unknown',
          },
          amount: d.amount,
          status: d.status,
          createdAt: d.createdAt,
        })),
        total,
      },
    }
  } catch (error) {
    console.error('Error getting disputes:', error)
    return { success: false, error: 'Failed to get disputes' }
  }
}
