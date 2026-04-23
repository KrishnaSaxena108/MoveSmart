"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Shield, Lock, CreditCard, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { initializePayment, markPaymentAsHeld } from '@/lib/actions/payments'

// Load Stripe outside of component to avoid recreating on every render
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

interface CheckoutFormProps {
  shipmentId: string
  bidId: string
  amount: number
  carrierName: string
  onSuccess: () => void
}

function CheckoutFormInner({
  paymentId,
  amount,
  carrierName,
  onSuccess,
}: {
  paymentId: string
  amount: number
  carrierName: string
  onSuccess: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/payments/success`,
        },
        redirect: 'if_required',
      })

      if (error) {
        setErrorMessage(error.message || 'Payment failed')
        toast.error(error.message || 'Payment failed')
      } else if (paymentIntent && paymentIntent.status === 'requires_capture') {
        // Payment authorized, mark as held in escrow
        const result = await markPaymentAsHeld(paymentId)
        if (result.success) {
          toast.success('Payment secured in escrow!')
          onSuccess()
        } else {
          setErrorMessage('Payment processed but failed to update status')
        }
      }
    } catch (err) {
      console.error('Payment error:', err)
      setErrorMessage('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-muted/50 p-4 rounded-lg space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Carrier</span>
          <span className="font-medium">{carrierName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Amount</span>
          <span className="text-xl font-bold">${amount.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Funds held in escrow until delivery confirmed</span>
        </div>
      </div>

      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {errorMessage && (
        <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || !elements || isProcessing}
      >
        {isProcessing ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Pay ${amount.toFixed(2)}
          </>
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Secure payment powered by Stripe</span>
      </div>
    </form>
  )
}

export function CheckoutForm({
  shipmentId,
  bidId,
  amount,
  carrierName,
  onSuccess,
}: CheckoutFormProps) {
  const router = useRouter()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const result = await initializePayment(shipmentId, bidId)
        if (result.success && result.data) {
          setClientSecret(result.data.clientSecret)
          setPaymentId(result.data.paymentId)
        } else {
          setError(result.error || 'Failed to initialize payment')
        }
      } catch (err) {
        console.error('Error initializing payment:', err)
        setError('Failed to initialize payment')
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [shipmentId, bidId])

  if (!stripePromise) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-warning">
            <AlertCircle className="h-5 w-5" />
            <p>Payment system is not configured. Please contact support.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!clientSecret || !paymentId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to initialize payment</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Secure Checkout
        </CardTitle>
        <CardDescription>
          Your payment will be held in escrow until you confirm delivery
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#3b82f6',
                borderRadius: '8px',
              },
            },
          }}
        >
          <CheckoutFormInner
            paymentId={paymentId}
            amount={amount}
            carrierName={carrierName}
            onSuccess={() => {
              onSuccess()
              router.refresh()
            }}
          />
        </Elements>
      </CardContent>
    </Card>
  )
}

// Success page component
export function PaymentSuccess() {
  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Payment Successful!</h2>
        <p className="text-muted-foreground mb-6">
          Your payment has been secured in escrow. The carrier has been notified and will
          pick up your shipment as scheduled.
        </p>
        <Button asChild>
          <a href="/dashboard">Go to Dashboard</a>
        </Button>
      </CardContent>
    </Card>
  )
}
