"use server"

import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/mongodb'
import { Shipment } from '@/lib/db/models'
import { publishShipmentStatusChange } from '@/lib/ably/server'
import { revalidatePath } from 'next/cache'

interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

type ShipmentStatus = 'picked_up' | 'in_transit' | 'delivered'

interface TrackingUpdate {
  status: ShipmentStatus
  location?: {
    lat: number
    lng: number
    address?: string
  }
  notes?: string
  photos?: string[]
}

// Update shipment status (carrier only)
export async function updateShipmentStatus(
  shipmentId: string,
  update: TrackingUpdate
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

    // Verify carrier is assigned
    if (shipment.assignedCarrier?.toString() !== session.user.id) {
      return { success: false, error: 'Not authorized to update this shipment' }
    }

    // Validate status transition
    const validTransitions: Record<string, ShipmentStatus[]> = {
      booked: ['picked_up'],
      picked_up: ['in_transit', 'delivered'],
      in_transit: ['delivered'],
    }

    const currentStatus = shipment.status
    if (!validTransitions[currentStatus]?.includes(update.status)) {
      return {
        success: false,
        error: `Cannot transition from ${currentStatus} to ${update.status}`,
      }
    }

    // Create tracking event
    const trackingEvent = {
      status: update.status,
      timestamp: new Date(),
      location: update.location,
      notes: update.notes,
      photos: update.photos,
      updatedBy: session.user.id,
    }

    // Update shipment
    shipment.status = update.status
    shipment.tracking = shipment.tracking || { events: [], currentLocation: null }
    shipment.tracking.events.push(trackingEvent)

    if (update.location) {
      shipment.tracking.currentLocation = {
        coordinates: {
          lat: update.location.lat,
          lng: update.location.lng,
        },
        address: update.location.address,
        updatedAt: new Date(),
      }
    }

    // Set specific timestamps
    if (update.status === 'picked_up') {
      shipment.tracking.pickedUpAt = new Date()
    } else if (update.status === 'delivered') {
      shipment.tracking.deliveredAt = new Date()
    }

    await shipment.save()

    // Publish real-time update
    await publishShipmentStatusChange(shipmentId, update.status, {
      location: update.location,
      timestamp: trackingEvent.timestamp,
    })

    revalidatePath(`/dashboard/shipments/${shipmentId}`)

    return { success: true }
  } catch (error) {
    console.error('Error updating shipment status:', error)
    return { success: false, error: 'Failed to update shipment status' }
  }
}

// Update carrier location (for real-time tracking)
export async function updateCarrierLocation(
  shipmentId: string,
  location: { lat: number; lng: number; address?: string }
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

    if (shipment.assignedCarrier?.toString() !== session.user.id) {
      return { success: false, error: 'Not authorized' }
    }

    // Only update if shipment is in transit
    if (!['picked_up', 'in_transit'].includes(shipment.status)) {
      return { success: false, error: 'Shipment is not in transit' }
    }

    shipment.tracking = shipment.tracking || { events: [], currentLocation: null }
    shipment.tracking.currentLocation = {
      coordinates: { lat: location.lat, lng: location.lng },
      address: location.address,
      updatedAt: new Date(),
    }

    await shipment.save()

    // Publish real-time location update
    await publishShipmentStatusChange(shipmentId, 'location_update', {
      location,
      timestamp: new Date(),
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating location:', error)
    return { success: false, error: 'Failed to update location' }
  }
}

// Confirm delivery (shipper confirms receipt)
export async function confirmDelivery(
  shipmentId: string,
  confirmation: {
    signature?: string
    photos?: string[]
    notes?: string
    rating?: number
  }
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

    // Only shipper can confirm delivery
    if (shipment.shipper.toString() !== session.user.id) {
      return { success: false, error: 'Not authorized to confirm delivery' }
    }

    if (shipment.status !== 'delivered') {
      return { success: false, error: 'Shipment has not been marked as delivered by carrier' }
    }

    // Update delivery confirmation
    shipment.tracking = shipment.tracking || { events: [], currentLocation: null }
    shipment.tracking.deliveryConfirmation = {
      confirmedAt: new Date(),
      confirmedBy: session.user.id,
      signature: confirmation.signature,
      photos: confirmation.photos,
      notes: confirmation.notes,
    }

    // Add confirmation event
    shipment.tracking.events.push({
      status: 'delivery_confirmed',
      timestamp: new Date(),
      notes: confirmation.notes,
      photos: confirmation.photos,
      updatedBy: session.user.id,
    })

    await shipment.save()

    // Publish confirmation
    await publishShipmentStatusChange(shipmentId, 'delivery_confirmed', {
      timestamp: new Date(),
    })

    revalidatePath(`/dashboard/shipments/${shipmentId}`)

    return { success: true }
  } catch (error) {
    console.error('Error confirming delivery:', error)
    return { success: false, error: 'Failed to confirm delivery' }
  }
}

// Get shipment tracking info
export async function getTrackingInfo(
  shipmentId: string
): Promise<ActionResult<{
  status: string
  currentLocation?: {
    coordinates: { lat: number; lng: number }
    address?: string
    updatedAt: Date
  }
  events: Array<{
    status: string
    timestamp: Date
    location?: { lat: number; lng: number; address?: string }
    notes?: string
    photos?: string[]
  }>
  estimatedDelivery?: Date
  pickedUpAt?: Date
  deliveredAt?: Date
  deliveryConfirmation?: {
    confirmedAt: Date
    signature?: string
    photos?: string[]
    notes?: string
  }
}>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    await connectDB()

    const shipment = await Shipment.findById(shipmentId)
      .select('status tracking shipper assignedCarrier')
      .lean()

    if (!shipment) {
      return { success: false, error: 'Shipment not found' }
    }

    // Verify access (shipper, carrier, or admin)
    const isShipper = shipment.shipper.toString() === session.user.id
    const isCarrier = shipment.assignedCarrier?.toString() === session.user.id
    const isAdmin = session.user.role === 'admin'

    if (!isShipper && !isCarrier && !isAdmin) {
      return { success: false, error: 'Not authorized to view tracking' }
    }

    return {
      success: true,
      data: {
        status: shipment.status,
        currentLocation: shipment.tracking?.currentLocation,
        events: shipment.tracking?.events || [],
        estimatedDelivery: shipment.tracking?.estimatedDelivery,
        pickedUpAt: shipment.tracking?.pickedUpAt,
        deliveredAt: shipment.tracking?.deliveredAt,
        deliveryConfirmation: shipment.tracking?.deliveryConfirmation,
      },
    }
  } catch (error) {
    console.error('Error getting tracking info:', error)
    return { success: false, error: 'Failed to get tracking info' }
  }
}
