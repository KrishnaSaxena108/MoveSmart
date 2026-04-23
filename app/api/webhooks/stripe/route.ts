import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import connectDB from '@/lib/db/mongodb'
import { Payment, Shipment } from '@/lib/db/models'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    })
  : null

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: Request) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    )
  }

  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  await connectDB()

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Update payment record
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          {
            status: paymentIntent.capture_method === 'manual' ? 'held' : 'released',
            paidAt: new Date(),
          }
        )
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          {
            status: 'failed',
            failureReason: paymentIntent.last_payment_error?.message,
          }
        )
        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        const payment = await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { status: 'cancelled' }
        )

        if (payment) {
          await Shipment.findByIdAndUpdate(payment.shipment, {
            'payment.status': 'cancelled',
          })
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        
        if (charge.payment_intent) {
          const refundAmount = charge.amount_refunded / 100
          const isFullRefund = charge.amount_refunded === charge.amount

          await Payment.findOneAndUpdate(
            { stripePaymentIntentId: charge.payment_intent },
            {
              status: isFullRefund ? 'refunded' : 'partially_refunded',
              refundedAt: new Date(),
              refundAmount: refundAmount,
            }
          )
        }
        break
      }

      case 'account.updated': {
        // Handle Connect account updates
        const account = event.data.object as Stripe.Account
        console.log('Connect account updated:', account.id, {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
        })
        break
      }

      case 'transfer.created': {
        // Log transfer for carrier payout tracking
        const transfer = event.data.object as Stripe.Transfer
        console.log('Transfer created:', transfer.id, transfer.amount / 100)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
