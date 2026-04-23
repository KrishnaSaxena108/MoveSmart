/**
 * JOLLY420 - ABLY REAL-TIME CONFIGURATION (Server-side)
 * 
 * Required for real-time bidding updates, instant pickups, and live tracking.
 * 
 * 1. Create a free Ably account at https://ably.com
 *    Free tier: 6 million messages/month, 200 concurrent connections
 * 
 * 2. Create an app and get your API key from https://ably.com/accounts
 * 
 * ABLY_API_KEY=your_ably_api_key (format: xxxxx.yyyyy:zzzzzzzzzzzzzz)
 */
import Ably from 'ably'

let ablyClient: Ably.Rest | null = null

export function getAblyServer(): Ably.Rest {
  if (!ablyClient) {
    const apiKey = process.env.ABLY_API_KEY
    if (!apiKey) {
      throw new Error('ABLY_API_KEY is not set')
    }
    ablyClient = new Ably.Rest({ key: apiKey })
  }
  return ablyClient
}

export async function publishToChannel(
  channelName: string,
  eventName: string,
  data: unknown
): Promise<void> {
  const ably = getAblyServer()
  const channel = ably.channels.get(channelName)
  await channel.publish(eventName, data)
}

// Publish bid updates to shipment channel
export async function publishBidUpdate(
  shipmentId: string,
  bidData: {
    bidId: string
    carrierId: string
    carrierName: string
    amount: number
    status: string
    createdAt: Date
  }
): Promise<void> {
  await publishToChannel(
    `shipment:${shipmentId}`,
    'bid:new',
    bidData
  )
}

// Publish bid status change
export async function publishBidStatusChange(
  shipmentId: string,
  bidId: string,
  status: string,
  carrierId: string
): Promise<void> {
  await publishToChannel(
    `shipment:${shipmentId}`,
    'bid:status',
    { bidId, status, carrierId }
  )
}

// Publish shipment status change
export async function publishShipmentStatusChange(
  shipmentId: string,
  status: string,
  data?: Record<string, unknown>
): Promise<void> {
  await publishToChannel(
    `shipment:${shipmentId}`,
    'shipment:status',
    { shipmentId, status, ...data }
  )
}

// Publish instant pickup claim
export async function publishInstantPickupClaimed(
  shipmentId: string,
  carrierId: string,
  carrierName: string
): Promise<void> {
  await publishToChannel(
    'instant-pickups',
    'claimed',
    { shipmentId, carrierId, carrierName }
  )
}
