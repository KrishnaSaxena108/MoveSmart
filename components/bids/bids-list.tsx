"use client"

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DollarSign,
  Clock,
  Star,
  Truck,
  CheckCircle,
  XCircle,
  MessageSquare,
  TrendingDown,
  Calendar,
  Shield,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { acceptBid, rejectBid, counterOffer } from '@/lib/actions/bids'
import { useShipmentBids, type BidUpdate, type BidStatusChange } from '@/lib/ably/client'
import { toast } from 'sonner'

interface Bid {
  _id: string
  carrier: {
    _id: string
    name: string
    email: string
    image?: string
    rating?: number
    completedShipments?: number
    isVerified?: boolean
  }
  amount: number
  notes?: string
  estimatedPickup: Date
  estimatedDelivery: Date
  validUntil: Date
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired' | 'countered'
  counterOffer?: {
    amount: number
    message?: string
    createdAt: Date
  }
  createdAt: Date
}

interface BidsListProps {
  shipmentId: string
  bids: Bid[]
  isShipper: boolean
  shipmentStatus: string
}

export function BidsList({ shipmentId, bids: initialBids, isShipper, shipmentStatus }: BidsListProps) {
  const router = useRouter()
  const [bids, setBids] = useState<Bid[]>(initialBids)
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null)
  const [actionType, setActionType] = useState<'accept' | 'reject' | 'counter' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [counterAmount, setCounterAmount] = useState('')
  const [counterMessage, setCounterMessage] = useState('')

  // Real-time bid updates
  const handleNewBid = useCallback((bidUpdate: BidUpdate) => {
    // Refresh the page to get the full bid data
    router.refresh()
    toast.info(`New bid received: $${bidUpdate.amount.toFixed(2)}`)
  }, [router])

  const handleStatusChange = useCallback((data: BidStatusChange) => {
    setBids((prev) =>
      prev.map((bid) =>
        bid._id === data.bidId ? { ...bid, status: data.status as Bid['status'] } : bid
      )
    )
    router.refresh()
  }, [router])

  useShipmentBids(shipmentId, handleNewBid, handleStatusChange)

  // Sort bids by amount (lowest first)
  const sortedBids = [...bids].sort((a, b) => a.amount - b.amount)
  const lowestBid = sortedBids[0]

  const handleAccept = async () => {
    if (!selectedBid) return
    
    setIsProcessing(true)
    try {
      const result = await acceptBid(selectedBid._id)
      if (result.success) {
        toast.success('Bid accepted! The carrier has been notified.')
        setSelectedBid(null)
        setActionType(null)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to accept bid')
      }
    } catch (error) {
      console.error('Error accepting bid:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedBid) return
    
    setIsProcessing(true)
    try {
      const result = await rejectBid(selectedBid._id)
      if (result.success) {
        toast.success('Bid rejected')
        setSelectedBid(null)
        setActionType(null)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to reject bid')
      }
    } catch (error) {
      console.error('Error rejecting bid:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCounterOffer = async () => {
    if (!selectedBid || !counterAmount) return
    
    const amount = parseFloat(counterAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setIsProcessing(true)
    try {
      const result = await counterOffer(selectedBid._id, amount, counterMessage || undefined)
      if (result.success) {
        toast.success('Counter offer sent!')
        setSelectedBid(null)
        setActionType(null)
        setCounterAmount('')
        setCounterMessage('')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to send counter offer')
      }
    } catch (error) {
      console.error('Error sending counter offer:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: Bid['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'accepted':
        return <Badge className="bg-success text-success-foreground">Accepted</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'withdrawn':
        return <Badge variant="outline">Withdrawn</Badge>
      case 'expired':
        return <Badge variant="outline" className="text-muted-foreground">Expired</Badge>
      case 'countered':
        return <Badge className="bg-accent text-accent-foreground">Counter Offer</Badge>
      default:
        return null
    }
  }

  const canTakeAction = isShipper && shipmentStatus === 'open'

  if (bids.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Bids Yet</h3>
          <p className="text-muted-foreground text-center">
            Carriers haven&apos;t placed any bids on this shipment yet.
            {!isShipper && " Be the first to submit a competitive quote!"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Bids ({bids.length})
            </span>
            {lowestBid && (
              <span className="text-sm font-normal text-muted-foreground">
                Lowest: ${lowestBid.amount.toFixed(2)}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {isShipper
              ? 'Review and accept the best bid for your shipment'
              : 'Current bids on this shipment'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedBids.map((bid, index) => (
            <div
              key={bid._id}
              className={cn(
                "flex flex-col gap-4 p-4 rounded-lg border",
                index === 0 && bid.status === 'pending' && "border-primary bg-primary/5",
                bid.status === 'accepted' && "border-success bg-success/5"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={bid.carrier.image} />
                    <AvatarFallback>
                      {bid.carrier.name?.split(' ').map(n => n[0]).join('') || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{bid.carrier.name}</span>
                      {bid.carrier.isVerified && (
                        <Shield className="h-4 w-4 text-primary" />
                      )}
                      {index === 0 && bid.status === 'pending' && (
                        <Badge variant="secondary" className="text-xs">Lowest</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {bid.carrier.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-accent text-accent" />
                          {bid.carrier.rating.toFixed(1)}
                        </span>
                      )}
                      {bid.carrier.completedShipments !== undefined && (
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {bid.carrier.completedShipments} shipments
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">${bid.amount.toFixed(2)}</div>
                  {getStatusBadge(bid.status)}
                </div>
              </div>

              {bid.notes && (
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  {bid.notes}
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Pickup: {format(new Date(bid.estimatedPickup), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  <span>Delivery: {format(new Date(bid.estimatedDelivery), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Valid until: {format(new Date(bid.validUntil), 'MMM d')}</span>
                </div>
              </div>

              {bid.counterOffer && (
                <div className="bg-accent/10 p-3 rounded-md border border-accent/20">
                  <p className="text-sm font-medium">
                    Counter Offer: ${bid.counterOffer.amount.toFixed(2)}
                  </p>
                  {bid.counterOffer.message && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {bid.counterOffer.message}
                    </p>
                  )}
                </div>
              )}

              {canTakeAction && bid.status === 'pending' && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedBid(bid)
                      setActionType('accept')
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedBid(bid)
                      setCounterAmount(bid.amount.toString())
                      setActionType('counter')
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Counter
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedBid(bid)
                      setActionType('reject')
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Submitted {formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Accept Dialog */}
      <Dialog open={actionType === 'accept'} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Bid</DialogTitle>
            <DialogDescription>
              Are you sure you want to accept this bid from {selectedBid?.carrier.name} for $
              {selectedBid?.amount.toFixed(2)}? This will book the carrier and notify them immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleAccept} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Processing...
                </>
              ) : (
                'Accept Bid'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionType === 'reject'} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Bid</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this bid? The carrier will be notified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Processing...
                </>
              ) : (
                'Reject Bid'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Counter Offer Dialog */}
      <Dialog open={actionType === 'counter'} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Counter Offer</DialogTitle>
            <DialogDescription>
              Propose a different price to {selectedBid?.carrier.name}. They can accept, reject, or
              counter your offer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="counterAmount">Your Counter Offer</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="counterAmount"
                  type="number"
                  step="0.01"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  className="pl-10"
                  placeholder="0.00"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Original bid: ${selectedBid?.amount.toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="counterMessage">Message (Optional)</Label>
              <Textarea
                id="counterMessage"
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
                placeholder="Explain your counter offer..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleCounterOffer} disabled={isProcessing || !counterAmount}>
              {isProcessing ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Sending...
                </>
              ) : (
                'Send Counter Offer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
