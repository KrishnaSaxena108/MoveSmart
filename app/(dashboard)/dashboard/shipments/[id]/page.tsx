import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getShipmentById } from '@/lib/actions/shipments'
import { getBidsForShipment } from '@/lib/actions/bids'
import { getLiveAuctionBids } from '@/lib/actions/live-auction'
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

  // If it's a live auction, fetch live auction bids instead
  let bids = bidsResult.success
    ? ((bidsResult as { bids?: any[]; data?: any[] }).bids
      ?? (bidsResult as { data?: any[] }).data
      ?? [])
    : []

  if (shipment.liveAuction) {
    const liveAuctionResult = await getLiveAuctionBids(id)
    if (liveAuctionResult.success) {
      bids = liveAuctionResult.bids || []
    }
  }

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
  
  // Check if shipper is an actual object (populated from DB) or just an ID string
  const isShipperPopulated = shipperObj && typeof shipperObj === 'object' && !Array.isArray(shipperObj)

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
      name: isShipperPopulated 
        ? ([shipperObj?.firstName, shipperObj?.lastName].filter(Boolean).join(' ') || shipperObj?.companyName || 'Shipper')
        : 'Shipper',
      email: isShipperPopulated ? (shipperObj?.email || '') : '',
      image: isShipperPopulated ? shipperObj?.profileImage : undefined,
      rating: isShipperPopulated ? shipperObj?.rating : undefined,
      completedShipments: isShipperPopulated ? shipperObj?.stats?.completedShipments : undefined,
      isVerified: isShipperPopulated ? (shipperObj?.verificationStatus === 'approved') : false,
    },
  }

  const normalizedBids = bidsData.map((bid: any) => {
    const carrierObj = bid.carrier ?? bid.carrierId
    const carrierId = extractId(carrierObj)
    const isCarrierPopulated = carrierObj && typeof carrierObj === 'object' && !Array.isArray(carrierObj)

    return {
      ...bid,
      carrier: bid.carrier ?? {
        _id: carrierId,
        name: isCarrierPopulated 
          ? ([carrierObj?.firstName, carrierObj?.lastName].filter(Boolean).join(' ') || carrierObj?.companyName || 'Carrier')
          : 'Carrier',
        email: isCarrierPopulated ? (carrierObj?.email || '') : '',
        image: isCarrierPopulated ? carrierObj?.profileImage : undefined,
        rating: isCarrierPopulated ? carrierObj?.rating : undefined,
        completedShipments: isCarrierPopulated ? carrierObj?.stats?.completedShipments : undefined,
        isVerified: isCarrierPopulated ? (carrierObj?.verificationStatus === 'approved') : false,
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
