import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getShipmentById } from '@/lib/actions/shipments'
import { getBidsForShipment } from '@/lib/actions/bids'
import { ShipmentDetail } from '@/components/shipments/shipment-detail'

interface ShipmentPageProps {
  params: Promise<{ id: string }>
}

export default async function ShipmentPage({ params }: ShipmentPageProps) {
  const { id } = await params
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/login')
  }

  const [shipmentResult, bidsResult] = await Promise.all([
    getShipmentById(id),
    getBidsForShipment(id),
  ])

  const shipment = (shipmentResult as { shipment?: any; data?: any }).shipment
    ?? (shipmentResult as { data?: unknown }).data

  if (!shipmentResult.success || !shipment) {
    notFound()
  }

  const bids = bidsResult.success
    ? ((bidsResult as { bids?: any[]; data?: any[] }).bids
      ?? (bidsResult as { data?: any[] }).data
      ?? [])
    : []

  const shipmentData = JSON.parse(JSON.stringify(shipment)) as any
  const bidsData = JSON.parse(JSON.stringify(bids)) as any[]

  const extractId = (value: any): string => {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'object' && value._id) return String(value._id)
    if (typeof value?.toString === 'function') return value.toString()
    return ''
  }

  const shipperObj = shipmentData.shipper ?? shipmentData.shipperId
  const shipperId = extractId(shipperObj)

  const normalizedShipment = {
    ...shipmentData,
    title: shipmentData.title || shipmentData.items?.[0]?.description || 'Shipment',
    pickupDate: shipmentData.pickupDate ?? {
      earliest: shipmentData.pickup?.dateWindow?.start,
      latest: shipmentData.pickup?.dateWindow?.end,
      flexible: false,
    },
    deliveryDate: shipmentData.deliveryDate ?? {
      latest: shipmentData.delivery?.dateWindow?.end,
    },
    pricing: {
      ...shipmentData.pricing,
      instantPrice: shipmentData.pricing?.instantPrice ?? shipmentData.pricing?.fixedPrice,
    },
    shipper: shipmentData.shipper ?? {
      _id: shipperId,
      name: [shipperObj?.firstName, shipperObj?.lastName].filter(Boolean).join(' ') || shipperObj?.companyName || 'Shipper',
      email: shipperObj?.email || '',
      image: shipperObj?.profileImage,
      rating: shipperObj?.rating,
      completedShipments: shipperObj?.stats?.completedShipments,
      isVerified: shipperObj?.verificationStatus === 'approved',
    },
  }

  const normalizedBids = bidsData.map((bid: any) => {
    const carrierObj = bid.carrier ?? bid.carrierId
    const carrierId = extractId(carrierObj)

    return {
      ...bid,
      carrier: bid.carrier ?? {
        _id: carrierId,
        name: [carrierObj?.firstName, carrierObj?.lastName].filter(Boolean).join(' ') || carrierObj?.companyName || 'Carrier',
        email: carrierObj?.email || '',
        image: carrierObj?.profileImage,
        rating: carrierObj?.rating,
        completedShipments: carrierObj?.stats?.completedShipments,
        isVerified: carrierObj?.verificationStatus === 'approved',
      },
      estimatedPickup: bid.estimatedPickup ?? bid.estimatedPickupDate,
      estimatedDelivery: bid.estimatedDelivery ?? bid.estimatedDeliveryDate,
      validUntil: bid.validUntil ?? bid.expiresAt,
    }
  })

  const isShipper = session.user.id === shipperId
  const isCarrier = session.user.role === 'carrier'
  const isAdmin = session.user.role === 'admin'

  // Check if current carrier has already bid
  const existingBid = isCarrier
    ? normalizedBids.find((bid: { carrier: { _id: { toString: () => string } } }) => 
        bid.carrier?._id?.toString() === session.user.id
      )
    : null

  return (
    <ShipmentDetail
      shipment={normalizedShipment}
      bids={normalizedBids}
      isShipper={isShipper}
      isCarrier={isCarrier}
      isAdmin={isAdmin}
      existingBid={existingBid}
      currentUserId={session.user.id}
    />
  )
}
