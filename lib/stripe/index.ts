/**
 * JOLLY420 - STRIPE PAYMENT CONFIGURATION
 * 
 * Required environment variables:
 * 
 * 1. Create a Stripe account at https://stripe.com
 * 2. Go to https://dashboard.stripe.com/test/apikeys
 * 
 * STRIPE_SECRET_KEY=sk_test_... (starts with sk_test_ for test mode)
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (starts with pk_test_ for test mode)
 * 
 * 3. For webhooks (needed for payment confirmations):
 *    Go to https://dashboard.stripe.com/test/webhooks
 *    Create endpoint: https://your-domain.vercel.app/api/webhooks/stripe
 *    Events to subscribe: payment_intent.succeeded, payment_intent.payment_failed, checkout.session.completed
 *    
 * STRIPE_WEBHOOK_SECRET=whsec_... (from webhook endpoint details)
 * 
 * 4. For Connect (carrier payouts):
 *    Enable Connect at https://dashboard.stripe.com/connect/accounts
 *    
 * NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app (or http://localhost:3000 for dev)
 */
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set - payment features disabled')
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  : null

export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY.')
  }
  return stripe
}

// Create a Stripe Connect account for carriers
export async function createConnectAccount(
  userId: string,
  email: string,
  type: 'express' | 'standard' = 'express'
): Promise<{ accountId: string; onboardingUrl: string }> {
  const stripeInstance = getStripe()

  const account = await stripeInstance.accounts.create({
    type,
    email,
    metadata: {
      userId,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  })

  const accountLink = await stripeInstance.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/payments?refresh=true`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/payments?success=true`,
    type: 'account_onboarding',
  })

  return {
    accountId: account.id,
    onboardingUrl: accountLink.url,
  }
}

// Create payment intent for escrow
export async function createEscrowPayment(
  amount: number, // in cents
  shipmentId: string,
  shipperId: string,
  carrierId: string,
  carrierStripeAccountId: string
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripeInstance = getStripe()

  // Calculate platform fee (e.g., 10%)
  const platformFee = Math.round(amount * 0.10)

  const paymentIntent = await stripeInstance.paymentIntents.create({
    amount,
    currency: 'usd',
    metadata: {
      shipmentId,
      shipperId,
      carrierId,
      type: 'escrow',
    },
    // Transfer to carrier after capture, minus platform fee
    transfer_data: {
      destination: carrierStripeAccountId,
      amount: amount - platformFee,
    },
    // Don't capture immediately - hold in escrow
    capture_method: 'manual',
  })

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  }
}

// Capture payment (release from escrow to carrier)
export async function captureEscrowPayment(paymentIntentId: string): Promise<boolean> {
  const stripeInstance = getStripe()

  try {
    await stripeInstance.paymentIntents.capture(paymentIntentId)
    return true
  } catch (error) {
    console.error('Error capturing payment:', error)
    return false
  }
}

// Cancel payment intent (refund to shipper)
export async function cancelEscrowPayment(paymentIntentId: string): Promise<boolean> {
  const stripeInstance = getStripe()

  try {
    await stripeInstance.paymentIntents.cancel(paymentIntentId)
    return true
  } catch (error) {
    console.error('Error canceling payment:', error)
    return false
  }
}

// Issue refund
export async function issueRefund(
  paymentIntentId: string,
  amount?: number // partial refund in cents, or undefined for full refund
): Promise<{ refundId: string } | null> {
  const stripeInstance = getStripe()

  try {
    const refund = await stripeInstance.refunds.create({
      payment_intent: paymentIntentId,
      amount,
    })
    return { refundId: refund.id }
  } catch (error) {
    console.error('Error issuing refund:', error)
    return null
  }
}

// Get Stripe Connect account status
export async function getConnectAccountStatus(accountId: string): Promise<{
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
}> {
  const stripeInstance = getStripe()

  const account = await stripeInstance.accounts.retrieve(accountId)

  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  }
}

// Create a login link for Connect dashboard
export async function createConnectLoginLink(accountId: string): Promise<string> {
  const stripeInstance = getStripe()

  const loginLink = await stripeInstance.accounts.createLoginLink(accountId)
  return loginLink.url
}
