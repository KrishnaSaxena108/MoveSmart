"use server"

import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/mongodb'
import { Payment, Shipment, User, Bid } from '@/lib/db/models'
import {
  createEscrowPayment,
  captureEscrowPayment,
  cancelEscrowPayment,
  issueRefund,
  createConnectAccount,
  getConnectAccountStatus,
  createConnectLoginLink,
} from '@/lib/stripe'
import { revalidatePath } from 'next/cache'

interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Initialize payment for a booked shipment
export async function initializePayment(
  shipmentId: string,
  bidId: string
): Promise<ActionResult<{ clientSecret: string; paymentId: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    await connectDB()

    // Get shipment and verify ownership
    const shipment = await Shipment.findById(shipmentId).populate('shipper')
    if (!shipment) {
      return { success: false, error: 'Shipment not found' }
    }

    if (shipment.shipper._id.toString() !== session.user.id) {
      return { success: false, error: 'Not authorized to pay for this shipment' }
    }

    // Get the accepted bid
    const bid = await Bid.findById(bidId).populate('carrier')
    if (!bid || bid.status !== 'accepted') {
      return { success: false, error: 'Invalid bid' }
    }

    // Get carrier's Stripe account
    const carrier = await User.findById(bid.carrier._id)
    if (!carrier?.stripeAccountId) {
      return { success: false, error: 'Carrier has not set up payment receiving' }
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({
      shipment: shipmentId,
      status: { $in: ['pending', 'held'] },
    })

    if (existingPayment) {
      return {
        success: true,
        data: {
          clientSecret: existingPayment.stripePaymentIntentClientSecret,
          paymentId: existingPayment._id.toString(),
        },
      }
    }

    // Convert bid amount to cents
    const amountInCents = Math.round(bid.amount * 100)
    const platformFee = Math.round(amountInCents * 0.10)

    // Create Stripe payment intent
    const { clientSecret, paymentIntentId } = await createEscrowPayment(
      amountInCents,
      shipmentId,
      session.user.id,
      carrier._id.toString(),
      carrier.stripeAccountId
    )

    // Create payment record
    const payment = await Payment.create({
      shipment: shipmentId,
      shipper: session.user.id,
      carrier: carrier._id,
      bid: bidId,
      amount: bid.amount,
      platformFee: platformFee / 100,
      carrierPayout: (amountInCents - platformFee) / 100,
      currency: 'USD',
      status: 'pending',
      stripePaymentIntentId: paymentIntentId,
      stripePaymentIntentClientSecret: clientSecret,
    })

    return {
      success: true,
      data: {
        clientSecret,
        paymentId: payment._id.toString(),
      },
    }
  } catch (error) {
    console.error('Error initializing payment:', error)
    return { success: false, error: 'Failed to initialize payment' }
  }
}

// Mark payment as held in escrow (called after successful Stripe payment)
export async function markPaymentAsHeld(
  paymentId: string
): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    await connectDB()

    const payment = await Payment.findById(paymentId)
    if (!payment) {
      return { success: false, error: 'Payment not found' }
    }

    if (payment.shipper.toString() !== session.user.id) {
      return { success: false, error: 'Not authorized' }
    }

    payment.status = 'held'
    payment.paidAt = new Date()
    await payment.save()

    // Update shipment status
    await Shipment.findByIdAndUpdate(payment.shipment, {
      status: 'booked',
      'payment.status': 'held',
      'payment.heldAt': new Date(),
    })

    revalidatePath(`/dashboard/shipments/${payment.shipment}`)

    return { success: true }
  } catch (error) {
    console.error('Error marking payment as held:', error)
    return { success: false, error: 'Failed to update payment status' }
  }
}

// Release payment to carrier (called after delivery confirmation)
export async function releasePayment(
  shipmentId: string
): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    await connectDB()

    const shipment = await Shipment.findById(shipmentId)
    if (!shipment) {
      return { success: false, error: 'Shipment not found' }
    }

    // Only shipper or admin can release payment
    if (
      shipment.shipper.toString() !== session.user.id &&
      session.user.role !== 'admin'
    ) {
      return { success: false, error: 'Not authorized to release payment' }
    }

    const payment = await Payment.findOne({
      shipment: shipmentId,
      status: 'held',
    })

    if (!payment) {
      return { success: false, error: 'No held payment found' }
    }

    // Capture the payment in Stripe
    const captured = await captureEscrowPayment(payment.stripePaymentIntentId)
    if (!captured) {
      return { success: false, error: 'Failed to capture payment' }
    }

    // Update payment record
    payment.status = 'released'
    payment.releasedAt = new Date()
    await payment.save()

    // Update shipment
    await Shipment.findByIdAndUpdate(shipmentId, {
      'payment.status': 'released',
      'payment.releasedAt': new Date(),
    })

    revalidatePath(`/dashboard/shipments/${shipmentId}`)

    return { success: true }
  } catch (error) {
    console.error('Error releasing payment:', error)
    return { success: false, error: 'Failed to release payment' }
  }
}

// Request refund
export async function requestRefund(
  shipmentId: string,
  reason: string,
  amount?: number // partial refund amount, or undefined for full
): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    await connectDB()

    const shipment = await Shipment.findById(shipmentId)
    if (!shipment) {
      return { success: false, error: 'Shipment not found' }
    }

    if (shipment.shipper.toString() !== session.user.id) {
      return { success: false, error: 'Not authorized to request refund' }
    }

    const payment = await Payment.findOne({
      shipment: shipmentId,
      status: { $in: ['held', 'released'] },
    })

    if (!payment) {
      return { success: false, error: 'No payment found for refund' }
    }

    // If payment is still held, cancel it
    if (payment.status === 'held') {
      const cancelled = await cancelEscrowPayment(payment.stripePaymentIntentId)
      if (!cancelled) {
        return { success: false, error: 'Failed to cancel payment' }
      }

      payment.status = 'refunded'
      payment.refundedAt = new Date()
      payment.refundReason = reason
      await payment.save()
    } else {
      // Payment already released, need to issue refund
      const refundAmount = amount ? Math.round(amount * 100) : undefined
      const refund = await issueRefund(payment.stripePaymentIntentId, refundAmount)
      
      if (!refund) {
        return { success: false, error: 'Failed to process refund' }
      }

      payment.status = amount ? 'partially_refunded' : 'refunded'
      payment.refundedAt = new Date()
      payment.refundReason = reason
      payment.stripeRefundId = refund.refundId
      if (amount) {
        payment.refundAmount = amount
      }
      await payment.save()
    }

    // Update shipment
    await Shipment.findByIdAndUpdate(shipmentId, {
      'payment.status': 'refunded',
      status: 'cancelled',
    })

    revalidatePath(`/dashboard/shipments/${shipmentId}`)

    return { success: true }
  } catch (error) {
    console.error('Error processing refund:', error)
    return { success: false, error: 'Failed to process refund' }
  }
}

// Set up Stripe Connect for carriers
export async function setupCarrierPayments(): Promise<ActionResult<{ onboardingUrl: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    if (session.user.role !== 'carrier') {
      return { success: false, error: 'Only carriers can set up payment receiving' }
    }

    await connectDB()

    const user = await User.findById(session.user.id)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Check if already has Stripe account
    if (user.stripeAccountId) {
      const status = await getConnectAccountStatus(user.stripeAccountId)
      
      if (status.detailsSubmitted && status.chargesEnabled) {
        // Already set up, return dashboard link
        const loginUrl = await createConnectLoginLink(user.stripeAccountId)
        return { success: true, data: { onboardingUrl: loginUrl } }
      }
    }

    // Create new Connect account
    const { accountId, onboardingUrl } = await createConnectAccount(
      session.user.id,
      user.email
    )

    // Save account ID
    user.stripeAccountId = accountId
    await user.save()

    return { success: true, data: { onboardingUrl } }
  } catch (error) {
    console.error('Error setting up carrier payments:', error)
    return { success: false, error: 'Failed to set up payment receiving' }
  }
}

// Get carrier payout status
export async function getCarrierPayoutStatus(): Promise<ActionResult<{
  isSetUp: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  pendingPayouts: number
  totalEarnings: number
}>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    await connectDB()

    const user = await User.findById(session.user.id)
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    let stripeStatus = {
      chargesEnabled: false,
      payoutsEnabled: false,
    }

    if (user.stripeAccountId) {
      stripeStatus = await getConnectAccountStatus(user.stripeAccountId)
    }

    // Get payment stats
    const payments = await Payment.find({
      carrier: session.user.id,
      status: { $in: ['held', 'released'] },
    })

    const pendingPayouts = payments
      .filter((p) => p.status === 'held')
      .reduce((sum, p) => sum + p.carrierPayout, 0)

    const totalEarnings = payments
      .filter((p) => p.status === 'released')
      .reduce((sum, p) => sum + p.carrierPayout, 0)

    return {
      success: true,
      data: {
        isSetUp: !!user.stripeAccountId,
        chargesEnabled: stripeStatus.chargesEnabled,
        payoutsEnabled: stripeStatus.payoutsEnabled,
        pendingPayouts,
        totalEarnings,
      },
    }
  } catch (error) {
    console.error('Error getting payout status:', error)
    return { success: false, error: 'Failed to get payout status' }
  }
}

// Get payment history
export async function getPaymentHistory(options?: {
  limit?: number
  offset?: number
}): Promise<ActionResult<{
  payments: Array<{
    _id: string
    amount: number
    status: string
    createdAt: Date
    shipment: {
      _id: string
      title: string
    }
  }>
  total: number
}>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    await connectDB()

    const query = session.user.role === 'carrier'
      ? { carrier: session.user.id }
      : { shipper: session.user.id }

    const total = await Payment.countDocuments(query)
    
    const payments = await Payment.find(query)
      .populate('shipment', 'title')
      .sort({ createdAt: -1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 20)
      .lean()

    return {
      success: true,
      data: {
        payments: payments.map((p) => ({
          _id: p._id.toString(),
          amount: session.user.role === 'carrier' ? p.carrierPayout : p.amount,
          status: p.status,
          createdAt: p.createdAt,
          shipment: {
            _id: p.shipment._id.toString(),
            title: p.shipment.title,
          },
        })),
        total,
      },
    }
  } catch (error) {
    console.error('Error getting payment history:', error)
    return { success: false, error: 'Failed to get payment history' }
  }
}
