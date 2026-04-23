"use client"

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  MapPin,
  Package,
  Truck,
  CheckCircle,
  Clock,
  Camera,
  Navigation,
  AlertCircle,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { updateShipmentStatus, confirmDelivery } from '@/lib/actions/tracking'
import { useChannel } from '@/lib/ably/client'
import { toast } from 'sonner'

interface TrackingEvent {
  status: string
  timestamp: Date
  location?: {
    lat: number
    lng: number
    address?: string
  }
  notes?: string
  photos?: string[]
}

interface ShipmentTrackerProps {
  shipmentId: string
  status: string
  isCarrier: boolean
  isShipper: boolean
  tracking?: {
    currentLocation?: {
      coordinates: { lat: number; lng: number }
      address?: string
      updatedAt: Date
    }
    events: TrackingEvent[]
    pickedUpAt?: Date
    deliveredAt?: Date
    deliveryConfirmation?: {
      confirmedAt: Date
      signature?: string
      photos?: string[]
      notes?: string
    }
  }
  pickup: {
    city: string
    state: string
    address: string
  }
  delivery: {
    city: string
    state: string
    address: string
  }
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  booked: { label: 'Booked', icon: Package, color: 'text-primary' },
  picked_up: { label: 'Picked Up', icon: Truck, color: 'text-accent' },
  in_transit: { label: 'In Transit', icon: Navigation, color: 'text-accent' },
  delivered: { label: 'Delivered', icon: CheckCircle, color: 'text-success' },
  delivery_confirmed: { label: 'Confirmed', icon: CheckCircle, color: 'text-success' },
}

export function ShipmentTracker({
  shipmentId,
  status,
  isCarrier,
  isShipper,
  tracking,
  pickup,
  delivery,
}: ShipmentTrackerProps) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState(status)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [updateNotes, setUpdateNotes] = useState('')
  const [confirmNotes, setConfirmNotes] = useState('')

  // Real-time status updates
  const handleStatusUpdate = useCallback((data: { status: string }) => {
    setCurrentStatus(data.status)
    router.refresh()
  }, [router])

  useChannel(`shipment:${shipmentId}`, 'shipment:status', handleStatusUpdate)

  const getNextStatus = (): 'picked_up' | 'in_transit' | 'delivered' | null => {
    switch (currentStatus) {
      case 'booked':
        return 'picked_up'
      case 'picked_up':
        return 'in_transit'
      case 'in_transit':
        return 'delivered'
      default:
        return null
    }
  }

  const handleStatusUpdate2 = async () => {
    const nextStatus = getNextStatus()
    if (!nextStatus) return

    setIsUpdating(true)
    try {
      // Try to get current location
      let location: { lat: number; lng: number; address?: string } | undefined

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
            })
          })
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
        } catch {
          // Location not available, continue without it
        }
      }

      const result = await updateShipmentStatus(shipmentId, {
        status: nextStatus,
        location,
        notes: updateNotes || undefined,
      })

      if (result.success) {
        toast.success(`Status updated to ${statusConfig[nextStatus].label}`)
        setCurrentStatus(nextStatus)
        setShowUpdateDialog(false)
        setUpdateNotes('')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleConfirmDelivery = async () => {
    setIsUpdating(true)
    try {
      const result = await confirmDelivery(shipmentId, {
        notes: confirmNotes || undefined,
      })

      if (result.success) {
        toast.success('Delivery confirmed!')
        setShowConfirmDialog(false)
        setConfirmNotes('')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to confirm delivery')
      }
    } catch (error) {
      console.error('Error confirming delivery:', error)
      toast.error('Failed to confirm delivery')
    } finally {
      setIsUpdating(false)
    }
  }

  const statusSteps = ['booked', 'picked_up', 'in_transit', 'delivered']
  const currentStepIndex = statusSteps.indexOf(currentStatus)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Shipment Tracking
          </CardTitle>
          <CardDescription>
            Track the progress of your shipment in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Steps */}
          <div className="relative">
            <div className="flex justify-between">
              {statusSteps.map((step, index) => {
                const config = statusConfig[step]
                const Icon = config.icon
                const isCompleted = index <= currentStepIndex
                const isCurrent = index === currentStepIndex

                return (
                  <div
                    key={step}
                    className="flex flex-col items-center relative z-10"
                  >
                    <div
                      className={cn(
                        'h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors',
                        isCompleted
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-background border-muted-foreground/30 text-muted-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={cn(
                        'text-xs mt-2 font-medium',
                        isCurrent ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      {config.label}
                    </span>
                  </div>
                )
              })}
            </div>
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted-foreground/30 -z-0" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-primary transition-all -z-0"
              style={{
                width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%`,
              }}
            />
          </div>

          {/* Current Status */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Status</p>
                <p className="text-lg font-semibold flex items-center gap-2">
                  {statusConfig[currentStatus]?.label || currentStatus}
                  {currentStatus === 'in_transit' && (
                    <Badge variant="secondary" className="animate-pulse">
                      Live
                    </Badge>
                  )}
                </p>
              </div>
              {tracking?.currentLocation && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(tracking.currentLocation.updatedAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              )}
            </div>

            {tracking?.currentLocation?.address && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{tracking.currentLocation.address}</span>
              </div>
            )}
          </div>

          {/* Route Info */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <div className="h-2 w-2 rounded-full bg-success" />
                Pickup
              </div>
              <p className="font-medium">
                {pickup.city}, {pickup.state}
              </p>
              <p className="text-sm text-muted-foreground">{pickup.address}</p>
            </div>
            <Truck className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 text-right">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1 justify-end">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                Delivery
              </div>
              <p className="font-medium">
                {delivery.city}, {delivery.state}
              </p>
              <p className="text-sm text-muted-foreground">{delivery.address}</p>
            </div>
          </div>

          {/* Timeline */}
          {tracking?.events && tracking.events.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Activity Timeline</h4>
              <div className="space-y-3">
                {tracking.events
                  .slice()
                  .reverse()
                  .map((event, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        {index < tracking.events.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-3">
                        <p className="text-sm font-medium">
                          {statusConfig[event.status]?.label || event.status}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}
                        </p>
                        {event.location?.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {event.location.address}
                          </p>
                        )}
                        {event.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {isCarrier && getNextStatus() && (
            <Button
              className="w-full"
              onClick={() => setShowUpdateDialog(true)}
            >
              {getNextStatus() === 'picked_up' && (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Mark as Picked Up
                </>
              )}
              {getNextStatus() === 'in_transit' && (
                <>
                  <Truck className="h-4 w-4 mr-2" />
                  Start Transit
                </>
              )}
              {getNextStatus() === 'delivered' && (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Delivered
                </>
              )}
            </Button>
          )}

          {isShipper && currentStatus === 'delivered' && !tracking?.deliveryConfirmation && (
            <Button
              className="w-full"
              onClick={() => setShowConfirmDialog(true)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Delivery Received
            </Button>
          )}

          {tracking?.deliveryConfirmation && (
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-success font-medium">
                <CheckCircle className="h-5 w-5" />
                Delivery Confirmed
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Confirmed on{' '}
                {format(new Date(tracking.deliveryConfirmation.confirmedAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Status Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Shipment Status</DialogTitle>
            <DialogDescription>
              Update the status to{' '}
              {getNextStatus() && statusConfig[getNextStatus()!]?.label}. Your
              current location will be recorded if available.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                placeholder="Add any notes about the pickup/delivery..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpdateDialog(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate2} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Updating...
                </>
              ) : (
                'Update Status'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delivery Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delivery</DialogTitle>
            <DialogDescription>
              Confirm that you have received the shipment. This will release
              payment to the carrier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                By confirming delivery, the payment held in escrow will be
                released to the carrier. Make sure you have inspected the items
                before confirming.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                placeholder="Any notes about the delivery..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmDelivery} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Confirming...
                </>
              ) : (
                'Confirm Delivery'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
