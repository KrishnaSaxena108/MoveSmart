"use client"

/**
 * JOLLY420 - ABLY REAL-TIME CONFIGURATION (Client-side)
 * 
 * Required for real-time bidding updates in the browser.
 * 
 * NEXT_PUBLIC_ABLY_API_KEY=your_ably_api_key (same key as ABLY_API_KEY)
 * 
 * Note: For production, use token authentication instead of exposing the API key.
 * See: https://ably.com/docs/auth/token
 */
import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from 'react'
import Ably from 'ably'

type AblyContextType = {
  client: Ably.Realtime | null
  isConnected: boolean
}

const AblyContext = createContext<AblyContextType>({
  client: null,
  isConnected: false,
})

export function AblyProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<Ably.Realtime | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY
    if (!apiKey) {
      console.warn('NEXT_PUBLIC_ABLY_API_KEY is not set - real-time features disabled')
      return
    }

    const ablyClient = new Ably.Realtime({
      key: apiKey,
      clientId: `movesmart-${Date.now()}`,
    })

    ablyClient.connection.on('connected', () => {
      setIsConnected(true)
    })

    ablyClient.connection.on('disconnected', () => {
      setIsConnected(false)
    })

    ablyClient.connection.on('failed', () => {
      setIsConnected(false)
    })

    setClient(ablyClient)

    return () => {
      ablyClient.close()
    }
  }, [])

  return (
    <AblyContext.Provider value={{ client, isConnected }}>
      {children}
    </AblyContext.Provider>
  )
}

export function useAbly() {
  return useContext(AblyContext)
}

export function useChannel<T = unknown>(
  channelName: string | null,
  eventName: string,
  callback: (message: T) => void
) {
  const { client } = useAbly()

  useEffect(() => {
    if (!client || !channelName) return

    const channel = client.channels.get(channelName)
    
    const handleMessage = (message: Ably.Message) => {
      callback(message.data as T)
    }

    channel.subscribe(eventName, handleMessage)

    return () => {
      channel.unsubscribe(eventName, handleMessage)
    }
  }, [client, channelName, eventName, callback])
}

export function usePresence(channelName: string | null) {
  const { client } = useAbly()
  const [members, setMembers] = useState<Ably.PresenceMessage[]>([])

  useEffect(() => {
    if (!client || !channelName) return

    const channel = client.channels.get(channelName)

    const updateMembers = async () => {
      try {
        const presenceSet = await channel.presence.get()
        setMembers(presenceSet)
      } catch (error) {
        console.error('Error getting presence:', error)
      }
    }

    channel.presence.subscribe('enter', updateMembers)
    channel.presence.subscribe('leave', updateMembers)
    channel.presence.subscribe('update', updateMembers)

    // Enter presence
    channel.presence.enter()

    // Initial fetch
    updateMembers()

    return () => {
      channel.presence.leave()
      channel.presence.unsubscribe()
    }
  }, [client, channelName])

  return members
}

// Hook for real-time bid updates on a shipment
export function useShipmentBids(
  shipmentId: string | null,
  onNewBid?: (bid: BidUpdate) => void,
  onStatusChange?: (data: BidStatusChange) => void
) {
  const channelName = shipmentId ? `shipment:${shipmentId}` : null

  const handleNewBid = useCallback((bid: BidUpdate) => {
    onNewBid?.(bid)
  }, [onNewBid])

  const handleStatusChange = useCallback((data: BidStatusChange) => {
    onStatusChange?.(data)
  }, [onStatusChange])

  useChannel<BidUpdate>(channelName, 'bid:new', handleNewBid)
  useChannel<BidStatusChange>(channelName, 'bid:status', handleStatusChange)
}

// Hook for instant pickup notifications
export function useInstantPickups(
  onClaimed?: (data: InstantPickupClaimed) => void
) {
  const handleClaimed = useCallback((data: InstantPickupClaimed) => {
    onClaimed?.(data)
  }, [onClaimed])

  useChannel<InstantPickupClaimed>('instant-pickups', 'claimed', handleClaimed)
}

// Types
export interface BidUpdate {
  bidId: string
  carrierId: string
  carrierName: string
  amount: number
  status: string
  createdAt: Date
}

export interface BidStatusChange {
  bidId: string
  status: string
  carrierId: string
}

export interface InstantPickupClaimed {
  shipmentId: string
  carrierId: string
  carrierName: string
}
