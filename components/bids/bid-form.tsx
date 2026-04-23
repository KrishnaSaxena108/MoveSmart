"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { CalendarIcon, DollarSign, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { submitBid } from '@/lib/actions/bids'
import { toast } from 'sonner'

interface BidFormProps {
  shipmentId: string
  suggestedPrice?: number
  minimumBid?: number
  currentLowestBid?: number
  pickupDate: Date
  onSuccess?: () => void
}

export function BidForm({
  shipmentId,
  suggestedPrice,
  minimumBid = 0,
  currentLowestBid,
  pickupDate,
  onSuccess,
}: BidFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [amount, setAmount] = useState(suggestedPrice?.toString() || '')
  const [notes, setNotes] = useState('')
  const [estimatedPickup, setEstimatedPickup] = useState<Date>(new Date(pickupDate))
  const [estimatedDelivery, setEstimatedDelivery] = useState<Date>(addDays(new Date(pickupDate), 2))
  const [validUntil, setValidUntil] = useState<Date>(addDays(new Date(), 3))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    const bidAmount = parseFloat(amount)
    if (isNaN(bidAmount) || bidAmount <= 0) {
      newErrors.amount = 'Please enter a valid bid amount'
    } else if (bidAmount < minimumBid) {
      newErrors.amount = `Minimum bid is $${minimumBid.toFixed(2)}`
    }

    if (!estimatedPickup) {
      newErrors.estimatedPickup = 'Please select an estimated pickup date'
    }

    if (!estimatedDelivery) {
      newErrors.estimatedDelivery = 'Please select an estimated delivery date'
    } else if (estimatedPickup && estimatedDelivery < estimatedPickup) {
      newErrors.estimatedDelivery = 'Delivery date must be after pickup date'
    }

    if (!validUntil) {
      newErrors.validUntil = 'Please select a quote expiration date'
    } else if (validUntil < new Date()) {
      newErrors.validUntil = 'Expiration date must be in the future'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const result = await submitBid({
        shipmentId,
        amount: parseFloat(amount),
        notes: notes.trim() || undefined,
        estimatedPickup,
        estimatedDelivery,
        validUntil,
      })

      if (result.success) {
        toast.success('Bid submitted successfully!')
        onSuccess?.()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to submit bid')
      }
    } catch (error) {
      console.error('Error submitting bid:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const bidAmount = parseFloat(amount) || 0
  const isBelowLowest = currentLowestBid && bidAmount > 0 && bidAmount < currentLowestBid

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Place Your Bid
        </CardTitle>
        <CardDescription>
          Submit a competitive quote for this shipment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bid Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Your Bid Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={minimumBid}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={cn("pl-10", errors.amount && "border-destructive")}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.amount}
              </p>
            )}
            {currentLowestBid && (
              <p className="text-sm text-muted-foreground">
                Current lowest bid: ${currentLowestBid.toFixed(2)}
              </p>
            )}
            {isBelowLowest && (
              <p className="text-sm text-success flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Your bid is below the current lowest!
              </p>
            )}
          </div>

          {/* Estimated Pickup Date */}
          <div className="space-y-2">
            <Label>Estimated Pickup Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !estimatedPickup && "text-muted-foreground",
                    errors.estimatedPickup && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {estimatedPickup ? format(estimatedPickup, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={estimatedPickup}
                  onSelect={(date) => date && setEstimatedPickup(date)}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.estimatedPickup && (
              <p className="text-sm text-destructive">{errors.estimatedPickup}</p>
            )}
          </div>

          {/* Estimated Delivery Date */}
          <div className="space-y-2">
            <Label>Estimated Delivery Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !estimatedDelivery && "text-muted-foreground",
                    errors.estimatedDelivery && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {estimatedDelivery ? format(estimatedDelivery, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={estimatedDelivery}
                  onSelect={(date) => date && setEstimatedDelivery(date)}
                  disabled={(date) => date < estimatedPickup}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.estimatedDelivery && (
              <p className="text-sm text-destructive">{errors.estimatedDelivery}</p>
            )}
          </div>

          {/* Quote Valid Until */}
          <div className="space-y-2">
            <Label>Quote Valid Until</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !validUntil && "text-muted-foreground",
                    errors.validUntil && "border-destructive"
                  )}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  {validUntil ? format(validUntil, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={validUntil}
                  onSelect={(date) => date && setValidUntil(date)}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.validUntil && (
              <p className="text-sm text-destructive">{errors.validUntil}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any details about your service, equipment, or special considerations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Submitting Bid...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                Submit Bid
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
